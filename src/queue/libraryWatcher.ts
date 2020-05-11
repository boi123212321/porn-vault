import { extname } from "path";

import { getConfig, IConfig } from "../config";
import * as logger from "../logger";
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from "./constants";
import ImageQueue from "./image/imageQueue";
import VideoQueue from "./video/videoQueue";
import Watcher from "./watcher";

/**
 * Generates an array of glob paths to watch for the library
 *
 * @param videoPaths - paths to watch for videos
 * @param imagePaths - paths to watch for images
 */
const createWatchPaths = (videoPaths, imagePaths) => {
  const videoGlobs = videoPaths.flatMap((path) => {
    return SUPPORTED_VIDEO_EXTENSIONS.map(
      (extension) => `${path}/**/*${extension}`
    );
  });

  const imageGlobs = imagePaths.flatMap((path) => {
    return SUPPORTED_IMAGE_EXTENSIONS.map(
      (extension) => `${path}/**/*${extension}`
    );
  });

  // Return unique globs
  return [...new Set([...videoGlobs, ...imageGlobs])];
};

export default class LibraryWatcher {
  private config: IConfig;

  private videoQueue: VideoQueue;
  private imageQueue: ImageQueue;

  private watcher: Watcher;

  /**
   *
   * @param onVideoProcesingQueueEmpty - Called every time the video import
   * queue is emptied
   * @param onInitialScanCompleted - Called when the initial scan of the library
   * is complete
   */
  constructor(
    onVideoProcesingQueueEmpty: () => void,
    onInitialScanCompleted?: () => void
  ) {
    this.config = getConfig();

    this.videoQueue = new VideoQueue(onVideoProcesingQueueEmpty);

    this.imageQueue = new ImageQueue();

    const watchPaths = createWatchPaths(
      this.config.VIDEO_PATHS,
      this.config.IMAGE_PATHS
    );

    this.watcher = new Watcher(
      {
        includePaths: watchPaths,
        excludePaths: this.config.EXCLUDE_FILES,
        pollingInterval: this.config.WATCH_POLLING_INTERVAL,
      },
      this.onPathAdded.bind(this),
      () => {
        if (onInitialScanCompleted) {
          onInitialScanCompleted();
        }
      }
    );
  }
  /**
   * Stops watching what was passed in the constructor
   * of this instance
   *
   * @returns resolves once all the files are unwatched
   */
  public async stopWatching() {
    logger.log("[libraryWatcher]: Stopping watch");
    await this.watcher.stopWatching();
    logger.log("[libraryWatcher]: Did stop watching");
  }

  private onPathAdded(addedPath) {
    logger.log(
      `[libraryWatcher]: found path ${addedPath}, passing to appropriate queues`
    );

    // No need to await these
    if (SUPPORTED_VIDEO_EXTENSIONS.includes(extname(addedPath))) {
      this.videoQueue.addPathToQueue(addedPath);
    }

    if (SUPPORTED_IMAGE_EXTENSIONS.includes(extname(addedPath))) {
      this.imageQueue.addPathToQueue(addedPath);
    }
  }
}
