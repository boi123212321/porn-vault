import { tryStartProcessing } from "./queue/processing";
import { checkVideoFolders, checkImageFolders } from "./queue/check";
import * as logger from "./logger";

export let nextScanTimestamp = null as number | null;

export async function scanFolders() {
  logger.message("Scanning folders...");
  await checkVideoFolders();
  logger.success("Scan done.");
  checkImageFolders();

  tryStartProcessing().catch((err) => {
    logger.error("Couldn't start processing...");
    logger.error(err.message);
  });
}

export function startScanInterval(ms: number) {
  function printNextScanDate() {
    const nextScanDate = new Date(Date.now() + ms);
    nextScanTimestamp = nextScanDate.valueOf();
    logger.message(`Next scan at ${nextScanDate.toLocaleString()}`);
  }
  printNextScanDate();
  setInterval(() => {
    scanFolders()
      .then(printNextScanDate)
      .catch((err) => {
        logger.error("Scan failed " + err.message);
      });
  }, ms);
}
