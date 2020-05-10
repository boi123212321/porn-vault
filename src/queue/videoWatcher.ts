import queue, { AsyncQueue } from "async/queue";
import { basename, extname } from "path";

import { getConfig, IConfig } from "../config";
import * as logger from "../logger";
import Scene from "../types/scene";
import { fileIsExcluded } from "../types/utility";

export default class VideoWatcher {
  private config: IConfig;
  private videoProcessingQueue: AsyncQueue<string>;

  private onProcessingCompleted: () => void;

  /**
   * @param onProcessingCompleted - called once the video processing is complete
   */
  constructor(onProcessingCompleted: () => void) {
    this.config = getConfig();

    this.onProcessingCompleted = onProcessingCompleted;

    this.videoProcessingQueue = queue(this.processVideoPath, 1);
    this.videoProcessingQueue.drain(this.onProcessingQueueEmptied.bind(this));
    this.videoProcessingQueue.error(this.onProcessingQueueError.bind(this));
  }

  /**
   * Handles a new path in the video folders.
   * If it is a supported video, adds it to the processing queue
   *
   * @param path - the path newly added to the watch video
   * folders
   */
  public async tryProcessVideo(path: string) {
    if (
      ![".mp4", ".webm"].includes(extname(path)) ||
      basename(path).startsWith(".") ||
      fileIsExcluded(this.config.EXCLUDE_FILES, path)
    ) {
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
  private async processVideoPath(path: string, callback: () => void) {
    try {
      await Scene.onImport(path);
    } catch (error) {
      logger.log(error.stack);
      logger.error("[videoWatcher]:Error when importing " + path);
      logger.warn(error.message);
    }

    callback();
  }

  private onProcessingQueueEmptied() {
    logger.log("[videoWatcher]: Processing queue empty");
    this.onProcessingCompleted();
  }

  private onProcessingQueueError(error: Error, task: string) {
    logger.error("[videoWatcher]: path processing encountered an error");
    logger.error(error);
  }
}
