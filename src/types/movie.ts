import {
  actorCollection,
  movieCollection,
  movieSceneCollection,
  sceneCollection,
} from "../database";
import { generateHash } from "../hash";
import * as logger from "../logger";
import Actor from "./actor";
import Label from "./label";
import MovieScene from "./movie_scene";
import Scene from "./scene";
import { mapAsync } from "./utility";

export default class Movie {
  _id: string;
  name: string;
  description: string | null = null;
  addedOn = +new Date();
  releaseDate: number | null = null;
  frontCover: string | null = null;
  backCover: string | null = null;
  spineCover: string | null = null;
  favorite = false;
  bookmark: number | null = null;
  rating = 0;
  scenes?: string[]; // backwards compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields: any = {};
  studio: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  static async checkIntegrity(): Promise<void> {}

  static async calculateDuration(movie: Movie): Promise<number | null> {
    const scenesWithSource = (await Movie.getScenes(movie)).filter(
      (scene) => scene.meta && scene.path
    );

    if (!scenesWithSource.length) return null;

    return scenesWithSource.reduce((dur, scene) => dur + <number>scene.meta.duration, 0);
  }

  static async filterStudio(studioId: string): Promise<void> {
    for (const movie of await Movie.getAll()) {
      if (movie.studio === studioId) {
        movie.studio = null;
        await movieCollection.upsert(movie._id, movie);
      }
    }
  }

  static remove(_id: string): Promise<Movie> {
    return movieCollection.remove(_id);
  }

  static getById(_id: string): Promise<Movie | null> {
    return movieCollection.get(_id);
  }

  static getAll(): Promise<Movie[]> {
    return movieCollection.getAll();
  }

  static async getByScene(id: string): Promise<Movie[]> {
    return (
      await mapAsync(await MovieScene.getByScene(id), (ms) => Movie.getById(ms.movie))
    ).filter(Boolean) as Movie[];
  }

  static getByStudio(studioId: string): Promise<Movie[]> {
    return movieCollection.query("studio-index", studioId);
  }

  static async getLabels(movie: Movie): Promise<Label[]> {
    const scenes = await Movie.getScenes(movie);
    const labelIds = [
      ...new Set((await mapAsync(scenes, Scene.getLabels)).flat().map((a) => a._id)),
    ];
    return (await mapAsync(labelIds, Label.getById)).filter(Boolean) as Label[];
  }

  static async getActors(movie: Movie): Promise<Actor[]> {
    const scenes = await Movie.getScenes(movie);
    const actorIds = [
      ...new Set((await mapAsync(scenes, Scene.getActors)).flat().map((a) => a._id)),
    ];
    return (await actorCollection.getBulk(actorIds)).filter(Boolean);
  }

  static async setScenes(movie: Movie, sceneIds: string[]): Promise<void> {
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

  static async getScenes(movie: Movie): Promise<Scene[]> {
    const references = await MovieScene.getByMovie(movie._id);
    return (await sceneCollection.getBulk(references.map((r) => r.scene))).filter(Boolean);
  }

  static async getRating(movie: Movie): Promise<number> {
    const scenesWithScore = (await Movie.getScenes(movie)).filter((scene) => !!scene.rating);

    if (!scenesWithScore.length) return 0;

    return Math.round(
      scenesWithScore.reduce((rating, scene) => rating + scene.rating, 0) / scenesWithScore.length
    );
  }

  constructor(name: string) {
    this._id = "mo_" + generateHash();
    this.name = name.trim();
  }
}
