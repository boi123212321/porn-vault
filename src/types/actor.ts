import * as database from "../database";
import { generateHash } from "../hash";
import Label from "./label";
import Scene from "./scene";
import { mapAsync } from "./utility";
import CrossReference from "./cross_references";
import * as logger from "../logger";
import moment = require("moment");

export default class Actor {
  _id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  bornOn: number | null = null;
  thumbnail: string | null = null;
  altThumbnail: string | null = null;
  hero?: string | null = null;
  avatar?: string | null = null;
  favorite: boolean = false;
  bookmark: number | null = null;
  rating: number = 0;
  customFields: any = {};
  labels?: string[]; // backwards compatibility
  studio?: string | null; // backwards compatibility
  description?: string | null = null;

  static getAge(actor: Actor) {
    if (actor.bornOn) return moment().diff(actor.bornOn, "years");
    return null;
  }

  static async filterCustomField(fieldId: string) {
    await database.update(
      database.store.actors,
      {},
      { $unset: { [`customFields.${fieldId}`]: true } }
    );
  }

  static async checkIntegrity() {
    const allActors = await Actor.getAll();

    for (const actor of allActors) {
      const actorId = actor._id.startsWith("ac_")
        ? actor._id
        : `ac_${actor._id}`;

      if (actor.labels && actor.labels.length) {
        for (const label of actor.labels) {
          const labelId = label.startsWith("la_") ? label : `la_${label}`;

          if (!!(await CrossReference.get(actorId, labelId))) {
            logger.log(
              `Cross reference ${actorId} -> ${labelId} already exists.`
            );
          } else {
            const cr = new CrossReference(actorId, labelId);
            await database.insert(database.store.crossReferences, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (!actor._id.startsWith("ac_")) {
        const newActor = JSON.parse(JSON.stringify(actor)) as Actor;
        newActor._id = actorId;
        if (newActor.labels) delete newActor.labels;
        if (actor.thumbnail && !actor.thumbnail.startsWith("im_")) {
          newActor.thumbnail = "im_" + actor.thumbnail;
        }
        await database.insert(database.store.actors, newActor);
        await database.remove(database.store.actors, { _id: actor._id });
        logger.log(`Changed actor ID: ${actor._id} -> ${actorId}`);
      } else {
        if (actor.thumbnail && !actor.thumbnail.startsWith("im_")) {
          await database.update(
            database.store.actors,
            { _id: actorId },
            { $set: { thumbnail: "im_" + actor.thumbnail } }
          );
        }
        if (actor.labels)
          await database.update(
            database.store.actors,
            { _id: actorId },
            { $unset: { labels: true } }
          );
      }
    }
  }

  static async filterImage(thumbnail: string) {
    await database.update(
      database.store.actors,
      { thumbnail },
      { $set: { thumbnail: null, altThumbnail: null, hero: null } }
    );
  }

  static async remove(actor: Actor) {
    await database.remove(database.store.actors, { _id: actor._id });
  }

  static async setLabels(actor: Actor, labelIds: string[]) {
    const references = await CrossReference.getBySource(actor._id);

    const oldLabelReferences = references
      .filter(r => r.to.startsWith("la_"))
      .map(r => r._id);

    for (const id of oldLabelReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(labelIds)]) {
      const crossReference = new CrossReference(actor._id, id);
      logger.log("Adding label to actor: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async getLabels(actor: Actor) {
    const references = await CrossReference.getBySource(actor._id);
    return (
      await mapAsync(
        references.filter(r => r.to.startsWith("la_")),
        r => Label.getById(r.to)
      )
    ).filter(Boolean) as Label[];
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.actors, {
      _id
    })) as Actor | null;
  }

  static async getAll(): Promise<Actor[]> {
    return (await database.find(database.store.actors, {})) as Actor[];
  }

  static async getWatches(actor: Actor) {
    const scenes = await Scene.getByActor(actor._id);
    return scenes
      .map(s => s.watches)
      .flat()
      .sort();
  }

  static async getTopActors() {
    const actors = await Actor.getAll();

    const scores = await mapAsync(actors, async actor => {
      const score =
        (await Scene.getByActor(actor._id)).length / 5 +
        (await Actor.getWatches(actor)).length +
        +actor.favorite * 5 +
        actor.rating;

      return {
        actor,
        score
      };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.map(s => s.actor);
  }

  constructor(name: string, aliases: string[] = []) {
    this._id = "ac_" + generateHash();
    this.name = name.trim();
    this.aliases = [...new Set(aliases.map(tag => tag.trim()))];
  }
}
