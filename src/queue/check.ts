import { getConfig } from "../config";
import { walk, statAsync } from "../fs/async";
import Scene from "../types/scene";
import Image from "../types/image";
import { basename } from "path";
import * as logger from "../logger";
import { extractLabels, extractActors, extractScenes } from "../extractor";
import Jimp from "jimp";
import ora = require("ora");
import { indexImages } from "../search/image";
import {
  imageCollection,
  sceneCollection,
  missingSceneCollection,
} from "../database";
import { resetMissingItems } from "../types/missing_item";
import MissingScene from "../types/missing_item";

const fileIsExcluded = (exclude: string[], file: string) =>
  exclude.some(regStr => new RegExp(regStr, "i").test(file.toLowerCase()));

export async function checkVideoFolders() {
  const config = getConfig();

  const unknownVideos = [] as string[];

  if (config.EXCLUDE_FILES.length)
    logger.log(`Will ignore files: ${config.EXCLUDE_FILES}.`);

  for (const folder of config.VIDEO_PATHS) {
    logger.message(`Scanning ${folder} for videos...`);
    let numFiles = 0;
    const loader = ora(`Scanned ${numFiles} videos`).start();
    const existingScenes = await Scene.getAll();
    const existingScenesMap = existingScenes.reduce((acc, curr) => {
      acc.set(curr.path, curr._id);
      return acc;
    }, new Map());
    await resetMissingItems();
    await walk({
      dir: folder,
      exclude: config.EXCLUDE_FILES,
      extensions: [".mp4", ".webm"],
      cb: async path => {
        loader.text = `Scanned ${++numFiles} videos`;
        if (basename(path).startsWith(".")) {
          logger.log(`Ignoring file ${path}`);
        } else {
          logger.log(`Found matching file ${path}`);
          const existingScene = existingScenesMap.has(path);
          if (existingScene) existingScenesMap.delete(path);
          logger.log("Scene with that path exists already: " + !!existingScene);
          if (!existingScene) unknownVideos.push(path);
        }
      },
    });
    logger.log(`found ${existingScenesMap.size} missing files`);
    for (const [path, _id] of existingScenesMap.entries()) {
      await missingSceneCollection.upsert(_id, new MissingScene(_id, path));
    }
    loader.succeed(`${folder} done (${numFiles} videos)`);
  }

  logger.log(`Found ${unknownVideos.length} new videos.`);

  for (const videoPath of unknownVideos) {
    try {
      await Scene.onImport(videoPath);
    } catch (error) {
      logger.log(error.stack);
      logger.error("Error when importing " + videoPath);
      logger.warn(error.message);
    }
  }

  logger.warn(
    `Queued ${unknownVideos.length} new videos for further processing.`
  );
}

async function imageWithPathExists(path: string) {
  const image = await Image.getImageByPath(path);
  return !!image;
}

async function processImage(imagePath: string, readImage = true) {
  try {
    const imageName = basename(imagePath);
    const image = new Image(imageName);
    image.path = imagePath;

    if (readImage) {
      const jimpImage = await Jimp.read(imagePath);
      image.meta.dimensions.width = jimpImage.bitmap.width;
      image.meta.dimensions.height = jimpImage.bitmap.height;
      image.hash = jimpImage.hash();
    }

    // Extract scene
    const extractedScenes = await extractScenes(imagePath);
    logger.log(`Found ${extractedScenes.length} scenes in image path.`);
    image.scene = extractedScenes[0] || null;

    // Extract actors
    const extractedActors = await extractActors(imagePath);
    logger.log(`Found ${extractedActors.length} actors in image path.`);
    await Image.setActors(image, [...new Set(extractedActors)]);

    // Extract labels
    const extractedLabels = await extractLabels(imagePath);
    logger.log(`Found ${extractedLabels.length} labels in image path.`);
    await Image.setLabels(image, [...new Set(extractedLabels)]);

    // await database.insert(database.store.images, image);
    await imageCollection.upsert(image._id, image);
    await indexImages([image]);
    logger.success(`Image '${imageName}' done.`);
  } catch (error) {
    logger.error(error);
    logger.error(`Failed to add image '${imagePath}'.`);
  }
}

export async function checkImageFolders() {
  const config = getConfig();

  logger.log("Checking image folders...");

  let numAddedImages = 0;

  if (!config.READ_IMAGES_ON_IMPORT)
    logger.warn("Reading images on import is disabled.");

  if (config.EXCLUDE_FILES.length)
    logger.log(`Will ignore files: ${config.EXCLUDE_FILES}.`);

  for (const folder of config.IMAGE_PATHS) {
    logger.message(`Scanning ${folder} for images...`);
    let numFiles = 0;
    const loader = ora(`Scanned ${numFiles} images`).start();

    await walk({
      dir: folder,
      extensions: [".jpg", ".jpeg", ".png", ".gif"],
      exclude: config.EXCLUDE_FILES,
      cb: async path => {
        loader.text = `Scanned ${++numFiles} images`;
        if (basename(path).startsWith(".")) return;

        if (!(await imageWithPathExists(path))) {
          await processImage(path, config.READ_IMAGES_ON_IMPORT);
          numAddedImages++;
          logger.log(`Added image '${path}'.`);
        } else {
          logger.log(`Image '${path}' already exists`);
        }
      },
    });

    loader.succeed(`${folder} done`);
  }

  logger.warn(`Added ${numAddedImages} new images`);
}

export async function checkPreviews() {
  const config = getConfig();

  if (!config.GENERATE_PREVIEWS) {
    logger.warn(
      "Not generating previews because GENERATE_PREVIEWS is disabled."
    );
    return;
  }

  const scenes = await sceneCollection.query("preview-index", null);

  logger.log(`Generating previews for ${scenes.length} scenes...`);

  for (const scene of scenes) {
    if (scene.path) {
      const loader = ora("Generating previews...").start();

      try {
        let preview = await Scene.generatePreview(scene);

        if (preview) {
          let image = new Image(scene.name + " (preview)");
          const stats = await statAsync(preview);
          image.path = preview;
          image.scene = scene._id;
          image.meta.size = stats.size;

          await imageCollection.upsert(image._id, image);
          // await database.insert(database.store.images, image);
          await indexImages([image]);

          scene.thumbnail = image._id;
          await sceneCollection.upsert(scene._id, scene);

          loader.succeed("Generated preview for " + scene._id);
        } else {
          loader.fail(`Error generating preview.`);
        }
      } catch (error) {
        logger.error(error);
        loader.fail(`Error generating preview.`);
      }
    }
  }
}
