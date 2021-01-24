import { getConfig } from "../../config";
import { ApplyActorLabelsEnum } from "../../config/schema";
import { actorCollection } from "../../database";
import { onActorCreate } from "../../plugins/events/actor";
import { indexActors, removeActors } from "../../search/actor";
import Actor from "../../types/actor";
import ActorReference from "../../types/actor_reference";
import { isValidCountryCode } from "../../types/countries";
import LabelledItem from "../../types/labelled_item";
import { logger } from "../../utils/logger";
import { filterInvalidAliases, isArrayEq } from "../../utils/misc";
import { Dictionary } from "../../utils/types";

type IActorUpdateOpts = Partial<{
  name: string;
  description: string;
  rating: number;
  labels: string[];
  aliases: string[];
  avatar: string;
  thumbnail: string;
  altThumbnail: string;
  hero: string;
  favorite: boolean;
  bookmark: number | null;
  bornOn: number;
  customFields: Dictionary<string[] | boolean | string | null>;
  nationality: string | null;
}>;

async function runActorPlugins(ids: string[]) {
  const updatedActors = [] as Actor[];
  for (const id of ids) {
    let actor = await Actor.getById(id);

    if (actor) {
      logger.info(`Running plugin action event for '${actor.name}'...`);

      const labels = (await Actor.getLabels(actor)).map((l) => l._id);
      actor = await onActorCreate(actor, labels, "actorCustom");

      await Actor.setLabels(actor, labels);
      await actorCollection.upsert(actor._id, actor);

      updatedActors.push(actor);
    } else {
      logger.warn(`Actor ${id} not found`);
    }

    await indexActors(updatedActors);
  }
  return updatedActors;
}

