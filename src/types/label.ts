import { database } from "../database";
import { generateHash } from "../hash";

export default class Label {
  id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();

  static getById(id: string): Label | null {
    return database
      .get('labels')
      .findKey(id)
      .value();
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