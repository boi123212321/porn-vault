import ora from "ora";

import argv from "../args";
import * as logger from "../logger";
import extractQueryOptions from "../query_extractor";
import Actor from "../types/actor";
import { getNationality } from "../types/countries";
import Scene from "../types/scene";
import { mapAsync } from "../types/utility";
import {
  filterBookmark,
  filterExclude,
  filterFavorites,
  filterInclude,
  filterRating,
} from "./common";
import { Gianna } from "./internal/index";

const PAGE_SIZE = 24;

export let index!: Gianna.Index<IActorSearchDoc>;

const FIELDS = ["name", "aliases", "labelNames", "custom"];

export interface IActorSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  aliases: string[];
  labels: string[];
  labelNames: string[];
  rating: number;
  score: number;
  bookmark: number | null;
  favorite: boolean;
  numViews: number;
  bornOn: number | null;
  age: number | null;
  numScenes: number;
  nationality: string | null;
  custom: string[];
}

export async function createActorSearchDoc(actor: Actor): Promise<IActorSearchDoc> {
  const labels = await Actor.getLabels(actor);

  const numViews = (await Actor.getWatches(actor)).length;
  const numScenes = (await Scene.getByActor(actor._id)).length;

  return {
    _id: actor._id,
    addedOn: actor.addedOn,
    name: actor.name,
    aliases: actor.aliases,
    labels: labels.map((l) => l._id),
    labelNames: labels.map((l) => [l.name, ...l.aliases]).flat(),
    score: Actor.calculateScore(actor, numViews, numScenes),
    rating: actor.rating,
    bookmark: actor.bookmark,
    favorite: actor.favorite,
    numViews,
    bornOn: actor.bornOn,
    numScenes,
    age: Actor.getAge(actor),
    nationality: actor.nationality ? getNationality(actor.nationality).nationality : null,
    custom: Object.values(actor.customFields)
      .filter((val) => typeof val !== "number" && typeof val !== "boolean")
      .flat() as string[],
  };
}

export async function updateActors(scenes: Actor[]): Promise<void> {
  return index.update(await mapAsync(scenes, createActorSearchDoc));
}

export async function indexActors(scenes: Actor[]): Promise<number> {
  let docs = [] as IActorSearchDoc[];
  let numItems = 0;
  for (const scene of scenes) {
    docs.push(await createActorSearchDoc(scene));

    if (docs.length === (argv["index-slice-size"] || 5000)) {
      await addActorSearchDocs(docs);
      numItems += docs.length;
      docs = [];
    }
  }
  if (docs.length) {
    await addActorSearchDocs(docs);
    numItems += docs.length;
  }
  docs = [];
  return numItems;
}

export async function addActorSearchDocs(docs: IActorSearchDoc[]): Promise<void> {
  logger.log(`Indexing ${docs.length} items...`);
  const timeNow = +new Date();
  const res = await index.index(docs);
  logger.log(`Gianna indexing done in ${(Date.now() - timeNow) / 1000}s`);
  return res;
}

export async function buildActorIndex(): Promise<Gianna.Index<IActorSearchDoc>> {
  index = await Gianna.createIndex("actors", FIELDS);

  const timeNow = +new Date();
  const loader = ora("Building actor index...").start();

  const res = await indexActors(await Actor.getAll());

  loader.succeed(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  logger.log(`Index size: ${res} items`);

  return index;
}

export async function searchActors(
  query: string,
  shuffleSeed = "default",
  transformFilter?: (tree: Gianna.IFilterTreeGrouping) => void
): Promise<Gianna.ISearchResults> {
  const options = extractQueryOptions(query);
  logger.log(`Searching actors for '${options.query}'...`);

  let sort = undefined as Gianna.ISortOptions | undefined;
  const filter = {
    type: "AND",
    children: [],
  } as Gianna.IFilterTreeGrouping;

  filterFavorites(filter, options);
  filterBookmark(filter, options);
  filterRating(filter, options);
  filterInclude(filter, options);
  filterExclude(filter, options);

  if (transformFilter) {
    transformFilter(filter);
  }

  if (options.sortBy) {
    if (options.sortBy === "$shuffle") {
      sort = {
        // eslint-disable-next-line camelcase
        sort_by: "$shuffle",
        // eslint-disable-next-line camelcase
        sort_asc: false,
        // eslint-disable-next-line camelcase
        sort_type: shuffleSeed,
      };
    } else {
      const sortType: string = {
        bornOn: "number",
        addedOn: "number",
        name: "string",
        rating: "number",
        bookmark: "number",
        numScenes: "number",
        numViews: "number",
        score: "number",
      }[options.sortBy];
      sort = {
        // eslint-disable-next-line camelcase
        sort_by: options.sortBy,
        // eslint-disable-next-line camelcase
        sort_asc: options.sortDir === "asc",
        // eslint-disable-next-line camelcase
        sort_type: sortType,
      };
    }
  }

  return index.search({
    query: options.query,
    skip: options.skip || options.page * 24,
    take: options.take || options.take || PAGE_SIZE,
    sort,
    filter,
  });
}
