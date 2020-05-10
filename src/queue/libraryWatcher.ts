import { getConfig, IConfig } from "../config";
import * as logger from "../logger";
import ImageWatcher from "./imageWatcher";
import VideoWatcher from "./videoWatcher";
import Watcher from "./watcher";

export default class LibraryWatcher {
  private config: IConfig;

  private videoWatcher: VideoWatcher;
  private imageWatcher: ImageWatcher;

  private watcher: Watcher;
  private completedInitialScan: boolean;

  constructor(
    onVideoProcesingQueueEmpty: () => void,
    readImageDimensionsBeforeInitialScanComplete: boolean,
    onInitialScanCompleted?: () => void
  ) {
    this.config = getConfig();
    this.completedInitialScan = false;

    this.videoWatcher = new VideoWatcher(onVideoProcesingQueueEmpty);

    this.imageWatcher = new ImageWatcher(
      readImageDimensionsBeforeInitialScanComplete,
      this.didInitialScanComplete.bind(this)
    );

    const watchPaths = [
      ...new Set([...this.config.VIDEO_PATHS, ...this.config.IMAGE_PATHS]),
    ];

    this.watcher = new Watcher(
      watchPaths,
      this.config.EXCLUDE_FILES,
      this.onPathAdded.bind(this),
      () => {
        this.completedInitialScan = true;
        if (onInitialScanCompleted) {
          onInitialScanCompleted();
        }
      }
    );
  }

  onPathAdded(path) {
    logger.log(`[libraryWatcher]: found path ${path}`);

    // No need to await these
    this.videoWatcher.tryProcessVideo(path);
    this.imageWatcher.tryProcessImage(path);
  }

  didInitialScanComplete() {
    return this.completedInitialScan;
  }
}
