import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import Actor from "./actor";
import Label from "./label";
import { mapAsync } from "./utility";
import CrossReference from "./cross_references";
import * as logger from "../logger";
import {
  crossReferenceCollection,
  sceneCollection,
  actorCollection,
  movieCollection,
} from "../database";

export default class Movie {
  _id: string;
  name: string;
  description: string | null = null;
  addedOn = +new Date();
  releaseDate: number | null = null;
  frontCover: string | null = null;
  backCover: string | null = null;
  spineCover: string | null = null;
  favorite: boolean = false;
  bookmark: number | null = null;
  rating: number = 0;
  scenes?: string[]; // backwards compatibility
  customFields: any = {};
  studio: string | null = null;

  static async checkIntegrity() {
    const allMovies = await Movie.getAll();

    for (const movie of allMovies) {
      const movieId = movie._id.startsWith("mo_")
        ? movie._id
        : `mo_${movie._id}`;

      if (movie.scenes && movie.scenes.length) {
        for (const actor of movie.scenes) {
          const actorId = actor.startsWith("sc_") ? actor : `sc_${actor}`;

          if (!!(await CrossReference.get(movieId, actorId))) {
            logger.log(
              `Cross reference ${movieId} -> ${actorId} already exists.`
            );
          } else {
            const cr = new CrossReference(movieId, actorId);
            await crossReferenceCollection.upsert(cr._id, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (!movie._id.startsWith("mo_")) {
        const newMovie = JSON.parse(JSON.stringify(movie)) as Movie;
        newMovie._id = movieId;
        if (newMovie.scenes) delete newMovie.scenes;
        if (movie.frontCover && !movie.frontCover.startsWith("im_")) {
          newMovie.frontCover = "im_" + movie.frontCover;
        }
        if (movie.backCover && !movie.backCover.startsWith("im_")) {
          newMovie.backCover = "im_" + movie.backCover;
        }
        if (movie.studio && !movie.studio.startsWith("st_")) {
          newMovie.studio = "st_" + movie.studio;
        }
        await movieCollection.remove(movie._id);
        await movieCollection.upsert(newMovie._id, newMovie);
        logger.log(`Changed movie ID: ${movie._id} -> ${movieId}`);
      } else {
        if (movie.studio && !movie.studio.startsWith("st_")) {
          movie.studio = "st_" + movie.studio;
          await movieCollection.upsert(movie._id, movie);
        }
        if (movie.frontCover && !movie.frontCover.startsWith("im_")) {
          movie.frontCover = "img_" + movie.frontCover;
          await movieCollection.upsert(movie._id, movie);
        }
        if (movie.backCover && !movie.backCover.startsWith("im_")) {
          movie.backCover = "img_" + movie.backCover;
          await movieCollection.upsert(movie._id, movie);
        }
        if (movie.scenes) {
          delete movie.scenes;
          await movieCollection.upsert(movie._id, movie);
        }
      }
    }
  }

  static async calculateDuration(movie: Movie) {
    const scenesWithSource = (await Movie.getScenes(movie)).filter(
      (scene) => scene.meta && scene.path
    );

    if (!scenesWithSource.length) return null;

    return scenesWithSource.reduce(
      (dur, scene) => dur + <number>scene.meta.duration,
      0
    );
  }

  static async filterStudio(studioId: string) {
    for (const movie of await Movie.getAll()) {
      if (movie.studio == studioId) {
        movie.studio = null;
        await movieCollection.upsert(movie._id, movie);
      }
    }
  }

  static remove(_id: string) {
    return movieCollection.remove(_id);
  }

  static getById(_id: string) {
    return movieCollection.get(_id);
  }

  static getAll() {
    return movieCollection.getAll();
  }

  static async getByScene(id: string) {
    const references = await CrossReference.getByDest(id);
    return (
      await mapAsync(
        references.filter((r) => r.from.startsWith("mo_")),
        (r) => Movie.getById(r.from)
      )
    ).filter(Boolean) as Movie[];
  }

  static getByStudio(studioId: string) {
    return movieCollection.query("studio-index", studioId);
  }

  static async getLabels(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const labelIds = [
      ...new Set(
        (await mapAsync(scenes, Scene.getLabels)).flat().map((a) => a._id)
      ),
    ];
    return (await mapAsync(labelIds, Label.getById)).filter(Boolean) as Label[];
  }

  static async getActors(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const actorIds = [
      ...new Set(
        (await mapAsync(scenes, Scene.getActors)).flat().map((a) => a._id)
      ),
    ];
    return (await actorCollection.getBulk(actorIds)).filter(Boolean);
  }

  static async setScenes(movie: Movie, sceneIds: string[]) {
    const references = await CrossReference.getBySource(movie._id);

    const oldSceneReferences = references
      .filter((r) => r.to.startsWith("sc_"))
      .map((r) => r._id);

    for (const id of oldSceneReferences) {
      await crossReferenceCollection.remove(id);
    }

    for (const id of [...new Set(sceneIds)]) {
      const crossReference = new CrossReference(movie._id, id);
      logger.log("Adding label to scene: " + JSON.stringify(crossReference));
      await crossReferenceCollection.upsert(crossReference._id, crossReference);
    }
  }

  static async getScenes(movie: Movie) {
    const references = await CrossReference.getBySource(movie._id);
    return (
      await sceneCollection.getBulk(
        references.filter((r) => r.to.startsWith("sc_")).map((r) => r.to)
      )
    ).filter(Boolean);
  }

  static async getRating(movie: Movie) {
    const scenesWithScore = (await Movie.getScenes(movie)).filter(
      (scene) => !!scene.rating
    );

    if (!scenesWithScore.length) return 0;

    return Math.round(
      scenesWithScore.reduce((rating, scene) => rating + scene.rating, 0) /
        scenesWithScore.length
    );
  }

  constructor(name: string, scenes: string[] = []) {
    this._id = "mo_" + generateHash();
    this.name = name.trim();
    this.scenes = scenes;
  }
}
