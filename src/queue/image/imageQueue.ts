import queue, { AsyncQueue } from "async/queue";

import { getConfig, IConfig } from "../../config";
import * as logger from "../../logger";
import {
  imageWithPathExists,
  isImportableImage,
  processImage,
} from "./utility";

export default class ImageQueue {
  private config: IConfig;
  private imageProcessingQueue: AsyncQueue<string>;

  private onQueueEmptiedCb?: () => void;

  /**
   * @param onQueueEmptiedCb - called once the image processing is complete
   * @param onInitialScanCompleted - called once the initial scan of the image
   * folders is complete
   */
  constructor(onQueueEmptiedCb?: () => void) {
    this.config = getConfig();

    this.onQueueEmptiedCb = onQueueEmptiedCb;

    this.imageProcessingQueue = queue(this.importImageFromPath, 1);
    this.imageProcessingQueue.drain(this.onImportQueueEmptied.bind(this));
    this.imageProcessingQueue.error(this.onImportQueueError.bind(this));
  }

  /**
   * Handles a new path in the image folders.
   * If it is a supported image, adds it to the processing queue
   *
   * @param path - the path newly added to the watch image
   * folders
   */
  public async addPathToQueue(path: string) {
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
  private async importImageFromPath(imagePath: string, callback: () => void) {
    try {
      await processImage(imagePath, this.config.READ_IMAGES_ON_IMPORT);
    } catch (error) {
      logger.log(error.stack);
      logger.error("[imageWatcher]: Error when importing " + imagePath);
      logger.warn(error.message);
    }

    callback();
  }

  private onImportQueueEmptied() {
    logger.log("[imageWatcher]: Processing queue empty");

    if (this.onQueueEmptiedCb) {
      this.onQueueEmptiedCb();
    }
  }

  private onImportQueueError(error: Error, task: string) {
    logger.error("[imageWatcher]: path processing encountered an error");
    logger.error(error);
  }
}
