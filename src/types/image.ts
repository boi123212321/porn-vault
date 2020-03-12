import * as database from "../database";
import { generateHash } from "../hash";
import Actor from "./actor";
import Label from "./label";
import * as logger from "../logger";
import { unlinkAsync } from "../fs/async";
import { mapAsync } from "./utility";
import CrossReference from "./cross_references";
import Vibrant from "node-vibrant";

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
  customFields: any = {};
  labels?: string[]; // backwards compatibility
  meta = new ImageMeta();
  actors?: string[];
  studio: string | null = null;
  hash: string | null = null;
  color: string | null = null;

  static async filterCustomField(fieldId: string) {
    await database.update(
      database.store.images,
      {},
      { $unset: { [`customFields.${fieldId}`]: true } }
    );
  }

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
            database
              .update(
                database.store.images,
                { _id: image._id },
                { $set: { color } }
              )
              .catch(err => {});
          }
        } catch (err) {
          logger.error(image.path, err);
        }
      })();
    }

    return null;
  }

  static async checkIntegrity() {
    const allImages = await Image.getAll();

    for (const image of allImages) {
      const imageId = image._id.startsWith("im_")
        ? image._id
        : `im_${image._id}`;

      if (image.actors && image.actors.length) {
        for (const actor of image.actors) {
          const actorId = actor.startsWith("ac_") ? actor : `ac_${actor}`;

          if (!!(await CrossReference.get(imageId, actorId))) {
            logger.log(
              `Cross reference ${imageId} -> ${actorId} already exists.`
            );
          } else {
            const cr = new CrossReference(imageId, actorId);
            await database.insert(database.store.crossReferences, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (image.labels && image.labels.length) {
        for (const label of image.labels) {
          const labelId = label.startsWith("la_") ? label : `la_${label}`;

          if (!!(await CrossReference.get(imageId, labelId))) {
            logger.log(
              `Cross reference ${imageId} -> ${labelId} already exists.`
            );
          } else {
            const cr = new CrossReference(imageId, labelId);
            await database.insert(database.store.crossReferences, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (!image._id.startsWith("im_")) {
        const newImage = JSON.parse(JSON.stringify(image)) as Image;
        newImage._id = imageId;
        if (newImage.actors) delete newImage.actors;
        if (newImage.labels) delete newImage.labels;
        if (image.scene && !image.scene.startsWith("sc_")) {
          newImage.scene = "sc_" + image.scene;
        }
        if (image.studio && !image.studio.startsWith("st_")) {
          newImage.studio = "st_" + image.studio;
        }
        await database.insert(database.store.images, newImage);
        await database.remove(database.store.images, { _id: image._id });
        logger.log(`Changed image ID: ${image._id} -> ${imageId}`);
      } else {
        if (image.studio && !image.studio.startsWith("st_")) {
          await database.update(
            database.store.images,
            { _id: imageId },
            { $set: { studio: "st_" + image.studio } }
          );
        }
        if (image.scene && !image.scene.startsWith("sc_")) {
          await database.update(
            database.store.images,
            { _id: imageId },
            { $set: { scene: "sc_" + image.scene } }
          );
        }
        if (image.actors)
          await database.update(
            database.store.images,
            { _id: imageId },
            { $unset: { actors: true } }
          );
        if (image.labels)
          await database.update(
            database.store.images,
            { _id: imageId },
            { $unset: { labels: true } }
          );
      }
    }
  }

  static async remove(image: Image) {
    await database.remove(database.store.images, { _id: image._id });
    try {
      if (image.path) await unlinkAsync(image.path);
    } catch (error) {
      logger.warn("Could not delete source file for image " + image._id);
    }
  }

  static async filterStudio(studioId: string) {
    await database.update(
      database.store.images,
      { studio: studioId },
      { $set: { studio: null } }
    );
  }

  static async filterScene(scene: string) {
    await database.update(
      database.store.images,
      { scene },
      { $set: { scene: null } }
    );
  }

  static async filterActor(actor: string) {
    await database.update(
      database.store.images,
      {},
      { $pull: { actors: actor } }
    );
  }

  static async getByScene(id: string) {
    return (await database.find(database.store.images, {
      scene: id
    })) as Image[];
  }

  static async getByActor(id: string) {
    const references = await CrossReference.getByDest(id);
    return (
      await mapAsync(
        references.filter(r => r.from.startsWith("im_")),
        r => Image.getById(r.from)
      )
    ).filter(Boolean) as Image[];
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.images, {
      _id
    })) as Image | null;
  }

  static async getAll() {
    return (await database.find(database.store.images, {})) as Image[];
  }

  static async getActors(image: Image) {
    const references = await CrossReference.getBySource(image._id);

    return (
      await mapAsync(
        references.filter(r => r.to && r.to.startsWith("ac_")),
        r => Actor.getById(r.to)
      )
    ).filter(Boolean) as Actor[];
  }

  static async setActors(image: Image, actorIds: string[]) {
    const references = await CrossReference.getBySource(image._id);

    const oldActorReferences = references
      .filter(r => r.to && r.to.startsWith("ac_"))
      .map(r => r._id);

    for (const id of oldActorReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(actorIds)]) {
      const crossReference = new CrossReference(image._id, id);
      logger.log("Adding actor to image: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async setLabels(image: Image, labelIds: string[]) {
    const references = await CrossReference.getBySource(image._id);

    const oldLabelReferences = references
      .filter(r => r.to && r.to.startsWith("la_"))
      .map(r => r._id);

    for (const id of oldLabelReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(labelIds)]) {
      const crossReference = new CrossReference(image._id, id);
      logger.log("Adding label to image: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async getLabels(image: Image) {
    const references = await CrossReference.getBySource(image._id);
    return (
      await mapAsync(
        references.filter(r => r.to && r.to.startsWith("la_")),
        r => Label.getById(r.to)
      )
    ).filter(Boolean) as Label[];
  }

  static async getImageByPath(path: string) {
    return (await database.findOne(database.store.images, {
      path
    })) as Image | null;
  }

  constructor(name: string) {
    this._id = "im_" + generateHash();
    this.name = name.trim();
  }
}
