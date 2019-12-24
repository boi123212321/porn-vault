import { getConfig } from "../config";
import { walk, statAsync } from "../fs/async";
import { filterAsync } from "../types/utility";
import Scene from "../types/scene";
import Image from "../types/image";
import { basename } from "path";
import ProcessingQueue, { IQueueItem } from "../queue/index";
import * as logger from "../logger/index";
import * as database from "../database";
import { extractLabels, extractActors } from "../extractor";
import Jimp from "jimp";
import ora = require("ora");

async function getAll() {
  return (await database.find(database.store.queue, {})) as IQueueItem[];
}

async function getItemByPath(path: string) {
  return (await getAll()).filter(item => item.path == path)[0];
}

export async function checkVideoFolders() {
  const config = await getConfig();

  const allFiles = [] as string[];

  for (const folder of config.VIDEO_PATHS) {
    await walk(folder, [".mp4"], async file => {
      allFiles.push(file);
    });
  }

  const unknownVideos = await filterAsync(allFiles, async (path: string) => {
    const scene = await Scene.getSceneByPath(path);
    const item = await getItemByPath(path);
    return !scene && !item;
  });

  logger.log(`Found ${unknownVideos.length} new videos.`);

  for (const videoPath of unknownVideos) {
    const _id = new Scene("")._id;
    logger.log(`Creating scene queue item with id ${_id}...`);
    await ProcessingQueue.append({
      _id,
      actors: [],
      filename: basename(videoPath),
      path: videoPath,
      labels: [],
      name: null
    });
  }

  logger.warn(`Queued ${unknownVideos.length} new videos.`);
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

    // Extract actors
    const extractedActors = await extractActors(image.path);
    logger.log(`Found ${extractedActors.length} actors in image path.`);
    await Image.setActors(image, [...new Set(extractedActors)]);

    // Extract labels
    const extractedLabels = await extractLabels(image.path);
    logger.log(`Found ${extractedLabels.length} labels in image path.`);
    await Image.setLabels(image, [...new Set(extractedLabels)]);

    await database.insert(database.store.images, image);
    logger.success(`Image '${imageName}' done.`);
  } catch (error) {
    logger.error(error);
    logger.error(`Failed to add image '${imagePath}'.`);
  }
}

export async function checkImageFolders() {
  const config = await getConfig();

  logger.log("Checking image folders...");

  let numAddedImages = 0;

  if (!config.READ_IMAGES_ON_IMPORT)
    logger.warn("Reading images on import is disabled.");

  for (const folder of config.IMAGE_PATHS) {
    await walk(folder, [".jpg", ".jpeg", ".png"], async path => {
      if (!(await imageWithPathExists(path))) {
        await processImage(path, config.READ_IMAGES_ON_IMPORT);
        numAddedImages++;
        logger.message(`Added image '${path}'.`);
      } else {
        logger.log(`Image '${path}' already exists`);
      }
    });
  }

  logger.warn(`Added ${numAddedImages} new images`);
}

export async function checkPreviews() {
  const config = await getConfig();

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
