import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import Actor from "./actor";
import Label from "./label";

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
  scenes: string[] = [];
  customFields: any = {};
  studio: string | null = null;

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

  static async getLabels(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const labelIds = [...new Set(scenes.map(scene => scene.labels).flat())];

    const labels = [] as Label[];

    for (const id of labelIds) {
      const label = await Label.getById(id);
      if (label) labels.push(label);
    }

    return labels;
  }

  static async getActors(movie: Movie) {
    const scenes = await Movie.getScenes(movie);
    const actorIds = [...new Set(scenes.map(scene => scene.actors).flat())];

    const actors = [] as Actor[];

    for (const id of actorIds) {
      const actor = await Actor.getById(id);
      if (actor) actors.push(actor);
    }

    return actors;
  }

  static async getScenes(movie: Movie) {
    const scenes = [] as Scene[];

    for (const id of movie.scenes) {
      const scene = await Scene.getById(id);
      if (scene) scenes.push(scene);
    }

    return scenes;
  }

  constructor(name: string, scenes: string[] = []) {
    this._id = generateHash();
    this.name = name.trim();
    this.scenes = scenes;
  }
}
