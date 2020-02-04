import "./database";
import startServer from "./server";
import { checkConfig, getConfig, IConfig } from "./config/index";
import inquirer from "inquirer";
import { existsAsync } from "./fs/async";
const sha = require("js-sha512").sha512;
import * as logger from "./logger/index";
import v8 from "v8";
import { isRegExp } from "./types/utility";
import ffmpeg from "fluent-ffmpeg";
import { existsSync, lstatSync } from "fs";

logger.message(
  `Max. memory: ${Math.round(
    v8.getHeapStatistics().total_available_size / 1024 / 1024
  )} MB`
);

const isDirectory = (path: string) => lstatSync(path).isDirectory();

function validatePlugins(config: IConfig) {
  for (const name in config.PLUGINS) {
    const plugin = config.PLUGINS[name];
    const path = plugin.path;

    if (!path) {
      logger.error(`missing plugin path for '${name}'.`);
      process.exit(1);
    }

    if (!existsSync(path) || isDirectory(path)) {
      logger.error(`plugin definition for '${name}' not found (missing file).`);
      process.exit(1);
    }
  }

  for (const event of Object.values(config.PLUGIN_EVENTS)) {
    for (const pluginName of event) {
      if (config.PLUGINS[pluginName] === undefined) {
        logger.error(`Undefined plugin '${pluginName}' in use`);
        process.exit(1);
      }
    }
  }

  for (const pluginName of Object.keys(config.PLUGINS)) {
    let pluginUsed = false;
    for (const event of Object.values(config.PLUGIN_EVENTS)) {
      if (event.some(name => name == pluginName)) pluginUsed = true;
    }
    if (!pluginUsed) logger.warn(`Unused plugin '${pluginName}'`);
  }
}

(async () => {
  await checkConfig();
  const config = getConfig();

  // TODO: validate config

  validatePlugins(config);

  if (config.EXCLUDE_FILES && config.EXCLUDE_FILES.length) {
    for (const regStr of config.EXCLUDE_FILES) {
      if (!isRegExp(regStr)) {
        logger.error(`Invalid regex: '${regStr}'.`);
        process.exit(1);
      }
    }
  }

  logger.message("Registered plugins", Object.keys(config.PLUGINS));

  logger.log(config);

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

  if (config.FFMPEG_PATH) {
    const found = await existsAsync(config.FFMPEG_PATH);
    if (!found) {
      logger.error(`FFMPEG binary not found at ${config.FFMPEG_PATH}`);
      process.exit(1);
    }
  } else {
    logger.error(`No FFMPEG path defined in config.json`);
    process.exit(1);
  }

  if (config.FFPROBE_PATH) {
    const found = await existsAsync(config.FFPROBE_PATH);
    if (!found) {
      logger.error(`FFPROBE binary not found at ${config.FFPROBE_PATH}`);
      process.exit(1);
    }
  } else {
    logger.error(`No FFPROBE path defined in config.json`);
    process.exit(1);
  }

  ffmpeg.setFfmpegPath(config.FFMPEG_PATH);
  ffmpeg.setFfprobePath(config.FFPROBE_PATH);

  logger.message("FFMPEG set to " + config.FFMPEG_PATH);
  logger.message("FFPROBE set to " + config.FFPROBE_PATH);

  startServer();
})();
