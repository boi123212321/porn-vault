import { database } from "../database";
import { generateHash } from "../hash";

export default class Label {
  id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  thumbnail: string | null = null; // TODO:

  static remove(id: string) {
    database.get('labels')
      .remove({ id })
      .write();
  }

  static getById(id: string): Label | null {
    return Label
      .getAll()
      .find(label => label.id == id) || null;
  }

  static getAll(): Label[] {
    return database.get('labels').value();
  }

  static find(name: string) {
    name = name.toLowerCase().trim();
    return Label
      .getAll()
      .find(label => label.name === name || label.aliases.includes(name));
  }

  constructor(name: string, aliases: string[] = []) {
    this.id = generateHash();
    this.name = name.toLowerCase().trim();
    this.aliases = aliases.map(tag => tag.toLowerCase().trim());
  }
}