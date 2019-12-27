import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";
import CrossReference from "./cross_references";
import { mapAsync } from "./utility";

export default class Marker {
  _id: string;
  name: string;
  addedOn = +new Date();
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  labels?: string[];
  scene: string;
  time: number; // Time in scene in seconds

  constructor(name: string, scene: string, time: number) {
    this._id = "mk_" + generateHash();
    this.name = name;
    this.scene = scene;
    this.time = Math.round(time);
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.markers, {
      _id
    })) as Marker | null;
  }

  static async remove(_id: string) {
    await database.remove(database.store.markers, { _id });
  }

  static async removeByScene(scene: Scene) {
    await database.remove(database.store.markers, { scene: scene._id });
  }
}
