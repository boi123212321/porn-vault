import { getConfig, IConfig } from "../config";
import { walk, statAsync } from "../fs/async";
import { filterAsync } from "../types/utility";
import Scene from "../types/scene";
import Image from "../types/image";
import { basename } from "path";
import * as logger from "../logger";
import * as database from "../database";
import { extractLabels, extractActors, extractScenes } from "../extractor";
import Jimp from "jimp";
import ora = require("ora");
import { indexImages } from "../search/image";

const fileIsExcluded = (exclude: string[], file: string) =>
  exclude.some(regStr => new RegExp(regStr, "i").test(file.toLowerCase()));

export async function checkVideoFolders() {
  const config = getConfig();

  const allFiles = [] as string[];

  if (config.EXCLUDE_FILES.length)
    logger.log(`Will ignore files: ${config.EXCLUDE_FILES}.`);

  for (const folder of config.VIDEO_PATHS) {
    logger.message(`Scanning ${folder} for videos...`);
    let numFiles = 0;
    const loader = ora(`Scanned ${numFiles} videos`).start();

    await walk(folder, [".mp4"], async path => {
      loader.text = `Scanned ${++numFiles} videos`;
      if (
        basename(path).startsWith(".") ||
        fileIsExcluded(config.EXCLUDE_FILES, path)
      ) {
        logger.log(`Ignoring file ${path}`);
      } else {
        logger.log(`Found matching file ${path}`);
        allFiles.push(path);
      }
    });

    loader.succeed(`${folder} done`);
  }

  const unknownVideos = await filterAsync(allFiles, async (path: string) => {
    const scene = await Scene.getSceneByPath(path);
    return !scene;
  });

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
    `Queued ${unknownVideos.length} new videos for futher processing.`
  );
}

async function imageWithPathExists(path: string) {
  const image = await Image.getImageByPath(path);
  return !!image;
}

async function processImage(
  imagePath: string,
  readImage = true,
  config: IConfig
) {
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
    const extractedScenes = await extractScenes(image.path);
    logger.log(`Found ${extractedScenes.length} scenes in image path.`);
    image.scene = extractedScenes[0] || null;

    // Extract actors
    const extractedActors = await extractActors(image.path);
    logger.log(`Found ${extractedActors.length} actors in image path.`);
    await Image.setActors(image, [...new Set(extractedActors)]);

    // Extract labels
    const extractedLabels = await extractLabels(image.path);
    logger.log(`Found ${extractedLabels.length} labels in image path.`);
    await Image.setLabels(image, [...new Set(extractedLabels)]);

    await database.insert(database.store.images, image);
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

    await walk(folder, [".jpg", ".jpeg", ".png", ".gif"], async path => {
      loader.text = `Scanned ${++numFiles} images`;
      if (
        basename(path).startsWith(".") ||
        fileIsExcluded(config.EXCLUDE_FILES, path)
      )
        return;

      if (!(await imageWithPathExists(path))) {
        await processImage(path, config.READ_IMAGES_ON_IMPORT, config);
        numAddedImages++;
        logger.log(`Added image '${path}'.`);
      } else {
        logger.log(`Image '${path}' already exists`);
      }
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

  const scenes = (await database.find(database.store.scenes, {
    preview: null
  })) as Scene[];

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

          await database.insert(database.store.images, image);
          await indexImages([image]);

          await database.update(
            database.store.scenes,
            {
              _id: scene._id
            },
            {
              $set: {
                preview: image._id
              }
            }
          );

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
