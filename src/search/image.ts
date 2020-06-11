import Image from "../types/image";
import ora from "ora";
import Axios from "axios";
import extractQueryOptions from "../query_extractor";
import * as logger from "../logger";
import asyncPool from "tiny-async-pool";
import { Gianna } from "./internal/index";
import { mapAsync } from "../types/utility";
import {
  filterFavorites,
  filterBookmark,
  filterRating,
  filterInclude,
  filterExclude,
  filterActors,
  filterStudios,
} from "./common";

export let index!: Gianna.Index<IImageSearchDoc>;

const FIELDS = [
  "name",
  "labels",
  "actors",
  "studioName",
  "sceneName",
  "actorNames",
  "labelNames",
];

export interface IImageSearchDoc {
  _id: string;
  name: string;
  addedOn: number;
  actors: string[];
  labels: string[];
  actorNames: string[];
  labelNames: string[];
  bookmark: number | null;
  favorite: boolean;
  rating: number;
  scene: string | null;
  sceneName: string | null;
  studioName: string | null;
}

export async function updateImages(images: Image[]) {
  return index.update(await mapAsync(images, createImageSearchDoc));
}

const blacklist = [
  "(alt. thumbnail)",
  "(thumbnail)",
  "(preview)",
  "(front cover)",
  "(back cover)",
  "(spine cover)",
  "(hero image)",
  "(avatar)",
];

export function isBlacklisted(name: string) {
  return blacklist.some((ending) => name.endsWith(ending));
}

export const sliceArray = (size: number) => <T>(
  arr: T[],
  cb: (value: T[], index: number, arr: T[]) => any
) => {
  let index = 0;
  let slice = arr.slice(index, index + size) as T[];
  while (slice.length) {
    const result = cb(slice, index, arr);
    if (!!result) break;
    index += size;
    slice = arr.slice(index, index + size);
  }
};

export const getSlices = (size: number) => <T>(arr: T[]) => {
  const slices = [] as T[][];
  sliceArray(size)(arr, (slice) => {
    slices.push(slice);
  });
  return slices;
};

export async function indexImages(images: Image[]) {
  if (!images.length) return 0;
  const slices = getSlices(2500)(images);

  await asyncPool(4, slices, async (slice) => {
    const docs = [] as IImageSearchDoc[];
    await asyncPool(16, slice, async (image) => {
      if (!isBlacklisted(image.name))
        docs.push(await createImageSearchDoc(image));
    });
    await addImageSearchDocs(docs);
  });

  return images.length;
}

export async function addImageSearchDocs(docs: IImageSearchDoc[]) {
  logger.log(`Indexing ${docs.length} items...`);
  const timeNow = +new Date();
  const res = await index.index(docs);
  logger.log(`Gianna indexing done in ${(Date.now() - timeNow) / 1000}s`);
  return res;
}

export async function buildImageIndex() {
  index = await Gianna.createIndex("images", FIELDS);

  const timeNow = +new Date();
  const loader = ora("Building image index...").start();

  const res = await indexImages(await Image.getAll());

  loader.succeed(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  logger.log(`Index size: ${res} items`);

  return index;
}

export async function createImageSearchDoc(
  image: Image
): Promise<IImageSearchDoc> {
  const labels = await Image.getLabels(image);
  const actors = await Image.getActors(image);

  return {
    _id: image._id,
    addedOn: image.addedOn,
    name: image.name,
    labels: labels.map((l) => l._id),
    actors: actors.map((a) => a._id),
    actorNames: actors.map((a) => [a.name, ...a.aliases]).flat(),
    labelNames: labels.map((l) => [l.name, ...l.aliases]).flat(),
    rating: image.rating || 0,
    bookmark: image.bookmark,
    favorite: image.favorite,
    scene: image.scene,
    sceneName: null, // TODO:
    studioName: null, // TODO:
  };
}

export async function searchImages(query: string, shuffleSeed = "default") {
  const options = extractQueryOptions(query);
  logger.log(`Searching images for '${options.query}'...`);

  let sort = undefined as Gianna.ISortOptions | undefined;
  let filter = {
    type: "AND",
    children: [],
  } as Gianna.IFilterTreeGrouping;

  filterFavorites(filter, options);
  filterBookmark(filter, options);
  filterRating(filter, options);
  filterInclude(filter, options);
  filterExclude(filter, options);
  filterActors(filter, options);
  filterStudios(filter, options);

  if (options.scenes.length) {
    filter.children.push({
      type: "OR",
      children: options.scenes.map((sceneId) => ({
        condition: {
          operation: "=",
          property: "scene",
          type: "string",
          value: sceneId,
        },
      })),
    });
  }

  if (options.sortBy) {
    if (options.sortBy === "$shuffle") {
      sort = {
        sort_by: "$shuffle",
        sort_asc: false,
        sort_type: shuffleSeed,
      };
    } else {
      const sortType = {
        name: "string",
        addedOn: "number",
        rating: "number",
        bookmark: "number",
      }[options.sortBy];
      sort = {
        sort_by: options.sortBy,
        sort_asc: options.sortDir === "asc",
        sort_type: sortType,
      };
    }
  }

  // Cast to Number to prevent error in query syntax
  const numTake = Number(options.take);
  
  return index.search({
    query: options.query,
    skip: options.skip || options.page * numTake,
    take: options.take || options.take || numTake,
    sort,
    filter,
  });
}
