import ora = require("ora");

import { getConfig } from "../config";
import { imageCollection, sceneCollection } from "../database";
import { statAsync, walk } from "../fs/async";
import * as logger from "../logger";
import { indexImages } from "../search/image";
import Image from "../types/image";
import Scene from "../types/scene";
import {
  imageWithPathExists,
  isImportableImage,
  processImage,
} from "./image/utility";
import { isImportableVideo } from "./video/utility";

export async function checkVideoFolders() {
  const config = getConfig();

  const unknownVideos = [] as string[];

  if (config.EXCLUDE_FILES.length)
    logger.log(`Will ignore files: ${config.EXCLUDE_FILES}.`);

  for (const folder of config.VIDEO_PATHS) {
    logger.message(`Scanning ${folder} for videos...`);
    let numFiles = 0;
    const loader = ora(`Scanned ${numFiles} videos`).start();

    await walk(folder, [".mp4", ".webm"], async (path) => {
      loader.text = `Scanned ${++numFiles} videos`;
      if (!isImportableVideo(path)) {
        logger.log(`Ignoring file ${path}`);
      } else {
        logger.log(`Found matching file ${path}`);
        const existingScene = await Scene.getSceneByPath(path);
        logger.log("Scene with that path exists already: " + !!existingScene);
        if (!existingScene) unknownVideos.push(path);
      }
    });

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

    await walk(folder, [".jpg", ".jpeg", ".png", ".gif"], async (path) => {
      loader.text = `Scanned ${++numFiles} images`;
      if (!isImportableImage(path)) return;

      if (!(await imageWithPathExists(path))) {
        await processImage(path, config.READ_IMAGES_ON_IMPORT);
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
