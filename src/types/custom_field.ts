import { generateHash } from "../hash";
import * as database from "../database";

export enum CustomFieldType {
  NUMBER = "NUMBER",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT"
}

export enum CustomFieldTarget {
  SCENES = "SCENES",
  ACTORS = "ACTORS",
  MOVIES = "MOVIES",
  IMAGES = "IMAGES",
  STUDIOS = "STUDIOS",
  ALBUMS = "ALBUMS"
}

export default class CustomField {
  _id: string;
  name: string;
  values: string[] | null = [];
  type: CustomFieldType;
  target: CustomFieldTarget;
  unit = null as string | null;

  constructor(name: string, target: CustomFieldTarget, type: CustomFieldType) {
    this._id = "cf_" + generateHash();
    this.name = name;
    this.type = type;
    this.target = target;
  }

  static async remove(_id: string) {
    await database.remove(database.store.customFields, { _id });
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.customFields, {
      _id
    })) as CustomField | null;
  }

  static async getAll() {
    return (await database.find(
      database.store.customFields,
      {}
    )) as CustomField[];
  }
}
