import { queue } from "async";

import * as logger from "../../logger";
import Scene from "../../types/scene";
import { LibraryTypeQueueManager } from "../constants";
import { isImportableVideo } from "./utility";

const onVideoQueueEmptiedListeners: (() => void)[] = [];

export function attachOnVideoQueueEmptiedListener(fn: () => void) {
  onVideoQueueEmptiedListeners.push(fn);
}

// QUEUE EXECUTION

const videoProcessingQueue = queue(importVideoFromPath, 1);
videoProcessingQueue.drain(onImportQueueEmptied);
videoProcessingQueue.error(onImportQueueError);

/**
 * Processes a path in the queue by importing the scene
 *
 * @param path - the path to process
 * @param callback - callback to execute once the path is processed
 */
async function importVideoFromPath(path: string, callback: () => void) {
  try {
    await Scene.onImport(path);
  } catch (error) {
    logger.log(error.stack);
    logger.error("[videoQueue]:Error when importing " + path);
    logger.warn(error.message);
  }

  callback();
}

function onImportQueueEmptied() {
  logger.log("[videoQueue]: Processing queue empty");

  for (const listener of onVideoQueueEmptiedListeners) {
    listener();
  }
}

function onImportQueueError(error: Error, task: string) {
  logger.error("[videoQueue]: path processing encountered an error");
  logger.error(error);
}

// QUEUE MANAGEMENT

/**
 * Handles a new path in the video folders.
 * If it is a supported video, adds it to the processing queue
 *
 * @param path - the path newly added to the watch video
 * folders
 */
export async function addVideoPathToQueue(...paths: string[]) {
  for (const path of paths) {
    if (!isImportableVideo(path)) {
      logger.log(`[videoQueue]: Ignoring file ${path}`);
      return;
    }

    logger.log(`[videoQueue]: Found matching file ${path}`);

    const existingScene = await Scene.getSceneByPath(path);
    logger.log(
      "[videoQueue]: Scene with that path exists already ?: " + !!existingScene
    );

    if (!existingScene) {
      videoProcessingQueue.push(path);
      logger.log(`[videoQueue]: Added video to processing queue '${path}'.`);
    }
  }
}

export const VideoImportQueueManager: LibraryTypeQueueManager = {
  attachOnQueueEmptiedListener: attachOnVideoQueueEmptiedListener,
  addPathsToQueue: addVideoPathToQueue,
  getQueueLength: () => videoProcessingQueue.length(),
  resumeQueue: () => videoProcessingQueue.resume(),
  pauseQueue: () => videoProcessingQueue.pause(),
  getRunningCount: () => videoProcessingQueue.running(),
  isQueueRunning: () => videoProcessingQueue.running() > 0,
};
