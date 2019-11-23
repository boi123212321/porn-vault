import * as database from "../database";
import { generateHash } from "../hash";
import Label from "./label";

export default class Actor {
  _id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  bornOn: number | null = null;
  thumbnail: string | null = null;
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  labels: string[] = [];
  studio: string | null = null;

  static async filterImage(thumbnail: string) {
    await database.update(
      database.store.actors,
      { thumbnail },
      { $set: { thumbnail: null } }
    );
  }

  static async remove(actor: Actor) {
    await database.remove(database.store.actors, { _id: actor._id });
  }

  static async filterLabel(label: string) {
    await database.update(
      database.store.actors,
      {},
      { $pull: { labels: label } }
    );
  }

  static async getLabels(scene: Actor) {
    const labels = [] as Label[];

    for (const id of scene.labels) {
      const label = await Label.getById(id);
      if (label) labels.push(label);
    }

    return labels;
  }

  static async find(name: string) {
    name = name.toLowerCase().trim();
    const allActors = await Actor.getAll();
    return allActors.filter(
      actor =>
        actor.name === name ||
        actor.aliases.map(alias => alias.toLowerCase()).includes(name)
    );
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.actors, {
      _id
    })) as Actor | null;
  }

  static async getAll(): Promise<Actor[]> {
    return (await database.find(database.store.actors, {})) as Actor[];
  }

  constructor(name: string, aliases: string[] = []) {
    this._id = generateHash();
    this.name = name.trim();
    this.aliases = aliases.map(tag => tag.trim());
  }
}
