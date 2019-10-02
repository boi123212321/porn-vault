import { database } from "../database";
import { generateHash } from "../hash";

export default class Actor {
  id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  bornOn: number | null = null;
  thumbnails: string[] = [];
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  labels: string[] = [];

  static find(name: string): Actor[] {
    name = name.toLowerCase().trim();
    return Actor
      .getAll()
      .filter(actor => (
        actor.name.toLowerCase() == name ||
        actor.aliases.map(a => a.toLowerCase()).includes(name)
        )
      )
  }

  static getById(id: string): Actor | null {
    return database
      .get('actors')
      .findKey(id)
      .value();
  }

  static getAll(): Actor[] {
    return database.get('actors').value();
  }

  constructor(name: string) {
    this.id = generateHash();
    this.name = name;
  }
}