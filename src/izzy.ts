import { spawn } from "child_process";
import { type, arch } from "os";
import * as logger from "./logger";
import { existsAsync } from "./fs/async";
import Axios from "axios";
import { downloadFile } from "./ffmpeg-download";
import { chmodSync } from "fs";

export const izzyPath = type() == "Windows_NT" ? "izzy.exe" : "izzy";

export async function resetIzzy() {
  await Axios.delete(`http://localhost:7999/collection`);
}

export async function izzyVersion() {
  try {
    const res = await Axios.get(`http://localhost:7999/`);
    return res.data.version as string;
  } catch (error) {
    return null;
  }
}

interface IGithubAsset {
  browser_download_url: string;
  name: string;
}

async function downloadIzzy() {
  logger.log("Fetching Izzy releases...");
  const releaseUrl = `https://api.github.com/repos/boi123212321/izzy/releases/latest`;

  const releaseInfo = (await Axios.get(releaseUrl)).data;
  const releaseId = releaseInfo.id;

  const assetsUrl = `https://api.github.com/repos/boi123212321/izzy/releases/${releaseId}/assets`;

  const assets = (await Axios.get(assetsUrl)).data as IGithubAsset[];

  const downloadName = {
    Windows_NT: "izzy.exe",
    Linux: "izzy_linux",
    Darwin: "izzy_mac",
  }[type()] as string;

  if (arch() != "x64") {
    logger.error("Unsupported architecture " + arch());
    process.exit(1);
  }

  const asset = assets.find((as) => as.name == downloadName);

  if (!asset) {
    logger.error("Izzy release not found: " + downloadName + " for " + type());
    process.exit(1);
  }

  await downloadFile(asset.browser_download_url, izzyPath);
  logger.log("CHMOD Izzy...");
  chmodSync(izzyPath, "111");
}

export async function ensureIzzyExists() {
  if (await existsAsync(izzyPath)) {
    logger.log("Izzy binary found");
    return 0;
  } else {
    logger.message("Downloading latest Izzy (database) binary...");
    await downloadIzzy();
    return 1;
  }
}

export function spawnIzzy() {
  return new Promise((resolve, reject) => {
    logger.log("Spawning Izzy");
    const izzy = spawn("./" + izzyPath, []);
    let responded = false;
    izzy.on("error", (err) => {
      reject(err);
    });
    izzy.stdout.on("data", (data) => {
      if (!responded) {
        logger.log("Izzy ready");
        responded = true;
        resolve();
      }
    });
    izzy.stderr.on("data", (data) => {
      logger.izzy(data.toString());
    });
  });
}
