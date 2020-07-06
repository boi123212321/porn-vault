import { chmodSync, existsSync } from "fs";
import inquirer from "inquirer";
import { sha512 } from "js-sha512";
import * as path from "path";

import { defaultConfig, IConfig } from "./config/index";
import { downloadFile, getFFMpegURL, getFFProbeURL } from "./ffmpeg-download";
import * as logger from "./logger";

export const defaultPrompts = {
  downloadFFMPEG: true,
  usePassword: process.env.NODE_ENV !== "test",
  useVideoFolders: process.env.NODE_ENV !== "test",
  useImageFolders: process.env.NODE_ENV !== "test",
};

export default async (): Promise<IConfig> => {
  const {
    downloadFFMPEG,
    usePassword,
    password,
    useVideoFolders,
    videoFolders,
    useImageFolders,
    imageFolders,
  } = await promptSetup();

  const config = JSON.parse(JSON.stringify(defaultConfig)) as IConfig;

  if (downloadFFMPEG) {
    const { ffmpegPath, ffprobePath } = await downloadFFLibs();

    config.FFMPEG_PATH = path.resolve(ffmpegPath);
    config.FFPROBE_PATH = path.resolve(ffprobePath);
  }

  if (usePassword) config.PASSWORD = sha512(password);

  if (useVideoFolders) config.VIDEO_PATHS = videoFolders;

  if (useImageFolders) config.IMAGE_PATHS = imageFolders;

  return config;
};

/**
 * Prompts the user for how to setup the config
 *
 * @returns the choices
 */
async function promptSetup() {
  // If testing, skip prompts, return defaults
  if (process.env.NODE_ENV === "test") {
    return {
      ...defaultPrompts,
      password: "",
      videoFolders: [],
      imageFolders: [],
    };
  }

  const downloadFFMPEG = (
    await inquirer.prompt<{ downloadFFMPEG: boolean }>([
      {
        type: "confirm",
        name: "downloadFFMPEG",
        message: "Download FFMPEG binaries?",
        default: defaultPrompts.downloadFFMPEG,
      },
    ])
  ).downloadFFMPEG;

  const { usePassword } = await inquirer.prompt<{ usePassword: boolean }>([
    {
      type: "confirm",
      name: "usePassword",
      message: "Set a password (protect server in LAN)?",
      default: defaultPrompts.usePassword,
    },
  ]);

  let password = "";

  if (usePassword) {
    password = (
      await inquirer.prompt<{ password: string }>([
        {
          type: "password",
          name: "password",
          message: "Enter a password",
        },
      ])
    ).password;

    let confirmPassword;

    do {
      confirmPassword = (
        await inquirer.prompt<{ password: string }>([
          {
            type: "password",
            name: "password",
            message: "Confirm password",
          },
        ])
      ).password;
    } while (password !== confirmPassword);
  }

  const { useVideoFolders } = await inquirer.prompt<{ useVideoFolders: boolean }>([
    {
      type: "confirm",
      name: "useVideoFolders",
      message: "Do you have one or more folders you want to import VIDEOS from?",
      default: defaultPrompts.useVideoFolders,
    },
  ]);

  const videoFolders = [] as string[];

  if (useVideoFolders) {
    let path: string;

    do {
      path = (
        await inquirer.prompt<{ path: string }>([
          {
            type: "input",
            name: "path",
            message: "Enter folder name (enter 'done' when done)",
            default: "done",
          },
        ])
      ).path;

      if (path !== "done") {
        if (existsSync(path)) videoFolders.push(path);
        else logger.error(`Could not find ${path}`);
      }
    } while (path !== "done");
  }

  const { useImageFolders } = await inquirer.prompt<{ useImageFolders: boolean }>([
    {
      type: "confirm",
      name: "useImageFolders",
      message: "Do you have one or more folders you want to import IMAGES from?",
      default: defaultPrompts.useVideoFolders,
    },
  ]);

  const imageFolders = [] as string[];

  if (useImageFolders) {
    let path: string;

    do {
      path = (
        await inquirer.prompt<{ path: string }>([
          {
            type: "input",
            name: "path",
            message: "Enter folder name (enter 'done' when done)",
            default: "done",
          },
        ])
      ).path;

      if (path !== "done") {
        if (existsSync(path)) imageFolders.push(path);
        else logger.error(`Could not find ${path}`);
      }
    } while (path !== "done");
  }

  return {
    downloadFFMPEG,
    usePassword,
    password,
    useVideoFolders,
    videoFolders,
    useImageFolders,
    imageFolders,
  };
}

/**
 * Downloads ffmpeg & ffprobe
 *
 * @returns the paths where they were downloaded
 */
async function downloadFFLibs() {
  const ffmpegURL = getFFMpegURL();
  const ffprobeURL = getFFProbeURL();

  const ffmpegPath = path.basename(ffmpegURL);
  const ffprobePath = path.basename(ffprobeURL);

  try {
    await downloadFile(ffmpegURL, ffmpegPath);
    await downloadFile(ffprobeURL, ffprobePath);
  } catch (error) {
    logger.log(error);
    logger.error(error.message);
    process.exit(1);
  }

  try {
    logger.log("CHMOD binaries...");
    chmodSync(ffmpegPath, "111");
    chmodSync(ffprobePath, "111");
  } catch (error) {
    logger.error("Could not make FFMPEG binaries executable");
  }

  return {
    ffmpegPath,
    ffprobePath,
  };
}
