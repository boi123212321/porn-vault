import chokidar, { FSWatcher, WatchOptions } from "chokidar";

import * as logger from "../logger";

/**
 * Watches paths for any changes
 */
export default class Watcher {
  private watcher: FSWatcher | null;
  private watchOptions: WatchOptions;

  /**
   * @param watchPaths - the paths to watch
   * @param excludePaths - paths to exclude from emitting events for
   * @param onPathAdded - callback for when a new path is discovered
   * @param onReadyCallback - called when the initial scan is complete
   */
  constructor(
    watch: string[],
    exclude: string[],
    onPathAdded: (path: string) => void,
    onReadyCallback?: () => void
  ) {
    // Clone arrays to prevent mutation on original
    const watchPaths = [...watch];
    const excludePaths = [...exclude];

    this.watcher = null;

    this.watchOptions = {
      ignored: excludePaths,
      usePolling: true, // Necessary for network watching
      interval: 1000 * 2,
      awaitWriteFinish: true,
    };

    if (excludePaths.length) {
      logger.log(`[watcher]: Will ignore files: ${excludePaths}.`);
    }

    this.watcher = chokidar.watch(watchPaths, this.watchOptions);
    this.watcher.on("add", (path) => {
      onPathAdded(path);
    });

    this.watcher.on("ready", () => {
      logger.log(`[watcher]: initial scan complete for ${watchPaths}`);

      if (onReadyCallback) {
        onReadyCallback();
      }
    });
  }
}
