import ffmpeg from "fluent-ffmpeg";
import inquirer from "inquirer";

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
import { isRegExp, sha512 } from "./types/utility";

export async function onConfigLoad(config: IConfig): Promise<void> {
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

  await validateFFMPEGPaths(config);

  ffmpeg.setFfmpegPath(config.FFMPEG_PATH);
  ffmpeg.setFfprobePath(config.FFPROBE_PATH);

  logger.message("FFMPEG set to " + config.FFMPEG_PATH);
  logger.message("FFPROBE set to " + config.FFPROBE_PATH);
}

if (!process.env.PREVENT_STARTUP)
  (async () => {
    printMaxMemory();

    await checkConfig();
    const config = getConfig();

    // TODO: validate config

    await onConfigLoad(config);

    if (args["process-queue"] === true) {
      await queueLoop(config);
    } else {
      if (config.PASSWORD && process.env.NODE_ENV !== "development") {
        let password;
        do {
          password = (
            await inquirer.prompt([
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
        startServer();
      } catch (err) {
        logger.log(err);
        logger.error(err.message);
        process.exit(1);
      }
    }
  })();
