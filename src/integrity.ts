import { existsAsync } from "./fs/async";
import Scene from "./types/scene";
import Image from "./types/image";
import * as database from "./database/index";
import * as logger from "./logger";
import { getConfig } from "./config/index";
import fs from "fs";
import readline from "readline";

export function bookmarksToTimestamp(file: string) {
  if (!fs.existsSync(file)) return;

  let lines = [] as string[];
  let modified = false;

  logger.log("Replacing bookmarks with timestamps in " + file);

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(file),
      output: process.stdout,
      terminal: false
    });

    rl.on("line", line => {
      const item = JSON.parse(line);
      if (item.bookmark !== undefined) {
        if (typeof item.bookmark == "boolean") {
          if (item.bookmark) item.bookmark = item.addedOn;
          else item.bookmark = null;
          modified = true;
        }
      } else {
        logger.log("Bookmarks already timestamp... aborting");
        return rl.close();
      }
      lines.push(JSON.stringify(item));
    });

    rl.on("close", () => {
      if (modified) {
        fs.unlinkSync(file);
        for (const line of lines) {
          fs.appendFileSync(file, line + "\n");
        }
      }
      resolve();
    });
  });
}

export async function checkSceneSources() {
  logger.log("Checking scene sources...");
  const scenes = await Scene.getAll();
  const config = getConfig();
  let removedReferences = 0;
  const removedScenes = [] as string[];

  for (const scene of scenes) {
    if (scene.path != null) {
      const sourceExists = await existsAsync(scene.path);

      if (!sourceExists) {
        if (config.REMOVE_DANGLING_FILE_REFERENCES === true) {
          await database.update(
            database.store.scenes,
            { _id: scene._id },
            { $set: { path: null } }
          );
          logger.log(
            `Removed file reference from ${scene._id} (${scene.path})`
          );
        }
        removedScenes.push(scene.path);
        removedReferences++;
      }
    }
  }

  if (config.REMOVE_DANGLING_FILE_REFERENCES === true)
    logger.log(`Removed ${removedReferences}/${scenes.length} references.`);
  else if (removedReferences > 0) {
    logger.warn(
      `REMOVE_DANGLING_FILE_REFERENCES would have removed ${removedReferences} video references. However, the changes are not committed, because the option is disabled in config.json:`
    );
    logger.warn(removedScenes);
  }
  logger.log("Scene source check done.");
}

export async function checkImageSources() {
  logger.log("Checking image sources...");
  const images = await Image.getAll();
  const config = getConfig();
  let removedReferences = 0;
  const removedImages = [] as string[];

  for (const image of images) {
    if (image.path != null) {
      const sourceExists = await existsAsync(image.path);

      if (!sourceExists) {
        if (config.REMOVE_DANGLING_FILE_REFERENCES) {
          await database.remove(database.store.images, { _id: image._id });
          logger.log("Removed image " + image._id);
        }
        removedImages.push(image.path);
        removedReferences++;
      }
    } else {
      await database.remove(database.store.images, { _id: image._id });
      logger.log("Removed image " + image._id);
    }
  }

  if (config.REMOVE_DANGLING_FILE_REFERENCES === true)
    logger.log(`Removed ${removedReferences}/${images.length} references.`);
  else if (removedReferences > 0) {
    logger.warn(
      `REMOVE_DANGLING_FILE_REFERENCES would have removed ${removedReferences} images. However, the changes are not committed, because the option is disabled in config.json:`
    );
    logger.warn(removedImages);
  }
  logger.log("Image source check done.");
}
