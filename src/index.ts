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
import { ensureTwigsExists } from "./twigs";
const sha = require("js-sha512").sha512;
import args from "./args";
import Axios from "axios";
import Scene from "./types/scene";
import Image from "./types/image";
import { statAsync } from "./fs/async";

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

  if (args["process-queue"] === true) {
    async function getQueueHead() {
      return (
        await Axios.get(
          `http://localhost:${config.PORT}/queue/head?password=${config.PASSWORD}`
        )
      ).data;
    }

    let queueHead = (await getQueueHead()) as Scene;

    while (!!queueHead) {
      try {
        let data = {
          processed: true
        } as any;
        let images = [] as any[];
        let thumbs = [] as any[];

        if (config.GENERATE_PREVIEWS && !queueHead.preview) {
          const preview = await Scene.generatePreview(queueHead);

          if (preview) {
            let image = new Image(queueHead.name + " (preview)");
            const stats = await statAsync(preview);
            image.path = preview;
            image.scene = queueHead._id;
            image.meta.size = stats.size;
            thumbs.push(image);
            data.preview = image._id;
          } else {
            logger.error(`Error generating preview.`);
          }
        }

        if (config.GENERATE_SCREENSHOTS) {
          let screenshots = [] as any[];
          try {
            screenshots = await Scene.generateThumbnails(queueHead);
          } catch (error) {
            logger.error(error);
          }
          for (let i = 0; i < screenshots.length; i++) {
            const file = screenshots[i];
            const image = new Image(`${queueHead.name} ${i + 1} (screenshot)`);
            image.addedOn += i;
            image.path = file.path;
            image.scene = queueHead._id;
            image.meta.size = file.size;
            images.push(image);
          }
        }
        await Axios.post(
          `http://localhost:${config.PORT}/queue/${queueHead._id}?password=${config.PASSWORD}`,
          { scene: data, thumbs, images }
        );
      } catch (error) {
        logger.error("PROCESSING ERROR");
        logger.log(error);
        logger.error(error.message);
        await Axios.delete(
          `http://localhost:${config.PORT}/queue/${queueHead._id}?password=${config.PASSWORD}`
        );
      }
      queueHead = await getQueueHead();
    }

    logger.success("Processing done.");
    process.exit(0);
  } else {
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

    await ensureTwigsExists();
    startServer();
  }
})();
