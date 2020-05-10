import queue, { AsyncQueue } from "async/queue";
import Jimp from "jimp";
import { basename, extname } from "path";

import { getConfig, IConfig } from "../config";
import { imageCollection } from "../database";
import { extractActors, extractLabels, extractScenes } from "../extractor";
import * as logger from "../logger";
import { indexImages } from "../search/image";
import Image from "../types/image";
import { fileIsExcluded } from "../types/utility";
import { imageWithPathExists } from "./utility";
import Watcher from "./watcher";

export default class ImageWatcher {
  private config: IConfig;
  private imageProcessingQueue: AsyncQueue<string>;

  private readImageDimensionsBeforeInitialScanComplete: boolean;
  private onProcessingCompleted?: () => void;

  private didCompleteInitialScan: boolean;

  /**
   * @param onProcessingCompleted - called once the image processing is complete
   * @param onInitialScanCompleted - called once the initial scan of the image
   * folders is complete
   */
  constructor(
    readImageDimensionsBeforeInitialScanComplete: boolean,
    onProcessingCompleted?: () => void,
    onInitialScanCompleted?: () => void
  ) {
    this.config = getConfig();

    this.readImageDimensionsBeforeInitialScanComplete = readImageDimensionsBeforeInitialScanComplete;
    this.onProcessingCompleted = onProcessingCompleted;

    this.didCompleteInitialScan = false;

    this.imageProcessingQueue = queue(this.processImagePath, 1);
    this.imageProcessingQueue.drain(this.onProcessingQueueEmptied.bind(this));
    this.imageProcessingQueue.error(this.onProcessingQueueError.bind(this));

    const watcher = new Watcher(
      this.config.IMAGE_PATHS,
      this.config.EXCLUDE_FILES,
      this.onImagePathAdded.bind(this),
      () => {
        this.didCompleteInitialScan = true;
        if (onInitialScanCompleted) {
          onInitialScanCompleted();
        }
      }
    );
  }

  /**
   * Handles a new path in the image folders.
   * If it is a supported image, adds it to the processing queue
   *
   * @param path - the path newly added to the watch image
   * folders
   */
  private async onImagePathAdded(path: string) {
    logger.log("[imageWatcher]: on add ", path);

    if (
      ![".jpg", ".jpeg", ".png", ".gif"].includes(extname(path)) ||
      basename(path).startsWith(".") ||
      fileIsExcluded(this.config.EXCLUDE_FILES, path)
    )
      return;

    if (await imageWithPathExists(path)) {
      logger.log(`Image '${path}' already exists`);
    } else {
      this.imageProcessingQueue.push(path);
      logger.log(`Added image to processing queue '${path}'.`);
    }
  }

  /**
   * Processes a path in the queue by importing the image
   *
   * @param path - the path to process
   * @param callback - callback to execute once the path is processed
   */
  private async processImagePath(imagePath: string, callback: () => void) {
    try {
      const imageName = basename(imagePath);
      const image = new Image(imageName);
      image.path = imagePath;

      if (
        this.didCompleteInitialScan ||
        this.readImageDimensionsBeforeInitialScanComplete
      ) {
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

  private onProcessingQueueEmptied() {
    logger.log("[imageWatcher]: Processing queue empty");

    if (this.onProcessingCompleted) {
      this.onProcessingCompleted();
    }
  }

  private onProcessingQueueError(error: Error, task: string) {
    logger.error("[imageWatcher]: path processing encountered an error");
    logger.error(error);
  }
}
