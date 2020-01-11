import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import Actor from "./actor";
import Label from "./label";
import { mapAsync } from "./utility";
import CrossReference from "./cross_references";
import * as logger from "../logger";

export default class Movie {
  _id: string;
  name: string;
  description: string | null = null;
  addedOn = +new Date();
  releaseDate: number | null = null;
  frontCover: string | null = null;
  backCover: string | null = null;
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  scenes?: string[]; // backwards compatibility
  customFields: any = {};
  studio: string | null = null;

  static async filterCustomField(fieldId: string) {
    await database.update(
      database.store.movies,
      {},
      { $unset: { [`customFields.${fieldId}`]: true } }
    );
  }

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
            await database.insert(database.store.crossReferences, cr);
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
        await database.insert(database.store.movies, newMovie);
        await database.remove(database.store.movies, { _id: movie._id });
        logger.log(`Changed movie ID: ${movie._id} -> ${movieId}`);
      } else {
        if (movie.studio && !movie.studio.startsWith("st_")) {
          await database.update(
            database.store.movies,
            { _id: movieId },
            { $set: { studio: "st_" + movie.studio } }
          );
        }
        if (movie.frontCover && !movie.frontCover.startsWith("im_")) {
          await database.update(
            database.store.movies,
            { _id: movieId },
            { $set: { frontCover: "im_" + movie.frontCover } }
          );
        }
        if (movie.backCover && !movie.backCover.startsWith("im_")) {
          await database.update(
            database.store.movies,
            { _id: movieId },
            { $set: { backCover: "im_" + movie.backCover } }
          );
        }
        if (movie.scenes)
          await database.update(
            database.store.movies,
            { _id: movieId },
            { $unset: { scenes: true } }
          );
      }
    }
  }

  static async calculateDuration(movie: Movie) {
    const scenesWithSource = (await Movie.getScenes(movie)).filter(
      scene => scene.meta && scene.path
    );

    if (!scenesWithSource.length) return null;

    return scenesWithSource.reduce(
      (dur, scene) => dur + <number>scene.meta.duration,
      0
    );
  }

  static async filterStudio(studioId: string) {
    await database.update(
      database.store.movies,
      { studio: studioId },
      { $set: { studio: null } }
    );
  }

  static async filterScene(scene: string) {
    await database.update(
      database.store.movies,
      {},
      { $pull: { scenes: scene } }
    );
  }

  static async filterImage(image: string) {
    await database.update(
      database.store.movies,
      { frontCover: image },
      { $set: { frontCover: null } }
    );

    await database.update(
      database.store.movies,
      { backCover: image },
      { $set: { backCover: null } }
    );
  }

  static async remove(_id: string) {
    await database.remove(database.store.movies, { _id });
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.movies, {
      _id
    })) as Movie | null;
  }

  static async getAll() {
    return (await database.find(database.store.movies, {})) as Movie[];
  }

  static async getByScene(id: string) {
    const references = await CrossReference.getByDest(id);
    return (
      await mapAsync(
        references.filter(r => r.from.startsWith("mo_")),
        r => Movie.getById(r.from)
      )
    ).filter(Boolean) as Movie[];
  }

  static async getByStudio(id: string) {
    return (await database.find(database.store.movies, {
      studio: id
    })) as Movie[];
  }

  static async getLabels(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const labelIds = [
      ...new Set(
        (await mapAsync(scenes, Scene.getLabels)).flat().map(a => a._id)
      )
    ];
    return (await mapAsync(labelIds, Label.getById)).filter(Boolean) as Label[];
  }

  static async getActors(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const actorIds = [
      ...new Set(
        (await mapAsync(scenes, Scene.getActors)).flat().map(a => a._id)
      )
    ];
    return (await mapAsync(actorIds, Actor.getById)).filter(Boolean) as Actor[];
  }

  static async setScenes(movie: Movie, sceneIds: string[]) {
    const references = await CrossReference.getBySource(movie._id);

    const oldSceneReferences = references
      .filter(r => r.to.startsWith("sc_"))
      .map(r => r._id);

    for (const id of oldSceneReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(sceneIds)]) {
      const crossReference = new CrossReference(movie._id, id);
      logger.log("Adding label to scene: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async getScenes(movie: Movie) {
    const references = await CrossReference.getBySource(movie._id);
    return (
      await mapAsync(
        references.filter(r => r.to.startsWith("sc_")),
        r => Scene.getById(r.to)
      )
    ).filter(Boolean) as Scene[];
  }

  static async getRating(movie: Movie) {
    const scenesWithScore = (await Movie.getScenes(movie)).filter(
      scene => !!scene.rating
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
