import * as logger from "./logger";

import { checkImageFolders, checkVideoFolders } from "./queue/check";
import { tryStartProcessing } from "./queue/processing";

export let nextScanTimestamp = null as number | null;

let nextScanTimeout: NodeJS.Timeout | null = null;

export let isScanning = false;

/**
 * Prints the date of the next scan & saves the timestamp
 *
 * @param nextScanMs - in how long the next scan will be executed
 */
function printNextScanDate(nextScanMs: number) {
  const nextScanDate = new Date(Date.now() + nextScanMs);
  nextScanTimestamp = nextScanDate.valueOf();
  logger.message(`Next scan at ${nextScanDate.toLocaleString()}`);
}

/**
 *
 * @param nextScanMs - after this scan *A*, in how long another scan *B* should be executed.
 * If a scan *X* was previously scheduled, will cancel it in favour of *B*.
 * If falsy, will leave *X* untouched and not schedule *B*
 */
export async function scanFolders(nextScanMs: number = 0) {
  // If we will be scheduling another scan after this one, cancel
  // the existing scheduled one
  if (nextScanMs && nextScanTimeout) {
    clearTimeout(nextScanTimeout);
  }

  try {
    logger.message("Scanning folders...");
    isScanning = true;

    await checkVideoFolders();
    logger.success("Video scan done.");

    // Start processing as soon as video scan is done
    tryStartProcessing().catch((err) => {
      logger.error("Couldn't start processing...");
      logger.error(err.message);
    });

    await checkImageFolders();
    isScanning = false;
  } catch (err) {
    logger.error("Scan failed " + err.message);
  }

  if (nextScanMs) {
    printNextScanDate(nextScanMs);
    nextScanTimeout = global.setTimeout(() => {
      scanFolders().catch((err) => {
        logger.error("Scan failed " + err.message);
      });
    }, nextScanMs);
  }
}
