import { generateHash } from "../hash";
import Label from "./label";
import * as logger from "../logger";
import { unlinkAsync } from "../fs/async";
import { mapAsync } from "./utility";
import Vibrant from "node-vibrant";
import {
  imageCollection,
  actorCollection,
  labelledItemCollection,
  actorReferenceCollection,
} from "../database";
import LabelledItem from "./labelled_item";
import ActorReference from "./actor_reference";

export class ImageDimensions {
  width: number | null = null;
  height: number | null = null;
}

export class ImageMeta {
  size: number | null = null;
  dimensions = new ImageDimensions();
}

export default class Image {
  _id: string;
  name: string;
  path: string | null = null;
  scene: string | null = null;
  addedOn = +new Date();
  favorite: boolean = false;
  bookmark: number | null = null;
  rating: number = 0;
  customFields: Record<string, any> = {};
  labels?: string[]; // backwards compatibility
  meta = new ImageMeta();
  actors?: string[];
  studio: string | null = null;
  hash: string | null = null;
  color: string | null = null;

  static async color(image: Image) {
    if (!image.path) return null;
    if (image.color) return image.color;

    if (image.path) {
      (async () => {
        if (!image.path) return;

        try {
          const palette = await Vibrant.from(image.path).getPalette();

          const color =
            palette.DarkVibrant?.getHex() ||
            palette.DarkMuted?.getHex() ||
            palette.Vibrant?.getHex() ||
            palette.Vibrant?.getHex();

          if (color) {
            image.color = color;
            imageCollection.upsert(image._id, image).catch((err) => {});
          }
        } catch (err) {
          logger.error(image.path, err);
        }
      })();
    }

    return null;
  }

  static async checkIntegrity() {}

  static async remove(image: Image) {
    await imageCollection.remove(image._id);
    try {
      if (image.path) await unlinkAsync(image.path);
    } catch (error) {
      logger.warn("Could not delete source file for image " + image._id);
    }
  }

  static async filterStudio(studioId: string) {
    for (const image of await Image.getAll()) {
      if (image.studio == studioId) {
        image.studio = null;
        await imageCollection.upsert(image._id, image);
      }
    }
  }

  static async filterScene(sceneId: string) {
    for (const image of await Image.getAll()) {
      if (image.scene == sceneId) {
        image.scene = null;
        await imageCollection.upsert(image._id, image);
      }
    }
  }

  static async getByScene(id: string) {
    return imageCollection.query("scene-index", id);
  }

  static async getById(_id: string) {
    return imageCollection.get(_id);
  }

  static async getAll() {
    return imageCollection.getAll();
  }

  static async getActors(image: Image) {
    const references = await ActorReference.getByItem(image._id);
    return (
      await actorCollection.getBulk(references.map((r) => r.actor))
    ).filter(Boolean);
  }

  static async setActors(image: Image, actorIds: string[]) {
    const references = await ActorReference.getByItem(image._id);

    const oldActorReferences = references.map((r) => r._id);

    for (const id of oldActorReferences) {
      await actorReferenceCollection.remove(id);
    }

    for (const id of [...new Set(actorIds)]) {
      const actorReference = new ActorReference(image._id, id, "image");
      logger.log("Adding actor to image: " + JSON.stringify(actorReference));
      await actorReferenceCollection.upsert(actorReference._id, actorReference);
    }
  }

  static async setLabels(image: Image, labelIds: string[]) {
    return Label.setForItem(image._id, labelIds, "image");
  }

  static async getLabels(image: Image) {
    return Label.getForItem(image._id);
  }

  static async getImageByPath(path: string) {
    return (
      await imageCollection.query("path-index", encodeURIComponent(path))
    )[0] as Image | undefined;
  }

  constructor(name: string) {
    this._id = "im_" + generateHash();
    this.name = name.trim();
  }
}
