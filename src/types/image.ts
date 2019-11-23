import * as database from "../database";
import { generateHash } from "../hash";
import Actor from "./actor";
import Label from "./label";

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
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  labels: string[] = [];
  meta = new ImageMeta();
  actors: string[] = [];
  studio: string | null = null;
  hash: string | null = null;

  static async remove(image: Image) {
    await database.remove(database.store.images, { _id: image._id });
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

  static async filterLabel(label: string) {
    await database.update(
      database.store.images,
      {},
      { $pull: { labels: label } }
    );
  }

  static async getByScene(id: string) {
    return (await database.find(database.store.images, {
      scenes: id
    })) as Image[];
  }

  static async getByActor(id: string) {
    return (await database.find(database.store.images, {
      actors: id
    })) as Image[];
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
    const actors = [] as Actor[];

    for (const id of image.actors) {
      const actor = await Actor.getById(id);
      if (actor) actors.push(actor);
    }

    return actors;
  }

  static async getLabels(image: Image) {
    const labels = [] as Label[];

    for (const id of image.labels) {
      const label = await Label.getById(id);
      if (label) labels.push(label);
    }

    return labels;
  }

  static async getImageByPath(path: string) {
    return (await Image.getAll()).filter(image => image.path == path)[0];
  }

  constructor(name: string) {
    this._id = generateHash();
    this.name = name.trim();
  }
}
