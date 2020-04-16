import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import * as logger from "../logger";
import { mapAsync, libraryPath } from "./utility";
import Label from "./label";
import Image from "./image";
import * as path from "path";
import { singleScreenshot } from "../ffmpeg/screenshot";
import { imageCollection, labelledItemCollection } from "../database";
import LabelledItem from "./labelled_item";

export default class Marker {
  _id: string;
  name: string;
  addedOn = +new Date();
  favorite: boolean = false;
  bookmark: number | null = null; // TODO: replace with timestamp
  rating: number = 0;
  customFields: any = {};
  scene: string;
  time: number; // Time in scene in seconds
  thumbnail?: string | null = null;

  static async getAll() {
    return (await database.find(database.store.markers, {})) as Marker[];
  }

  static async checkIntegrity() {
    const allMarkers = await Marker.getAll();

    for (const marker of allMarkers) {
      const markerId = marker._id.startsWith("st_")
        ? marker._id
        : `st_${marker._id}`;

      if (!marker.thumbnail) {
        await this.createMarkerThumbnail(marker);
      }
    }
  }

  static async createMarkerThumbnail(marker: Marker) {
    const scene = await Scene.getById(marker.scene);
    if (!scene || !scene.path) return;

    logger.log("Creating thumbnail for marker " + marker._id);
    const image = new Image(`${marker.name} (thumbnail)`);
    const imagePath = path.join(libraryPath("thumbnails/"), image._id) + ".jpg";
    image.path = imagePath;
    image.scene = marker.scene;

    const actors = (await Scene.getActors(scene)).map((l) => l._id);
    await Image.setActors(image, actors);

    const labels = (await Marker.getLabels(marker)).map((l) => l._id);
    await Image.setLabels(image, labels);

    await singleScreenshot(scene.path, imagePath, marker.time + 15);
    // await database.insert(database.store.images, image);
    await imageCollection.upsert(image._id, image);
    await database.update(
      database.store.markers,
      { _id: marker._id },
      {
        $set: {
          thumbnail: image._id,
        },
      }
    );
  }

  static async setLabels(marker: Marker, labelIds: string[]) {
    const references = await LabelledItem.getByItem(marker._id);

    const oldLabelReferences = references.map((r) => r._id);

    for (const id of oldLabelReferences) {
      await labelledItemCollection.remove(id);
    }

    for (const id of [...new Set(labelIds)]) {
      const labelledItem = new LabelledItem(marker._id, id, "marker");
      logger.log("Adding label to marker: " + JSON.stringify(labelledItem));
      await labelledItemCollection.upsert(labelledItem._id, labelledItem);
    }
  }

  static async getLabels(marker: Marker) {
    const references = await LabelledItem.getByItem(marker._id);
    return (await mapAsync(references, (r) => Label.getById(r.label))).filter(
      Boolean
    ) as Label[];
  }

  constructor(name: string, scene: string, time: number) {
    this._id = "mk_" + generateHash();
    this.name = name;
    this.scene = scene;
    this.time = Math.round(time);
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.markers, {
      _id,
    })) as Marker | null;
  }

  static async remove(_id: string) {
    await database.remove(database.store.markers, { _id });
  }

  static async removeByScene(scene: Scene) {
    await database.remove(database.store.markers, { scene: scene._id });
  }
}
