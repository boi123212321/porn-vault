import queue, { AsyncQueue } from "async/queue";
import Jimp from "jimp";
import { basename } from "path";

import { getConfig, IConfig } from "../../config";
import { imageCollection } from "../../database";
import { extractActors, extractLabels, extractScenes } from "../../extractor";
import * as logger from "../../logger";
import { indexImages } from "../../search/image";
import Image from "../../types/image";
import {
  imageWithPathExists,
  isImportableImage,
  processImage,
} from "./utility";

export default class ImageWatcher {
  private config: IConfig;
  private imageProcessingQueue: AsyncQueue<string>;

  private onProcessingCompleted?: () => void;

  /**
   * @param onProcessingCompleted - called once the image processing is complete
   * @param onInitialScanCompleted - called once the initial scan of the image
   * folders is complete
   */
  constructor(onProcessingCompleted?: () => void) {
    this.config = getConfig();

    this.onProcessingCompleted = onProcessingCompleted;

    this.imageProcessingQueue = queue(this.processImagePath, 1);
    this.imageProcessingQueue.drain(this.onProcessingQueueEmptied.bind(this));
    this.imageProcessingQueue.error(this.onProcessingQueueError.bind(this));
  }

  /**
   * Handles a new path in the image folders.
   * If it is a supported image, adds it to the processing queue
   *
   * @param path - the path newly added to the watch image
   * folders
   */
  public async tryProcessImage(path: string) {
    if (!isImportableImage(path)) {
      logger.log(`[imageWatcher]: Ignoring file ${path}`);
      return;
    }

    logger.log(`[imageWatcher]: Found matching file ${path}`);

    const existingImage = await imageWithPathExists(path);
    logger.log(
      "[imageWatcher]: Scene with that path exists already ?: " +
        !!existingImage
    );

    if (!existingImage) {
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
      await processImage(imagePath, this.config.READ_IMAGES_ON_IMPORT);
    } catch (error) {
      logger.log(error.stack);
      logger.error("[imageWatcher]: Error when importing " + imagePath);
      logger.warn(error.message);
    }

    callback();
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
