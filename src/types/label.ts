import * as database from "../database";
import { generateHash } from "../hash";
import CrossReference from "./cross_references";
import * as logger from "../logger";

export default class Label {
  _id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  thumbnail: string | null = null;

  static async checkIntegrity() {
    const allLabels = await Label.getAll();

    for (const label of allLabels) {
      const labelId = label._id.startsWith("la_")
        ? label._id
        : `la_${label._id}`;

      if (!label._id.startsWith("la_")) {
        const newLabel = JSON.parse(JSON.stringify(label)) as Label;
        newLabel._id = labelId;
        await database.insert(database.store.labels, newLabel);
        await database.remove(database.store.labels, { _id: label._id });
        logger.log(`Changed label ID: ${label._id} -> ${labelId}`);
      }
    }
  }

  static async filterImage(thumbnail: string) {
    await database.update(
      database.store.labels,
      { thumbnail },
      { $set: { thumbnail: null } }
    );
  }

  static async remove(_id: string) {
    await database.remove(database.store.labels, { _id });
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.labels, {
      _id
    })) as Label | null;
  }

  static async getAll() {
    return (await database.find(database.store.labels, {})) as Label[];
  }

  static async find(name: string) {
    name = name.toLowerCase().trim();
    const allLabels = await Label.getAll();
    return allLabels.find(label => label.name === name);
  }

  constructor(name: string, aliases: string[] = []) {
    this._id = "la_" + generateHash();
    this.name = name.trim();
    this.aliases = [
      ...new Set(aliases.map(alias => alias.toLowerCase().trim()))
    ];
  }
}
