import { movieSceneCollection } from "../database/index";
import { generateHash } from "../hash";

export default class MovieScene {
  _id: string;
  movie: string;
  scene: string;

  constructor(movie: string, scene: string) {
    this._id = "ms_" + generateHash();
    this.movie = movie;
    this.scene = scene;
  }

  static async getAll(): Promise<MovieScene[]> {
    return movieSceneCollection.getAll();
  }

  static async getByMovie(movie: string): Promise<MovieScene[]> {
    return movieSceneCollection.query("movie-index", movie);
  }

  static async getByScene(scene: string): Promise<MovieScene[]> {
    return movieSceneCollection.query("scene-index", scene);
  }

  static async get(from: string, to: string): Promise<MovieScene | undefined> {
    const fromReferences = await movieSceneCollection.query("movie-index", from);
    return fromReferences.find((r) => r.scene === to);
  }

  static async removeByScene(id: string): Promise<void> {
    for (const ref of await MovieScene.getByScene(id)) {
      await MovieScene.removeById(ref._id);
    }
  }

  static async removeByMovie(id: string): Promise<void> {
    for (const ref of await MovieScene.getByMovie(id)) {
      await MovieScene.removeById(ref._id);
    }
  }

  static async removeById(_id: string): Promise<void> {
    await movieSceneCollection.remove(_id);
  }
}
