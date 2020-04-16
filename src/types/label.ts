import * as database from "../database";
import { generateHash } from "../hash";
import * as logger from "../logger";

export default class Label {
  _id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  thumbnail: string | null = null;

  static async checkIntegrity() {}

  static async remove(_id: string) {
    await database.remove(database.store.labels, { _id });
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.labels, {
      _id,
    })) as Label | null;
  }

  static async getAll() {
    return (await database.find(database.store.labels, {})) as Label[];
  }

  static async find(name: string) {
    name = name.toLowerCase().trim();
    const allLabels = await Label.getAll();
    return allLabels.find((label) => label.name === name);
  }

  constructor(name: string, aliases: string[] = []) {
    this._id = "la_" + generateHash();
    this.name = name.trim();
    this.aliases = [
      ...new Set(aliases.map((alias) => alias.toLowerCase().trim())),
    ];
  }
}
