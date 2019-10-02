import { database } from "../database";
import { generateHash } from "../hash";

export default class Actor {
  id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  bornOn: number | null = null;
  images: string[] = [];
  coverIndex: number = 0;
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
    return Actor
      .getAll()
      .find(actor => actor.id == id) || null;
  }

  static getAll(): Actor[] {
    return database.get('actors').value();
  }

  constructor(name: string, aliases: string[] = []) {
    this.id = generateHash();
    this.name = name.trim();
    this.aliases = aliases.map(tag => tag.trim());
  }
}