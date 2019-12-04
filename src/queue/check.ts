import { getConfig } from "../config";
import { walk } from "../fs/async";
import filterAsync from "node-filter-async";
import Scene from "../types/scene";
import Image from "../types/image";
import { basename } from "path";
import ProcessingQueue, { IQueueItem } from "../queue/index";
import * as logger from "../logger/index";
import * as database from "../database";
import { extractLabels, extractActors } from "../extractor";
import Jimp from "jimp";

async function getAll() {
  return (await database.find(database.store.queue, {})) as IQueueItem[];
}

async function getItemByPath(path: string) {
  return (await getAll()).filter(item => item.path == path)[0];
}

export async function checkVideoFolders() {
  const config = await getConfig();

  let files = [] as string[];

  for (const folder of config.VIDEO_PATHS) {
    let _files = await walk(folder, [".mp4"]);
    files.push(..._files);
  }

  const unknownVideos = await filterAsync(files, async (path: string) => {
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

export async function checkImageFolders() {
  const config = await getConfig();

  let files = [] as string[];

  for (const folder of config.IMAGE_PATHS) {
    let _files = await walk(folder, [".jpg", ".jpeg", ".png"]);
    files.push(..._files);
  }

  const unknownImages = await filterAsync(files, async (path: string) => {
    const image = await Image.getImageByPath(path);
    return !image;
  });

  logger.log(`Found ${unknownImages.length} images.`);

  let numAddedImages = 0;

  for (const imagePath of unknownImages) {
    try {
      const imageName = basename(imagePath);
      const image = new Image(imageName);
      image.path = imagePath;

      const jimpImage = await Jimp.read(imagePath);
      image.meta.dimensions.width = jimpImage.bitmap.width;
      image.meta.dimensions.height = jimpImage.bitmap.height;
      image.hash = jimpImage.hash();

      // Extract actors
      const extractedActors = await extractActors(image.path);
      logger.log(`Found ${extractedActors.length} actors in image path.`);
      image.actors.push(...extractedActors);
      image.actors = [...new Set(image.actors)];

      // Extract labels
      const extractedLabels = await extractLabels(image.path);
      logger.log(`Found ${extractedLabels.length} labels in image path.`);
      image.labels.push(...extractedLabels);
      image.labels = [...new Set(image.labels)];

      logger.log(`Creating image with id ${image._id}...`);

      await database.insert(database.store.images, image);
      logger.success(`Image '${imageName}' done.`);
      numAddedImages++;
    } catch (error) {
      logger.error(error);
      logger.error(`Failed to add image '${imagePath}'`);
    }
  }

  logger.warn(`Added ${numAddedImages} new images`);
}
