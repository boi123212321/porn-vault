import Axios from "axios";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { chmodSync, existsSync } from "fs";
import { arch, type } from "os";

import { getConfig } from "./config/index";
import { downloadFile } from "./ffmpeg-download";
import { unlinkAsync } from "./fs/async";
import * as logger from "./logger";

export let giannaProcess!: ChildProcessWithoutNullStreams;

export const giannaPath = type() === "Windows_NT" ? "gianna.exe" : "gianna";

export async function deleteGianna(): Promise<void> {
  await unlinkAsync(giannaPath);
}

interface IGithubAsset {
  // eslint-disable-next-line camelcase
  browser_download_url: string;
  name: string;
}

export async function giannaVersion(): Promise<string | null> {
  try {
    const res = await Axios.get(`http://localhost:${getConfig().GIANNA_PORT}/`);
    return res.data.version as string;
  } catch {
    return null;
  }
}

export async function resetGianna(): Promise<void> {
  try {
    await Axios.delete(`http://localhost:${getConfig().GIANNA_PORT}/index`);
  } catch (error) {
    const _err = error as Error;
    logger.error("Error while resetting gianna");
    logger.log(_err.message);
    throw _err;
  }
}

async function downloadGianna() {
  logger.log("Fetching Gianna releases...");
  const releaseUrl = `https://api.github.com/repos/boi123212321/gianna/releases/latest`;

  const releaseInfo = (
    await Axios.get<{
      id: string;
    }>(releaseUrl)
  ).data;
  const releaseId = releaseInfo.id;

  const assetsUrl = `https://api.github.com/repos/boi123212321/gianna/releases/${releaseId}/assets`;

  const assets = (await Axios.get(assetsUrl)).data as IGithubAsset[];

  const downloadName = {
    Windows_NT: "gianna.exe",
    Linux: "gianna_linux",
    Darwin: "gianna_mac",
  }[type()] as string;

  if (arch() !== "x64") {
    logger.error("Unsupported architecture " + arch());
    process.exit(1);
  }

  const asset = assets.find((as) => as.name === downloadName);

  if (!asset) {
    logger.error("Gianna release not found: " + downloadName + " for " + type());
    process.exit(1);
  }

  // eslint-disable-next-line camelcase
  await downloadFile(asset.browser_download_url, giannaPath);
  logger.log("CHMOD Gianna...");
  chmodSync(giannaPath, "111");
}

export async function ensureGiannaExists(): Promise<0 | 1> {
  if (existsSync(giannaPath)) {
    logger.log("Gianna binary found");
    return 0;
  } else {
    logger.message("Downloading latest Gianna (search engine) binary...");
    await downloadGianna();
    return 1;
  }
}

export function spawnGianna(): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.log("Spawning Gianna");

    const port = getConfig().GIANNA_PORT;

    giannaProcess = spawn("./" + giannaPath, ["--port", port.toString()]);
    let responded = false;
    giannaProcess.on("error", (err) => {
      reject(err);
    });
    giannaProcess.stdout.on("data", () => {
      if (!responded) {
        logger.log(`Gianna ready on port ${port}`);
        responded = true;
        resolve();
      }
    });
    giannaProcess.stderr.on("data", (data: Buffer) => {
      logger.gianna(data.toString());
    });
  });
}
