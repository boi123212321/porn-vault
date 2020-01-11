import * as database from "../database";
import { generateHash } from "../hash";
import Label from "./label";
import Actor from "./actor";
import Scene from "./scene";
import Movie from "./movie";
import { mapAsync } from "./utility";
import * as logger from "../logger";
import CrossReference from "./cross_references";

export default class Studio {
  _id: string;
  name: string;
  description: string | null = null;
  thumbnail: string | null = null;
  addedOn: number = +new Date();
  favorite: boolean = false;
  bookmark: boolean = false;
  parent: string | null = null;
  labels?: string[]; // backwards compatibility

  static async checkIntegrity() {
    const allStudios = await Studio.getAll();

    for (const studio of allStudios) {
      const studioId = studio._id.startsWith("st_")
        ? studio._id
        : `st_${studio._id}`;

      if (studio.labels && studio.labels.length) {
        for (const label of studio.labels) {
          const labelId = label.startsWith("la_") ? label : `la_${label}`;

          if (!!(await CrossReference.get(studioId, labelId))) {
            logger.log(
              `Cross reference ${studioId} -> ${labelId} already exists.`
            );
          } else {
            const cr = new CrossReference(studioId, labelId);
            await database.insert(database.store.crossReferences, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (!studio._id.startsWith("st_")) {
        const newStudio = JSON.parse(JSON.stringify(studio)) as Studio;
        newStudio._id = studioId;
        if (newStudio.labels) delete newStudio.labels;
        if (studio.thumbnail && !studio.thumbnail.startsWith("im_")) {
          newStudio.thumbnail = "im_" + studio.thumbnail;
        }
        if (studio.parent && !studio.parent.startsWith("st_")) {
          newStudio.parent = "st_" + studio.parent;
        }
        await database.insert(database.store.studios, newStudio);
        await database.remove(database.store.studios, { _id: studio._id });
        logger.log(`Changed studio ID: ${studio._id} -> ${studioId}`);
      } else {
        if (studio.parent && !studio.parent.startsWith("st_")) {
          await database.update(
            database.store.studios,
            { _id: studioId },
            { $set: { parent: "st_" + studio.parent } }
          );
        }
        if (studio.thumbnail && !studio.thumbnail.startsWith("im_")) {
          await database.update(
            database.store.studios,
            { _id: studioId },
            { $set: { thumbnail: "im_" + studio.thumbnail } }
          );
        }
        if (studio.labels)
          await database.update(
            database.store.studios,
            { _id: studioId },
            { $unset: { labels: true } }
          );
      }
    }
  }

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

  static async filterImage(thumbnail: string) {
    await database.update(
      database.store.studios,
      { thumbnail },
      { $set: { thumbnail: null } }
    );
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.studios, {
      _id
    })) as Studio | null;
  }

  static async getAll() {
    return (await database.find(database.store.studios, {})) as Studio[];
  }

  static async getScenes(studio: Studio): Promise<Scene[]> {
    const scenes = await Scene.getByStudio(studio._id);
    const subStudios = await Studio.getSubStudios(studio._id);

    const scenesOfSubStudios = (
      await Promise.all(subStudios.map(child => Studio.getScenes(child)))
    ).flat();

    return scenes.concat(scenesOfSubStudios);
  }

  static async getMovies(studio: Studio): Promise<Movie[]> {
    const movies = await Movie.getByStudio(studio._id);

    const moviesOfSubStudios = (
      await Promise.all(
        (await Studio.getSubStudios(studio._id)).map(child =>
          Studio.getMovies(child)
        )
      )
    ).flat();

    return movies.concat(moviesOfSubStudios);
  }

  static async getSubStudios(studioId: string) {
    return (await database.find(database.store.studios, {
      parent: studioId
    })) as Studio[];
  }

  static async getActors(studio: Studio) {
    const scenes = await Studio.getScenes(studio);
    const actorIds = [...new Set(scenes.map(scene => scene.actors).flat())];
    return (await mapAsync(actorIds, Actor.getById)).filter(Boolean) as Actor[];
  }

  static async setLabels(studio: Studio, labelIds: string[]) {
    const references = await CrossReference.getBySource(studio._id);

    const oldLabelReferences = references
      .filter(r => r.to.startsWith("la_"))
      .map(r => r._id);

    for (const id of oldLabelReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(labelIds)]) {
      const crossReference = new CrossReference(studio._id, id);
      logger.log("Adding actor to scene: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async getLabels(studio: Studio) {
    const references = await CrossReference.getBySource(studio._id);
    return (
      await mapAsync(
        references.filter(r => r.to.startsWith("la_")),
        r => Label.getById(r.to)
      )
    ).filter(Boolean) as Label[];
  }

  static async inferLabels(studio: Studio) {
    const scenes = await Studio.getScenes(studio);
    const labelIds = [...new Set(scenes.map(scene => scene.labels).flat())];
    return (await mapAsync(labelIds, Label.getById)).filter(Boolean) as Label[];
  }
}
