import { runPluginsSerial } from "../plugins/index";
import { libraryPath } from "../types/utility";
import { extractFields, extractStudios } from "../extractor";
import { getConfig } from "../config";
import { extname } from "path";
import { downloadFile } from "../ffmpeg-download";
import Image from "../types/image";
import * as logger from "../logger";
import { indexImages } from "../search/image";
import Movie from "../types/movie";
import { imageCollection, studioCollection } from "../database/index";
import Studio from "../types/studio";
import { createStudioSearchDoc } from "../search/studio";
import { indices } from "../search";

// This function has side effects
export async function onMovieCreate(movie: Movie, event = "movieCreated") {
  const config = getConfig();

  const pluginResult = await runPluginsSerial(config, event, {
    movie: JSON.parse(JSON.stringify(movie)),
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
      // await database.insert(database.store.images, img);
      await imageCollection.upsert(img._id, img);
      if (!thumbnail) {
        await indexImages([img]);
      }
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
      // await database.insert(database.store.images, img);
      await imageCollection.upsert(img._id, img);
      if (!thumbnail) {
        await indexImages([img]);
      }
      return img._id;
    },
  });

  if (
    typeof pluginResult.frontCover == "string" &&
    pluginResult.frontCover.startsWith("im_") &&
    (!movie.frontCover || config.ALLOW_PLUGINS_OVERWRITE_MOVIE_THUMBNAILS)
  )
    movie.frontCover = pluginResult.frontCover;

  if (
    typeof pluginResult.backCover == "string" &&
    pluginResult.backCover.startsWith("im_") &&
    (!movie.backCover || config.ALLOW_PLUGINS_OVERWRITE_MOVIE_THUMBNAILS)
  )
    movie.backCover = pluginResult.backCover;

  if (
    typeof pluginResult.spineCover == "string" &&
    pluginResult.spineCover.startsWith("im_") &&
    (!movie.spineCover || config.ALLOW_PLUGINS_OVERWRITE_MOVIE_THUMBNAILS)
  )
    movie.spineCover = pluginResult.spineCover;

  if (typeof pluginResult.name === "string") movie.name = pluginResult.name;

  if (typeof pluginResult.description === "string")
    movie.description = pluginResult.description;

  if (typeof pluginResult.releaseDate === "number")
    movie.releaseDate = new Date(pluginResult.releaseDate).valueOf();

  const ra = pluginResult.rating;
  if (typeof ra === "number" && ra >= 0 && ra <= 10 && Number.isInteger(ra))
    movie.rating = pluginResult.rating;

  if (typeof pluginResult.favorite === "boolean")
    movie.favorite = pluginResult.favorite;

  if (typeof pluginResult.bookmark === "number")
    movie.bookmark = pluginResult.bookmark;

  if (pluginResult.custom && typeof pluginResult.custom === "object") {
    for (const key in pluginResult.custom) {
      const fields = await extractFields(key);
      if (fields.length)
        movie.customFields[fields[0]] = pluginResult.custom[key];
    }
  }

  if (
    !movie.studio &&
    pluginResult.studio &&
    typeof pluginResult.studio === "string"
  ) {
    const studioId = (await extractStudios(pluginResult.studio))[0];

    if (studioId) movie.studio = studioId;
    else if (config.CREATE_MISSING_STUDIOS) {
      const studio = new Studio(pluginResult.studio);
      movie.studio = studio._id;
      await studioCollection.upsert(studio._id, studio);
      indices.studios.add(await createStudioSearchDoc(studio));
      logger.log("Created studio " + studio.name);
    }
  }

  return movie;
}
