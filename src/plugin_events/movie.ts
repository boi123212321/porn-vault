import { runPluginsSerial } from "../plugins/index";
import { libraryPath } from "../types/utility";
import { extractLabels, extractFields } from "../extractor";
import { getConfig } from "../config";
import { extname } from "path";
import { downloadFile } from "../ffmpeg-download";
import Image from "../types/image";
import * as database from "../database/index";
import * as logger from "../logger";
import { indices } from "../search/index";
import { createImageSearchDoc } from "../search/image";
import Label from "../types/label";
import Movie from "../types/movie";

// This function has side effects
export async function onMovieCreate(
  movie: Movie,
  movieLabels: string[],
  event = "movieCreated"
) {
  const config = getConfig();

  const pluginResult = await runPluginsSerial(config, event, {
    movieName: movie.name,
    $createLocalImage: async (
      path: string,
      name: string,
      thumbnail?: boolean
    ) => {
      logger.log("Creating image from " + path);
      const img = new Image(name);
      if (thumbnail) img.name += " (thumbnail)";
      img.path = path;
      logger.log("Created image " + img._id);
      await database.insert(database.store.images, img);
      if (!thumbnail) indices.images.add(await createImageSearchDoc(img));
      return img._id;
    },
    $createImage: async (url: string, name: string, thumbnail?: boolean) => {
      // if (!isValidUrl(url)) throw new Error(`Invalid URL: ` + url);
      logger.log("Creating image from " + url);
      const img = new Image(name);
      if (thumbnail) img.name += " (thumbnail)";
      const ext = extname(url);
      const path = libraryPath(`images/${img._id}${ext}`);
      await downloadFile(url, path);
      img.path = path;
      logger.log("Created image " + img._id);
      await database.insert(database.store.images, img);
      if (!thumbnail) indices.images.add(await createImageSearchDoc(img));
      return img._id;
    }
  });

  if (
    typeof pluginResult.frontCover == "string" &&
    pluginResult.frontCover.startsWith("im_")
  )
    movie.frontCover = pluginResult.frontCover;

  if (
    typeof pluginResult.backCover == "string" &&
    pluginResult.backCover.startsWith("im_")
  )
    movie.backCover = pluginResult.backCover;

  if (typeof pluginResult.name === "string") movie.name = pluginResult.name;

  if (typeof pluginResult.releaseDate === "number")
    movie.releaseDate = new Date(pluginResult.releaseDate).valueOf();

  if (pluginResult.custom && typeof pluginResult.custom === "object") {
    for (const key in pluginResult.custom) {
      const fields = await extractFields(key);
      if (fields.length) movie.customFields[fields[0]] = pluginResult[key];
    }
  }

  if (pluginResult.labels && Array.isArray(pluginResult.labels)) {
    const labelIds = [] as string[];
    for (const labelName of pluginResult.labels) {
      const extractedIds = await extractLabels(labelName);
      if (extractedIds.length) {
        labelIds.push(...extractedIds);
        logger.log(`Found ${extractedIds.length} labels for ${labelName}:`);
        logger.log(extractedIds);
      } else if (config.CREATE_MISSING_LABELS) {
        const label = new Label(labelName);
        labelIds.push(label._id);
        await database.insert(database.store.labels, label);
        logger.log("Created label " + label.name);
      }
    }
    movieLabels.push(...labelIds);
  }

  return movie;
}
