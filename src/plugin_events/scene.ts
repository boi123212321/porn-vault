import Scene from "../types/scene";
import { runPluginsSerial } from "../plugins";
import { isValidUrl, libraryPath } from "../types/utility";
import {
  extractLabels,
  extractStudios,
  extractActors,
  extractFields
} from "../extractor";
import { getConfig } from "../config";
import { extname } from "path";
import { downloadFile } from "../ffmpeg-download";
import Image from "../types/image";
import * as database from "../database/index";
import * as logger from "../logger/index";
import Studio from "../types/studio";
import Label from "../types/label";
import Actor from "../types/actor";
import { onActorCreate } from "./actor";
import { indices } from "../search/index";
import { createActorSearchDoc } from "../search/actor";
import { createImageSearchDoc } from "../search/image";

// This function has side effects
export async function onSceneCreate(
  scene: Scene,
  sceneLabels: string[],
  sceneActors: string[],
  event="sceneCreated"
) {
  const config = getConfig();

  const pluginResult = await runPluginsSerial(config, event, {
    sceneName: scene.name,
    scenePath: scene.path,
    $createImage: async (url: string, name: string, thumbnail?: boolean) => {
      // if (!isValidUrl(url)) throw new Error(`Invalid URL: ` + url);
      const img = new Image(name);
      if (thumbnail) img.name += " (thumbnail)";
      const ext = extname(url);
      const path = libraryPath(`images/${img._id}${ext}`);
      await downloadFile(url, path);
      img.path = path;
      img.scene = scene._id;
      logger.log("Created image " + img._id);
      await database.insert(database.store.images, img);
      if (!thumbnail) indices.images.add(await createImageSearchDoc(img));
      return img._id;
    }
  });

  if (
    typeof pluginResult.thumbnail == "string" &&
    pluginResult.thumbnail.startsWith("im_")
  )
    scene.thumbnail = pluginResult.thumbnail;

  if (typeof pluginResult.name === "string") scene.name = pluginResult.name;

  if (typeof pluginResult.description === "string")
    scene.description = pluginResult.description;

  if (typeof pluginResult.releaseDate === "number")
    scene.releaseDate = new Date(pluginResult.releaseDate).valueOf();

  if (pluginResult.custom && typeof pluginResult.custom === "object") {
    for (const key in pluginResult.custom) {
      const fields = await extractFields(key);
      if (fields.length) scene.customFields[fields[0]] = pluginResult[key];
    }
  }

  if (pluginResult.actors && Array.isArray(pluginResult.actors)) {
    const actorIds = [] as string[];
    for (const actorName of pluginResult.actors) {
      const extractedIds = await extractActors(actorName);
      if (extractedIds.length) actorIds.push(...extractedIds);
      else if (config.CREATE_MISSING_ACTORS) {
        let actor = new Actor(actorName);
        actorIds.push(actor._id);
        actor = await onActorCreate(actor, []);
        await database.insert(database.store.actors, actor);
        indices.actors.add(await createActorSearchDoc(actor));
        logger.log("Created actor " + actor.name);
      }
    }
    sceneActors.push(...actorIds);
  }

  if (pluginResult.labels && Array.isArray(pluginResult.labels)) {
    const labelIds = [] as string[];
    for (const labelName of pluginResult.labels) {
      const extractedIds = await extractLabels(labelName);
      if (extractedIds.length) labelIds.push(...extractedIds);
      else if (config.CREATE_MISSING_LABELS) {
        const label = new Label(labelName);
        labelIds.push(label._id);
        await database.insert(database.store.labels, label);
        logger.log("Created label " + label.name);
      }
    }
    sceneLabels.push(...labelIds);
  }

  if (
    !scene.studio &&
    pluginResult.studio &&
    typeof pluginResult.studio === "string"
  ) {
    const studioId = (await extractStudios(pluginResult.studio))[0];

    if (studioId) scene.studio = studioId;
    else if (config.CREATE_MISSING_STUDIOS) {
      const studio = new Studio(pluginResult.studio);
      scene.studio = studio._id;
      await database.insert(database.store.studios, studio);
      logger.log("Created studio " + studio.name);
    }
  }

  return scene;
}
