import Actor from "../types/actor";
import { runPluginsSerial } from "../plugins/index";
import { libraryPath } from "../types/utility";
import { extractLabels, extractFields } from "../extractor";
import { getConfig } from "../config";
import { extname } from "path";
import { downloadFile } from "../ffmpeg-download";
import Image from "../types/image";
import * as database from "../database/index";
import * as logger from "../logger";
import { indexImages } from "../search/image";
import Label from "../types/label";

// This function has side effects
export async function onActorCreate(
  actor: Actor,
  actorLabels: string[],
  event = "actorCreated"
) {
  const config = getConfig();

  const pluginResult = await runPluginsSerial(config, event, {
    actor: JSON.parse(JSON.stringify(actor)),
    actorName: actor.name,
    $createLocalImage: async (
      path: string,
      name: string,
      thumbnail?: boolean
    ) => {
      logger.log("Creating image from " + path);
      const img = new Image(name);
      if (thumbnail) img.name += " (thumbnail)";
      img.path = path;
      await Image.setActors(img, [actor._id]);
      logger.log("Created image " + img._id);
      await database.insert(database.store.images, img);
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
      await Image.setActors(img, [actor._id]);
      logger.log("Created image " + img._id);
      await database.insert(database.store.images, img);
      if (!thumbnail) {
        await indexImages([img]);
      }
      return img._id;
    }
  });

  if (
    typeof pluginResult.thumbnail == "string" &&
    pluginResult.thumbnail.startsWith("im_") &&
    !actor.thumbnail
  )
    actor.thumbnail = pluginResult.thumbnail;

  if (
    typeof pluginResult.hero == "string" &&
    pluginResult.hero.startsWith("im_") &&
    !actor.hero
  )
    actor.hero = pluginResult.hero;

  if (
    typeof pluginResult.altThumbnail == "string" &&
    pluginResult.altThumbnail.startsWith("im_") &&
    !actor.altThumbnail
  )
    actor.altThumbnail = pluginResult.altThumbnail;

  if (
    typeof pluginResult.avatar == "string" &&
    pluginResult.avatar.startsWith("im_") &&
    !actor.avatar
  )
    actor.avatar = pluginResult.avatar;

  if (typeof pluginResult.name === "string") actor.name = pluginResult.name;

  if (typeof pluginResult.description === "string")
    actor.description = pluginResult.description;

  if (typeof pluginResult.bornOn === "number")
    actor.bornOn = new Date(pluginResult.bornOn).valueOf();

  if (pluginResult.aliases && Array.isArray(pluginResult.aliases)) {
    actor.aliases.push(...pluginResult.aliases);
    actor.aliases = [...new Set(actor.aliases)];
  }

  if (pluginResult.custom && typeof pluginResult.custom === "object") {
    for (const key in pluginResult.custom) {
      const fields = await extractFields(key);
      if (fields.length)
        actor.customFields[fields[0]] = pluginResult.custom[key];
    }
  }

  const ra = pluginResult.rating;
  if (typeof ra === "number" && ra >= 0 && ra <= 10 && Number.isInteger(ra))
    actor.rating = pluginResult.rating;

  if (typeof pluginResult.favorite === "boolean")
    actor.favorite = pluginResult.favorite;

  if (typeof pluginResult.bookmark === "number")
    actor.bookmark = pluginResult.bookmark;

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
    actorLabels.push(...labelIds);
  }

  return actor;
}
