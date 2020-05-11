import queue, { AsyncQueue } from "async/queue";

import { getConfig, IConfig } from "../../config";
import * as logger from "../../logger";
import Scene from "../../types/scene";
import { isImportableVideo } from "./utility";

export default class VideoQueue {
  private config: IConfig;
  private videoProcessingQueue: AsyncQueue<string>;

  private onQueueEmptiedCb?: () => void;

  /**
   * @param onQueueEmptiedCb - called once the video processing is complete
   */
  constructor(onQueueEmptiedCb?: () => void) {
    this.config = getConfig();

    this.onQueueEmptiedCb = onQueueEmptiedCb;

    this.videoProcessingQueue = queue(this.importVideoFromPath, 1);
    this.videoProcessingQueue.drain(this.onImportQueueEmptied.bind(this));
    this.videoProcessingQueue.error(this.onImportQueueError.bind(this));
  }

  /**
   * Handles a new path in the video folders.
   * If it is a supported video, adds it to the processing queue
   *
   * @param path - the path newly added to the watch video
   * folders
   */
  public async addPathToQueue(path: string) {
    if (!isImportableVideo(path)) {
      logger.log(`[videoWatcher]: Ignoring file ${path}`);
      return;
    }

    logger.log(`[videoWatcher]: Found matching file ${path}`);

    const existingScene = await Scene.getSceneByPath(path);
    logger.log(
      "[videoWatcher]: Scene with that path exists already ?: " +
        !!existingScene
    );

    if (!existingScene) {
      this.videoProcessingQueue.push(path);
      logger.log(`Added video to processing queue '${path}'.`);
    }
  }

  /**
   * Processes a path in the queue by importing the scene
   *
   * @param path - the path to process
   * @param callback - callback to execute once the path is processed
   */
  private async importVideoFromPath(path: string, callback: () => void) {
    try {
      await Scene.onImport(path);
    } catch (error) {
      logger.log(error.stack);
      logger.error("[videoWatcher]:Error when importing " + path);
      logger.warn(error.message);
    }

    callback();
  }

  private onImportQueueEmptied() {
    logger.log("[videoWatcher]: Processing queue empty");

    if (this.onQueueEmptiedCb) {
      this.onQueueEmptiedCb();
    }
  }

  private onImportQueueError(error: Error, task: string) {
    logger.error("[videoWatcher]: path processing encountered an error");
    logger.error(error);
  }
}
