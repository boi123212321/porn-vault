import * as database from "../database";
import { generateHash } from "../hash";
import * as logger from "../logger/index";

export default class CrossReference {
  _id: string;
  from: string;
  to: string;

  constructor(from: string, to: string) {
    this._id = "cr_" + generateHash();
    this.from = from;
    this.to = to;
  }

  static async checkIntegrity() {
    const allReferences = await CrossReference.getAll();

    for (const ref of allReferences) {
      if (!ref.to || !ref.from) {
        await CrossReference.removeById(ref._id);
        logger.warn("Removed cross reference " + ref._id);
      }
    }
  }

  static async getAll() {
    return (await database.find(
      database.store.crossReferences,
      {}
    )) as CrossReference[];
  }

  static async removeById(_id: string) {
    return database.remove(database.store.crossReferences, {
      _id
    }) as Promise<CrossReference[]>;
  }

  static async remove(from: string, to: string) {
    return database.remove(database.store.crossReferences, {
      from,
      to
    }) as Promise<CrossReference[]>;
  }

  static async getByDest(to: string) {
    const result = (await database.find(database.store.crossReferences, {
      to
    })) as CrossReference[];
    return result;
  }

  static async getBySource(from: string) {
    const result = (await database.find(database.store.crossReferences, {
      from
    })) as CrossReference[];
    return result;
  }

  static async get(from: string, to: string) {
    const result = (await database.findOne(database.store.crossReferences, {
      from,
      to
    })) as CrossReference | null;
    return result;
  }
}
