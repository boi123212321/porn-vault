import * as database from "../../database";
import Actor from "../../types/actor";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { Dictionary } from "../../types/utility";

type IActorUpdateOpts = Partial<{
  name: string;
  rating: number;
  labels: string[];
  aliases: string[];
  thumbnail: string;
  favorite: boolean;
  bookmark: boolean;
  bornOn: number;
}>;

export default {
  async addActor(_, args: Dictionary<any>) {
    const actor = new Actor(args.name, args.aliases);

    if (args.labels) actor.labels = args.labels;

    await database.insert(database.store.actors, actor);
    return actor;
  },

  async updateActors(
    _,
    { ids, opts }: { ids: string[]; opts: IActorUpdateOpts }
  ) {
    const updatedActors = [] as Actor[];

    for (const id of ids) {
      const actor = await Actor.getById(id);

      if (actor) {
        if (Array.isArray(opts.aliases))
          actor.aliases = [...new Set(opts.aliases)];

        if (Array.isArray(opts.labels))
          actor.labels = [...new Set(opts.labels)];

        if (typeof opts.bookmark == "boolean") actor.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") actor.favorite = opts.favorite;

        if (typeof opts.name == "string") actor.name = opts.name.trim();

        if (typeof opts.thumbnail == "string") actor.thumbnail = opts.thumbnail;

        if (typeof opts.rating == "number") actor.rating = opts.rating;

        if (typeof opts.bornOn == "number") actor.bornOn = opts.bornOn;

        await database.update(database.store.actors, { _id: actor._id }, actor);

        updatedActors.push(actor);
      } else {
        throw new Error(`Actor ${id} not found`);
      }
    }

    return updatedActors;
  },

  async removeActors(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const actor = await Actor.getById(id);

      if (actor) {
        await Actor.remove(actor);

        await Image.filterActor(actor._id);
        await Scene.filterActor(actor._id);
      }
    }
    return true;
  }
};
