import * as database from "../database";
import { generateHash } from "../hash";

export default class CrossReference {
  _id: string;
  from: string;
  to: string;

  constructor(from: string, to: string) {
    this._id = "cr_" + generateHash();
    this.from = from;
    this.to = to;
  }

  static async remove(from: string, to: string) {
    return database.remove(database.store.cross_references, {
      from,
      to
    }) as Promise<CrossReference[]>;
  }

  static async getByDest(to: string) {
    const result = (await database.find(database.store.cross_references, {
      to
    })) as CrossReference[];
    return result;
  }

  static async getBySource(from: string) {
    const result = (await database.find(database.store.cross_references, {
      from
    })) as CrossReference[];
    return result;
  }

  static async get(from: string, to: string) {
    const result = (await database.findOne(database.store.cross_references, {
      from,
      to
    })) as CrossReference | null;
    return result;
  }
}