export default {
  async runActorPlugins(_: unknown, { id }: { id: string }): Promise<Actor> {
    const result = await runActorPlugins([id]);
    return result[0];
  },

  async addActor(
    _: unknown,
    args: { name: string; aliases?: string[]; labels?: string[] }
  ): Promise<Actor> {
    const config = getConfig();
    const aliases = filterInvalidAliases(args.aliases || []);

    // If the actor already exists (same name), do not add it to avoid creating duplicates
    try {
      const existingActor = await Actor.getByName(args.name);
      if (existingActor) {
        logger.info(`Actor ${args.name} was not added as an actor with that name already exists.`);
        return existingActor;
      }
    } catch (error) {
      logger.warn(
        `Error while checking if actor already exists: ${args.name}. You should probably lauch pv with option "--reset-izzy".` +
          ` Actor creation will proceed normally, but you might end-up with duplicate actors.`
      );
      logger.error(error);
    }

    let actor = new Actor(args.name, aliases);

    let actorLabels = [] as string[];
    if (args.labels) {
      actorLabels = args.labels;
    }

    try {
      actor = await onActorCreate(actor, actorLabels);
    } catch (error) {
      logger.error(error);
    }

    await Actor.setLabels(actor, actorLabels);
    await actorCollection.upsert(actor._id, actor);

    if (config.matching.matchCreatedActors) {
      await Actor.findUnmatchedScenes(
        actor,
        config.matching.applyActorLabels.includes(ApplyActorLabelsEnum.enum["event:actor:create"])
          ? actorLabels
          : []
      );
    }

    await indexActors([actor]);

    return actor;
  },

  async updateActors(
    _: unknown,
    { ids, opts }: { ids: string[]; opts: IActorUpdateOpts }
  ): Promise<Actor[]> {
    const config = getConfig();
    const updatedActors = [] as Actor[];

    let didLabelsChange = false;

    for (const id of ids) {
      const actor = await Actor.getById(id);

      if (actor) {
        if (typeof opts.name === "string") {
          actor.name = opts.name.trim();
        }

        if (Array.isArray(opts.aliases)) {
          actor.aliases = [...new Set(filterInvalidAliases(opts.aliases))];
        }

        if (Array.isArray(opts.labels)) {
          const oldLabels = await Actor.getLabels(actor);
          await Actor.setLabels(actor, opts.labels);
          if (
            !isArrayEq(
              oldLabels,
              opts.labels,
              (l) => l._id,
              (l) => l
            )
          ) {
            didLabelsChange = true;
          }
        }

        if (typeof opts.nationality !== undefined) {
          if (typeof opts.nationality === "string" && isValidCountryCode(opts.nationality)) {
            actor.nationality = opts.nationality;
          } else if (opts.nationality === null) {
            actor.nationality = opts.nationality;
          }
        }

        if (typeof opts.bookmark === "number" || opts.bookmark === null) {
          actor.bookmark = opts.bookmark;
        }

        if (typeof opts.favorite === "boolean") {
          actor.favorite = opts.favorite;
        }

        if (typeof opts.description === "string") {
          actor.description = opts.description.trim();
        }

        if (typeof opts.avatar === "string" || opts.avatar === null) {
          actor.avatar = opts.avatar;
        }

        if (typeof opts.thumbnail === "string" || opts.thumbnail === null) {
          actor.thumbnail = opts.thumbnail;
        }

        if (typeof opts.altThumbnail === "string" || opts.altThumbnail === null) {
          actor.altThumbnail = opts.altThumbnail;
        }

        if (typeof opts.hero === "string" || opts.hero === null) {
          actor.hero = opts.hero;
        }

        if (typeof opts.rating === "number") {
          actor.rating = opts.rating;
        }

        if (opts.bornOn !== undefined) {
          actor.bornOn = opts.bornOn;
        }

        if (opts.customFields) {
          for (const key in opts.customFields) {
            const value = opts.customFields[key] !== undefined ? opts.customFields[key] : null;
            logger.debug(`Set actor custom.${key} to ${JSON.stringify(value)}`);
            opts.customFields[key] = value;
          }
          actor.customFields = opts.customFields;
        }

        await actorCollection.upsert(actor._id, actor);
        updatedActors.push(actor);
      } else {
        throw new Error(`Actor ${id} not found`);
      }

      if (didLabelsChange) {
        const labelsToPush = config.matching.applyActorLabels.includes(
          ApplyActorLabelsEnum.enum["event:actor:update"]
        )
          ? (await Actor.getLabels(actor)).map((l) => l._id)
          : [];
        await Actor.pushLabelsToCurrentScenes(actor, labelsToPush).catch((err) => {
          logger.error(`Error while pushing actor "${actor.name}"'s labels to scenes`);
          logger.error(err);
        });
      }
    }

    await indexActors(updatedActors);
    return updatedActors;
  },

  async removeActors(_: unknown, { ids }: { ids: string[] }): Promise<boolean> {
    for (const id of ids) {
      const actor = await Actor.getById(id);

      if (actor) {
        await Actor.remove(actor);
        await removeActors([actor._id]);
        await LabelledItem.removeByItem(actor._id);
        await ActorReference.removeByActor(actor._id);
      }
    }
    return true;
  },

  async attachActorToUnmatchedScenes(_: unknown, { id }: { id: string }): Promise<Actor | null> {
    const config = getConfig();

    const actor = await Actor.getById(id);
    if (!actor) {
      logger.error(`Did not find actor for id "${id}" to attach to unmatched scenes`);
      return null;
    }

    try {
      const labelsToPush = config.matching.applyActorLabels.includes(
        ApplyActorLabelsEnum.enum["event:actor:find-unmatched-scenes"]
      )
        ? (await Actor.getLabels(actor)).map((l) => l._id)
        : [];

      await Actor.findUnmatchedScenes(actor, labelsToPush);
    } catch (err) {
      logger.error(`Error attaching "${actor.name}" to unmatched scenes`);
      logger.error(err);
      return null;
    }

    return actor;
  },
};
