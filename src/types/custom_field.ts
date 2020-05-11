import { generateHash } from "../hash";
import * as database from "../database";
import { customFieldCollection } from "../database";

export enum CustomFieldType {
  NUMBER = "NUMBER",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
}

export enum CustomFieldTarget {
  SCENES = "SCENES",
  ACTORS = "ACTORS",
  MOVIES = "MOVIES",
  IMAGES = "IMAGES",
  STUDIOS = "STUDIOS",
  ALBUMS = "ALBUMS",
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

  static async find(name: string) {
    name = name.toLowerCase().trim();
    const allFields = await CustomField.getAll();
    return allFields.find((field) => field.name === name);
  }

  static async remove(_id: string) {
    await customFieldCollection.remove(_id);
  }

  static async getById(_id: string) {
    return customFieldCollection.get(_id);
  }

  static async getAll() {
    return customFieldCollection.getAll();
  }
}
