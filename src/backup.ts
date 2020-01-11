import {
  copyFileAsync,
  readdirAsync,
  rimrafAsync,
  existsAsync
} from "./fs/async";
import { join } from "path";
import { libraryPath, mapAsync } from "./types/utility";
import * as log from "./logger/index";
import { mkdirSync } from "fs";

async function checkBackupMax(amount = 10) {
  const backups = await readdirAsync("backups");
  backups.sort();
  if (backups.length >= amount) {
    const oldestBackup = join("backups", backups[0]);
    log.log("Removing oldest backup: " + oldestBackup + "...");
    await rimrafAsync(oldestBackup);
  }
}

export async function createBackup(amount = 10) {
  const foldername = join("backups", new Date().valueOf().toString(36));
  mkdirSync(foldername);
  log.warn("Creating backup in " + foldername + "...");

  const files = [
    "cross_references.db",
    "actors.db",
    "images.db",
    "labels.db",
    "movies.db",
    "studios.db",
    "scenes.db"
  ];

  try {
    const transfers = await mapAsync(files, async file => {
      return {
        from: await libraryPath(file),
        to: join(foldername, file)
      };
    });

    for (const transfer of transfers) {
      if (!(await existsAsync(transfer.from))) return;

      log.log(`Backup: ${transfer.from} -> ${transfer.to}...`);

      try {
        await copyFileAsync(transfer.from, transfer.to);
      } catch (error) {
        log.error(error);
        log.warn(`Couldn't back up ${transfer.from} to ${transfer.to}.`);
      }
    }

    await checkBackupMax(amount);
    log.success("Backup done.");
  } catch (err) {
    log.error(err);
  }
}
