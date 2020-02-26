import "./database";
import startServer from "./server";
import { checkConfig, getConfig, IConfig } from "./config/index";
import inquirer from "inquirer";
import * as logger from "./logger";
import { isRegExp } from "./types/utility";
import ffmpeg from "fluent-ffmpeg";
import { validatePlugins, checkUnusedPlugins } from "./plugins/validate";
import { printMaxMemory } from "./mem";
import { validateFFMPEGPaths } from "./config/validate";
const sha = require("js-sha512").sha512;

export async function onConfigLoad(config: IConfig) {
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

printMaxMemory();

(async () => {
  await checkConfig();
  const config = getConfig();

  // TODO: validate config

  await onConfigLoad(config);

  if (config.PASSWORD && process.env.NODE_ENV != "development") {
    let password;
    do {
      password = (
        await inquirer.prompt([
          {
            type: "password",
            name: "password",
            message: "Enter password"
          }
        ])
      ).password;
    } while (sha(password) != config.PASSWORD);
  }

  startServer();
})();
