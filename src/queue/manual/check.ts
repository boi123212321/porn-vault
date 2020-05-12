import ora = require("ora");

import { getConfig } from "../../config";
import { imageCollection, sceneCollection } from "../../database";
import { statAsync, walk } from "../../fs/async";
import * as logger from "../../logger";
import { indexImages } from "../../search/image";
import Image from "../../types/image";
import Scene from "../../types/scene";
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
  LibraryTypes,
} from "../constants";
import {
  importPathsForLibraryType,
  resetFoundCountForLibraryType,
  getOldFoundCountForLibraryType,
  pauseQueueForLibraryType,
  resumeQueueForLibraryType,
} from "../importManager";

export async function checkVideoFolders() {
  const config = getConfig();

  // Pause import execution while we walk the library
  pauseQueueForLibraryType("VIDEOS");
  resetFoundCountForLibraryType("VIDEOS");

  const unknownVideos = [] as string[];

  if (config.EXCLUDE_FILES.length) {
    logger.log(`Will ignore files: ${config.EXCLUDE_FILES}.`);
  }

  for (const folder of config.VIDEO_PATHS) {
    logger.message(`Scanning folder "${folder}": for videos...`);
    let numFolderFiles = 0;
    const loader = ora(
      `Scanned ${numFolderFiles} videos in folder, total: ${
        unknownVideos.length
      }/${getOldFoundCountForLibraryType("VIDEOS")}`
    ).start();

    await walk(folder, SUPPORTED_VIDEO_EXTENSIONS, async (path) => {
      loader.text = `Scanned ${++numFolderFiles} videos, total: ${
        unknownVideos.length
      }/${getOldFoundCountForLibraryType("VIDEOS")}`;
      unknownVideos.push(path);
      importPathsForLibraryType("VIDEOS", path);
    });

    loader.succeed(
      `folder "${folder}": done (${numFolderFiles} videos), total: ${
        unknownVideos.length
      }/${getOldFoundCountForLibraryType("VIDEOS")}`
    );
  }

  logger.log(
    `Found ${unknownVideos.length} new videos, total: ${
      unknownVideos.length
    }/${getOldFoundCountForLibraryType("VIDEOS")}`
  );

  logger.warn(
    `Queued ${unknownVideos.length} new videos for further processing.`
  );

  // Once everything has been queued, resume import execution
  resumeQueueForLibraryType("VIDEOS");
}

export async function checkImageFolders() {
  const config = getConfig();

  logger.log("Checking image folders...");

  resetFoundCountForLibraryType("IMAGES");

  if (!config.READ_IMAGES_ON_IMPORT)
    logger.warn("Reading images on import is disabled.");

  if (config.EXCLUDE_FILES.length)
    logger.log(`Will ignore files: ${config.EXCLUDE_FILES}.`);

  for (const folder of config.IMAGE_PATHS) {
    logger.message(`Scanning folder "${folder}": for images...`);
    let numFolderFiles = 0;
    const loader = ora(
      `Scanned ${numFolderFiles} images, total: ${getOldFoundCountForLibraryType(
        "IMAGES"
      )}/${getOldFoundCountForLibraryType("IMAGES")}`
    ).start();

    await walk(folder, SUPPORTED_IMAGE_EXTENSIONS, async (path) => {
      loader.text = `Scanned ${++numFolderFiles} images, total: ${getOldFoundCountForLibraryType(
        "IMAGES"
      )}/${getOldFoundCountForLibraryType("IMAGES")}`;
      importPathsForLibraryType("IMAGES", path);
    });

    loader.succeed(
      `folder "${folder}": done (${numFolderFiles} images), total: ${getOldFoundCountForLibraryType(
        "IMAGES"
      )}/${getOldFoundCountForLibraryType("IMAGES")}`
    );
  }

  logger.warn(
    `Added ${getOldFoundCountForLibraryType(
      "IMAGES"
    )} new images, total: ${getOldFoundCountForLibraryType(
      "IMAGES"
    )}/${getOldFoundCountForLibraryType("IMAGES")}`
  );
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
