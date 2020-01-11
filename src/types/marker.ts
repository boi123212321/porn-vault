import * as database from "../database";
import { generateHash } from "../hash";
import Scene from "./scene";

export default class Marker {
  _id: string;
  name: string;
  addedOn = +new Date();
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  scene: string;
  time: number; // Time in scene in seconds

  static async filterCustomField(fieldId: string) {
    await database.update(
      database.store.markers,
      {},
      { $unset: { [`customFields.${fieldId}`]: true } }
    );
  }

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
