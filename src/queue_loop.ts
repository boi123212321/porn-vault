import * as logger from "./logger";
import Axios from "axios";
import Scene from "./types/scene";
import Image from "./types/image";
import { statAsync } from "./fs/async";
import { IConfig } from "./config/index";

async function getQueueHead(config: IConfig) {
  logger.log("Getting queue head...");
  return (
    await Axios.get(
      `http://localhost:${config.PORT}/queue/head?password=${config.PASSWORD}`
    )
  ).data;
}

export async function queueLoop(config: IConfig) {
  let queueHead = (await getQueueHead(config)) as Scene;

  while (!!queueHead) {
    logger.log("Processing " + queueHead.path + "...");
    try {
      let data = {
        processed: true,
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
      } else {
        logger.message("Skipping preview generation");
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
      } else {
        logger.message("Skipping screenshot generation");
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
    queueHead = await getQueueHead(config);
  }

  logger.success("Processing done.");
  process.exit(0);
}
