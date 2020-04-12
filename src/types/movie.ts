import { generateHash } from "../hash";
import Scene from "./scene";
import Label from "./label";
import { mapAsync } from "./utility";
import * as logger from "../logger";
import {
  sceneCollection,
  actorCollection,
  movieCollection,
  movieSceneCollection,
} from "../database";
import MovieScene from "./movie_scene";

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

  static async checkIntegrity() {}

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
    return (
      await mapAsync(await MovieScene.getByScene(id), (ms) =>
        Movie.getById(ms.movie)
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
    const references = await MovieScene.getByMovie(movie._id);

    const oldSceneReferences = references.map((r) => r._id);

    for (const id of oldSceneReferences) {
      await movieSceneCollection.remove(id);
    }

    for (const id of [...new Set(sceneIds)]) {
      const movieScene = new MovieScene(movie._id, id);
      logger.log("Adding scene to movie: " + JSON.stringify(movieScene));
      await movieSceneCollection.upsert(movieScene._id, movieScene);
    }
  }

  static async getScenes(movie: Movie) {
    const references = await MovieScene.getByMovie(movie._id);
    return (
      await sceneCollection.getBulk(references.map((r) => r.scene))
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
