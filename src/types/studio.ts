import * as database from "../database";
import { generateHash } from "../hash";
import Label from "./label";
import Actor from "./actor";
import Scene from "./scene";
import Movie from "./movie";
import { mapAsync } from "./utility";
import * as logger from "../logger";
import { labelledItemCollection } from "../database";
import LabelledItem from "./labelled_item";

export default class Studio {
  _id: string;
  name: string;
  description: string | null = null;
  thumbnail: string | null = null;
  addedOn: number = +new Date();
  favorite: boolean = false;
  bookmark: number | null = null;
  parent: string | null = null;
  labels?: string[]; // backwards compatibility
  aliases?: string[];

  static async checkIntegrity() {}

  constructor(name: string) {
    this._id = "st_" + generateHash();
    this.name = name;
  }

  static async remove(studio: Studio) {
    await database.remove(database.store.studios, { _id: studio._id });
  }

  static async filterStudio(studioId: string) {
    await database.update(
      database.store.studios,
      { parent: studioId },
      { $set: { parent: null } }
    );
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.studios, {
      _id,
    })) as Studio | null;
  }

  static async getAll() {
    return (await database.find(database.store.studios, {})) as Studio[];
  }

  static async getScenes(studio: Studio): Promise<Scene[]> {
    const scenes = await Scene.getByStudio(studio._id);
    const subStudios = await Studio.getSubStudios(studio._id);

    const scenesOfSubStudios = (
      await Promise.all(subStudios.map((child) => Studio.getScenes(child)))
    ).flat();

    return scenes.concat(scenesOfSubStudios);
  }

  static async getMovies(studio: Studio): Promise<Movie[]> {
    const movies = await Movie.getByStudio(studio._id);

    const moviesOfSubStudios = (
      await Promise.all(
        (await Studio.getSubStudios(studio._id)).map((child) =>
          Studio.getMovies(child)
        )
      )
    ).flat();

    return movies.concat(moviesOfSubStudios);
  }

  static async getSubStudios(studioId: string) {
    return (await database.find(database.store.studios, {
      parent: studioId,
    })) as Studio[];
  }

  static async getActors(studio: Studio) {
    const scenes = await Studio.getScenes(studio);
    const actorIds = [
      ...new Set(
        (await mapAsync(scenes, Scene.getActors)).flat().map((a) => a._id)
      ),
    ];
    return (await mapAsync(actorIds, Actor.getById)).filter(Boolean) as Actor[];
  }

  static async setLabels(studio: Studio, labelIds: string[]) {
    const references = await LabelledItem.getByItem(studio._id);

    const oldLabelReferences = references.map((r) => r._id);

    for (const id of oldLabelReferences) {
      await labelledItemCollection.remove(id);
    }

    for (const id of [...new Set(labelIds)]) {
      const labelledItem = new LabelledItem(studio._id, id, "studio");
      logger.log("Adding label to studio: " + JSON.stringify(labelledItem));
      await labelledItemCollection.upsert(labelledItem._id, labelledItem);
    }
  }

  static async getLabels(studio: Studio) {
    const references = await LabelledItem.getByItem(studio._id);
    return (await mapAsync(references, (r) => Label.getById(r.label))).filter(
      Boolean
    ) as Label[];
  }

  static async inferLabels(studio: Studio) {
    const scenes = await Studio.getScenes(studio);
    const labelIds = [...new Set(scenes.map((scene) => scene.labels).flat())];
    return (await mapAsync(labelIds, Label.getById)).filter(Boolean) as Label[];
  }
}
