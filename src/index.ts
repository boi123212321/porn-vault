import ffmpeg from "fluent-ffmpeg";
import inquirer from "inquirer";
import { sha512 } from "js-sha512";

import args from "./args";
import { checkConfig, getConfig, IConfig } from "./config";
import { validateFFMPEGPaths } from "./config/validate";
import { applyExitHooks } from "./exit";
import { deleteGianna, ensureGiannaExists } from "./gianna";
import { deleteIzzy, ensureIzzyExists } from "./izzy";
import * as logger from "./logger";
import { printMaxMemory } from "./mem";
import { checkUnusedPlugins, validatePlugins } from "./plugins/validate";
import { queueLoop } from "./queue_loop";
import startServer from "./server";
import { isRegExp } from "./types/utility";

export function onConfigLoad(config: IConfig): void {
  validatePlugins(config);
  checkUnusedPlugins(config);

  logger.message("Registered plugins", Object.keys(config.PLUGINS));
  logger.log(config);

  if (config.EXCLUDE_FILES && config.EXCLUDE_FILES.length) {
    for (const regStr of config.EXCLUDE_FILES) {
      if (!isRegExp(regStr)) {
        logger.error(`Invalid regex: '${regStr}'.`);
        process.exit(1);
      }
    }
  }

  validateFFMPEGPaths(config);

  ffmpeg.setFfmpegPath(config.FFMPEG_PATH);
  ffmpeg.setFfprobePath(config.FFPROBE_PATH);

  logger.message("FFMPEG set to " + config.FFMPEG_PATH);
  logger.message("FFPROBE set to " + config.FFPROBE_PATH);
}

async function startup() {
  logger.log("Startup...");

  printMaxMemory();

  await checkConfig();
  const config = getConfig();

  // TODO: validate config

  onConfigLoad(config);

  if (args["process-queue"] === true) {
    await queueLoop(config);
  } else {
    if (args["update-gianna"]) {
      await deleteGianna();
    }
    const promptPassword =
      !args["no-password"] && !!config.PASSWORD && process.env.NODE_ENV !== "development";
    if (promptPassword) {
      let password: string;
      do {
        password = (
          await inquirer.prompt<{ password: string }>([
            {
              type: "password",
              name: "password",
              message: "Enter password",
            },
          ])
        ).password;
      } while (sha512(password) !== config.PASSWORD);
    }

    if (args["update-gianna"]) {
      await deleteGianna();
    }

    if (args["update-izzy"]) {
      await deleteIzzy();
    }

    try {
      let downloadedBins = 0;
      downloadedBins += await ensureIzzyExists();
      downloadedBins += await ensureGiannaExists();
      if (downloadedBins > 0) {
        logger.success("Binaries downloaded. Please restart.");
        process.exit(0);
      }
      applyExitHooks();
      startServer().catch((err) => {
        const _err = err as Error;
        logger.error(_err.message);
      });
    } catch (err) {
      const _err = err as Error;
      logger.log(_err);
      logger.error(_err.message);
      process.exit(1);
    }
  }
}

if (!process.env.PREVENT_STARTUP) {
  startup().catch((err) => {
    const _err = err as Error;
    logger.error(_err.message);
  });
}
