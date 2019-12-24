import * as database from "../../database";
import Actor from "../../types/actor";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { Dictionary } from "../../types/utility";
import { tokenPerms } from "../../extractor";
import * as logger from "../../logger/index";
import { getConfig } from "../../config/index";

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
    const config = await getConfig();

    let actorLabels = [] as string[];
    if (args.labels) {
      await Actor.setLabels(actor, args.labels);
      actorLabels = args.labels;
    }

    for (const scene of await Scene.getAll()) {
      const perms = tokenPerms(scene.path || scene.name);

      if (
        perms.includes(actor.name.toLowerCase()) ||
        actor.aliases.some(alias => perms.includes(alias.toLowerCase()))
      ) {
        if (config.APPLY_ACTOR_LABELS === true) {
          const sceneLabels = (await Scene.getLabels(scene)).map(l => l._id);
          await Scene.setLabels(scene, sceneLabels.concat(actorLabels));
          logger.log(`Applied actor labels of new actor to ${scene._id}`);
        }

        await Scene.setActors(
          scene,
          (await Scene.getActors(scene)).map(l => l._id).concat(actor._id)
        );

        logger.log(`Updated actors of ${scene._id}`);
      }
    }

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
          await Actor.setLabels(actor, opts.labels);

        if (typeof opts.bookmark == "boolean") actor.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") actor.favorite = opts.favorite;

        if (typeof opts.name == "string") actor.name = opts.name.trim();

        if (typeof opts.thumbnail == "string") actor.thumbnail = opts.thumbnail;

        if (typeof opts.rating == "number") actor.rating = opts.rating;

        if (opts.bornOn !== undefined) actor.bornOn = opts.bornOn;

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
        await database.remove(database.store.cross_references, {
          from: actor._id
        });
        await database.remove(database.store.cross_references, {
          to: actor._id
        });
      }
    }
    return true;
  }
};
