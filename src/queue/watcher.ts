import chokidar, { FSWatcher, WatchOptions } from "chokidar";

import * as logger from "../logger";

interface WatcherOptions {
  includePaths?: string[];
  excludePaths?: string[];
  pollingInterval?: number;
}

const DEFAULT_OPTIONS = {
  includePaths: [],
  excludePaths: [],
  pollingInterval: 2 * 1000,
};

/**
 * Watches paths for any changes
 */
export default class Watcher {
  private watcher: FSWatcher;
  private watchOptions: WatchOptions;

  /**
   * @param options - options for what and how to watch
   * @param onPathAdded - callback for when a new path is discovered
   * @param onReadyCallback - called when the initial scan is complete
   */
  constructor(
    options: WatcherOptions,
    onPathAdded: (path: string) => void,
    onReadyCallback: () => void
  ) {
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const watchPaths = [...mergedOptions.includePaths];
    const excludePaths = [...mergedOptions.excludePaths];

    this.watchOptions = {
      // Main options
      ignored: excludePaths,
      awaitWriteFinish: true,
      // Polling options. Polling is needed for docker mounts
      // and recommended for network mounts
      usePolling: mergedOptions.pollingInterval > 0,
      interval: mergedOptions.pollingInterval,
      binaryInterval: mergedOptions.pollingInterval,
    };

    logger.log(`[watcher]: Will watch folders: ${watchPaths}.`);

    if (excludePaths.length) {
      logger.log(`[watcher]: Will ignore files: ${excludePaths}.`);
    }

    this.watcher = chokidar.watch(watchPaths, this.watchOptions);
    this.watcher.on("add", (path) => {
      onPathAdded(path);
    });

    this.watcher.on("ready", () => {
      logger.log(`[watcher]: initial scan complete for ${watchPaths}`);

      onReadyCallback();
    });
  }

  /**
   * Stops watching what was passed in the constructor
   * of this instance
   *
   * @returns resolves once all the files are unwatched
   */
  public async stopWatching(): Promise<void> {
    logger.log("[watcher]: Stopping watch");
    await this.watcher.close();
    logger.log("[watcher]: Did stop watching");
  }
}
