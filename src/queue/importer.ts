import { spawn } from "child_process";

import { getConfig } from "../config";
import * as logger from "../logger";
import { checkImageFolders, checkVideoFolders } from "./check";
import LibraryWatcher from "./libraryWatcher";
import {
  getLength,
  isProcessing,
  setProcessingStatus,
  getHead,
} from "./processing";

/**
 * How many times to attempt to start the processing
 * worker before abandoning
 */
const MAX_START_PROCESSING_WORKER_TRIES = 3;

let oldProcessingHead: { _id: string } | null = null;

let libraryWatcher: LibraryWatcher | null;
let scheduledScanTimeout: NodeJS.Timeout | null;

let isManualScanningLibrary = false;

export function getIsManualScanningLibrary() {
  return isManualScanningLibrary;
}

/**
 * Starts the processing worker only if it is ***not already***
 * started
 *
 * @param currentAttemptCount - the number of this attempt to start
 * the processing worker
 * @returns resolves only if
 * - the worker is started and then: 1. finishes the queue OR 2. fails to start/exits for some reason
 * - the queue is empty
 */
async function tryStartProcessing(currentAttemptCount = 1) {
  if (currentAttemptCount > MAX_START_PROCESSING_WORKER_TRIES) {
    logger.warn(
      `Failed to start the processing worker after ${currentAttemptCount} tries, will stop`
    );
    return Promise.resolve();
  }

  return new Promise(async (resolve, reject) => {
    const queueLen = await getLength();

    if (isProcessing()) {
      reject(new Error("Processing worker already started"));
    } else if (!queueLen) {
      logger.success("No more videos to process.");

      resolve();
    } else if (queueLen > 0) {
      logger.message("Starting processing worker...");
      setProcessingStatus(true);

      oldProcessingHead = await getHead();

      const processingWorker = spawn(
        process.argv[0],
        process.argv.slice(1).concat(["--process-queue"]),
        {
          cwd: process.cwd(),
          detached: false,
          stdio: "inherit",
        }
      );

      processingWorker.on("exit", (code, signal) => {
        logger.warn(
          `Processing process exited (potentially finished queue) with code ${code} and signal ${signal}`
        );

        setProcessingStatus(false);

        resolve();
      });

      processingWorker.on("error", async (err) => {
        // The 'error' event is emitted whenever:
        // The process could not be spawned, or
        // The process could not be killed, or
        // Sending a message to the child process failed.
        logger.error("Processing process encountered an error, may exit");
        logger.error(err);

        if (!isProcessing()) {
          logger.message(
            "The processing was already finished, assuming that the error is non fatal"
          );
          resolve();
          return; // Ensure execution of this handler is stopped
        }

        logger.message(
          "The processing was ongoing. Will attempt to check if the worker failed to spawn"
        );

        try {
          const currentProcessingHead = await getHead();
          const isOnSameScene =
            oldProcessingHead &&
            currentProcessingHead &&
            oldProcessingHead._id === currentProcessingHead._id;

          // If on error, we are still processing and the queue is on
          // the same scene as when we started, assume the worker
          // failed to start
          if (isOnSameScene) {
            resolve(tryStartProcessing(currentAttemptCount + 1));
          }
        } catch (err) {
          logger.warn(
            "Could not detect if the worker exited because of a failure to start, or for some other reason"
          );
        }

        setProcessingStatus(false);

        resolve();
      });
    }
  });
}

/**
 * Will attempt to start the video processing.
 * Schedules a manual scan once the processing worker closes
 */
export async function processLibrary() {
  try {
    await tryStartProcessing();
    logger.message("Processing done");

    // When the processing worker finishes, we assume the queue was emptied
    // because there are no more new files.
    // So only now, we can schedule another scan
    scheduleManualScan();
  } catch (err) {
    logger.error("Couldn't start processing...");
    logger.error(err.message);
  }
}

/**
 * Triggers a scan of the library. Will use the current
 * config to either do a manual scan or watch the library files.
 * If there is an ongoing ***manual*** scan, will do nothing
 *
 * @param isScheduledManualScan - if should do a manual scan,
 * even if we are in watch mode. Will not execute if one is already ongoing
 */
export async function scanFolders(isScheduledManualScan = false) {
  if (isManualScanningLibrary) {
    logger.message(
      "Received request to scan, but a scan is already in progress. Will skip this one"
    );
  }

  if (isScheduledManualScan) {
    logger.message("Scheduled manual library scan starting...");
  } else {
    logger.message("Scanning library folders...");
  }

  const config = getConfig();

  if (!isScheduledManualScan && config.WATCH_LIBRARY) {
    logger.message("Scanning library via file watching");

    if (libraryWatcher) {
      logger.message("Already watching library, will not recreate watcher");
    } else {
      libraryWatcher = new LibraryWatcher(processLibrary, () => {
        logger.message("Finished library watch initialization");
      });
    }

    return;
  }

  isManualScanningLibrary = true;

  logger.message("Scanning library via manual scan");

  // If we switched to manual scans: destroy the watcher
  if (libraryWatcher) {
    logger.message("File watcher was previously active, will destroy...");
    // Do not await
    libraryWatcher
      .stopWatching()
      .then(() => {
        libraryWatcher = null;
      })
      .catch((err) => {
        logger.error(
          "Error stopping file watch while switching to manual scan"
        );
        logger.error(err);
      });
  }

  try {
    logger.message("Launching manual video library scan");
    await checkVideoFolders();
    logger.success("Manual video library scan done.");
  } catch (err) {
    logger.error("Manual video library scan failed");
    logger.error(err);
  }

  // If the video import failed halfway through, we still want to
  // process the videos that did import
  logger.message(
    "Will now start processing the imported videos (if not already ongoing)"
  );
  processLibrary(); // Do not await

  // Launch image import AFTER the video succeeds/fails
  try {
    logger.message("Launching manual image library scan");
    await checkImageFolders();
    logger.success("Manual image library scan done.");
  } catch (err) {
    logger.error("Manual image library scan failed");
    logger.error(err);
  }

  isManualScanningLibrary = false;
}

/**
 * Schedules a manual library scan for in `config.SCAN_INTERVAL`ms
 * Will cancel the previously scheduled scan if there is one.
 */
export function scheduleManualScan() {
  const config = getConfig();

  if (scheduledScanTimeout) {
    clearTimeout(scheduledScanTimeout);
    scheduledScanTimeout = null;
  }

  if (config.SCAN_INTERVAL > 0) {
    logger.message(`Setting up a manual scan in ${config.SCAN_INTERVAL}ms`);
    scheduledScanTimeout = setTimeout(
      () => scanFolders(true),
      config.SCAN_INTERVAL
    );
  }
}

/**
 * If the library folders were being watched, destroys the
 * listeners
 */
export async function destroyImporter() {
  try {
    if (libraryWatcher) {
      logger.message("File watcher was previously active, will destroy...");

      await libraryWatcher.stopWatching();
    }
  } catch (err) {
    logger.error("Error cleaning up server resourced");
    logger.error(err);
  }
}
