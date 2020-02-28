import { spawn } from "child_process";
import { type, arch } from "os";
import * as logger from "./logger";
import { existsAsync } from "./fs/async";
import Axios from "axios";
import { downloadFile } from "./ffmpeg-download";
import { chmodSync } from "fs";

export const twigsPath = type() == "Windows_NT" ? "twigs.exe" : "twigs";

interface IGithubAsset {
  browser_download_url: string;
  name: string;
}

async function downloadTwigs() {
  logger.log("Fetching Twigs releases...");
  const releaseUrl = `https://api.github.com/repos/boi123212321/twigs/releases/latest`;

  const releaseInfo = (await Axios.get(releaseUrl)).data;
  const releaseId = releaseInfo.id;

  const assetsUrl = `https://api.github.com/repos/boi123212321/twigs/releases/${releaseId}/assets`;

  const assets = (await Axios.get(assetsUrl)).data as IGithubAsset[];

  const downloadName = {
    Windows_NT: "twigs.exe",
    Linux: "twigs_linux",
    Darwin: "twigs_mac"
  }[type()] as string;

  if (arch() != "x64") {
    logger.error("Unsupported architecture " + arch());
    process.exit(1);
  }

  const asset = assets.find(as => as.name == downloadName);

  if (!asset) {
    logger.error("Twigs release not found: " + downloadName + " for " + type());
    process.exit(1);
  }

  await downloadFile(asset.browser_download_url, twigsPath);
  logger.log("CHMOD Twigs...");
  chmodSync(twigsPath, "111");
}

export async function ensureTwigsExists() {
  if (await existsAsync(twigsPath)) {
    logger.log("Twigs binary found");
    return true;
  } else {
    logger.message("Downloading latest Twigs binary...");
    await downloadTwigs();
  }
}

export function spawnTwigs() {
  return new Promise((resolve, reject) => {
    const twigs = spawn("./" + twigsPath, []);
    let responded = false;
    twigs.on("error", err => {
      reject(err);
    });
    twigs.stdout.on("data", data => {
      logger.twigs(data.toString());
      if (!responded) {
        logger.log("Twigs ready");
        responded = true;
        resolve();
      }
    });
  });
}
