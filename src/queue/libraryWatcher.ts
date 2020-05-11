import { getConfig, IConfig } from "../config";
import * as logger from "../logger";
import ImageWatcher from "./image/imageWatcher";
import VideoWatcher from "./video/videoWatcher";
import Watcher from "./watcher";

export default class LibraryWatcher {
  private config: IConfig;

  private videoWatcher: VideoWatcher;
  private imageWatcher: ImageWatcher;

  private watcher: Watcher;

  constructor(
    onVideoProcesingQueueEmpty: () => void,
    onInitialScanCompleted?: () => void
  ) {
    this.config = getConfig();

    this.videoWatcher = new VideoWatcher(onVideoProcesingQueueEmpty);

    this.imageWatcher = new ImageWatcher();

    const watchPaths = [
      ...new Set([...this.config.VIDEO_PATHS, ...this.config.IMAGE_PATHS]),
    ];

    this.watcher = new Watcher(
      watchPaths,
      this.config.EXCLUDE_FILES,
      this.onPathAdded.bind(this),
      () => {
        if (onInitialScanCompleted) {
          onInitialScanCompleted();
        }
      },
      { pollingInterval: this.config.WATCH_POLLING_INTERVAL }
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

  private onPathAdded(path) {
    logger.log(`[libraryWatcher]: found path ${path}`);

    // No need to await these
    this.videoWatcher.tryProcessVideo(path);
    this.imageWatcher.tryProcessImage(path);
  }
}
