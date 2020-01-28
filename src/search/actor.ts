import { SearchIndex } from "./engine";
import Actor from "../types/actor";
import { tokenizeNames, tokenize } from "./tokenize";
import Scene from "../types/scene";
import * as log from "../logger/index";
import { memorySizeOf } from "../mem";

export interface IActorSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  aliases: string[];
  labels: { _id: string; name: string; aliases: string[] }[];
  rating: number;
  bookmark: boolean;
  favorite: boolean;
  views: number;
  bornOn: number | null;
  numScenes: number;
}

export async function createActorSearchDoc(
  actor: Actor
): Promise<IActorSearchDoc> {
  const labels = await Actor.getLabels(actor);

  return {
    _id: actor._id,
    addedOn: actor.addedOn,
    name: actor.name,
    aliases: actor.aliases,
    labels: labels.map(l => ({
      _id: l._id,
      name: l.name,
      aliases: l.aliases
    })),
    rating: actor.rating,
    bookmark: actor.bookmark,
    favorite: actor.favorite,
    views: (await Actor.getWatches(actor)).length,
    bornOn: actor.bornOn,
    numScenes: (await Scene.getByActor(actor._id)).length
  };
}

export const actorIndex = new SearchIndex(
  (doc: IActorSearchDoc) => {
    return [
      ...tokenize(doc.name),
      ...tokenizeNames(doc.aliases),
      ...tokenizeNames(doc.labels.map(l => l.name))
    ];
  },
  (actor: IActorSearchDoc) => actor._id
);

export async function buildActorIndex() {
  const timeNow = +new Date();
  log.log("Building actor index...");
  for (const actor of await Actor.getAll()) {
    actorIndex.add(await createActorSearchDoc(actor));
  }
  log.message(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  log.log(
    `Index size: ${actorIndex.size()} items, ${memorySizeOf(actorIndex)}`
  );
}
