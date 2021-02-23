import Studio from "../types/studio";
import { mapAsync } from "../utils/async";
import {
  bookmark,
  excludeFilter,
  favorite,
  includeFilter,
  ISearchResults,
  normalizeQuery,
  performSearch,
  searchQuery,
  shuffle,
  shuffleSwitch,
} from "./common";
import { getClient, indexMap } from "./index";
import { addSearchDocs, buildIndex, indexItems, ProgressCallback } from "./internal/buildIndex";

export interface IStudioSearchDoc {
  id: string;
  addedOn: number;
  name: string;
  aliases: string[];
  labels: string[];
  labelNames: string[];
  bookmark: number | null;
  favorite: boolean;
  rating: number;
  averageRating: number;
  numScenes: number;
  custom: Record<string, boolean | string | number | string[] | null>;
}

export async function createStudioSearchDoc(studio: Studio): Promise<IStudioSearchDoc> {
  const labels = await Studio.getLabels(studio);
  // const actors = await Studio.getActors(studio);

  return {
    id: studio._id,
    addedOn: studio.addedOn,
    name: normalizeQuery(studio.name),
    aliases: studio.aliases ?? [],
    labels: labels.map((l) => l._id),
    labelNames: labels.map((l) => l.name),
    rating: 0,
    averageRating: await Studio.getAverageRating(studio),
    bookmark: studio.bookmark,
    favorite: studio.favorite,
    numScenes: (await Studio.getScenes(studio)).length,
    custom: studio.customFields,
  };
}

async function addStudioSearchDocs(docs: IStudioSearchDoc[]) {
  return addSearchDocs(indexMap.studios, docs);
}

export async function removeStudio(studioId: string): Promise<void> {
  await getClient().delete({
    index: indexMap.studios,
    id: studioId,
    type: "_doc",
  });
}

export async function removeStudios(studioIds: string[]): Promise<void> {
  await mapAsync(studioIds, removeStudio);
}

export async function indexStudios(
  studios: Studio[],
  progressCb?: ProgressCallback
): Promise<number> {
  return indexItems(studios, createStudioSearchDoc, addStudioSearchDocs, progressCb);
}

export async function buildStudioIndex(): Promise<void> {
  await buildIndex(indexMap.studios, Studio.getAll, indexStudios);
}

export interface IStudioSearchQuery {
  query: string;
  favorite?: boolean;
  bookmark?: boolean;
  // rating: number;
  include?: string[];
  exclude?: string[];
  sortBy?: string;
  sortDir?: string;
  skip?: number;
  take?: number;
  page?: number;
}

export async function searchStudios(
  options: Partial<IStudioSearchQuery>,
  shuffleSeed = "default",
  extraFilter: unknown[] = []
): Promise<ISearchResults> {
  const query = searchQuery(options.query, ["name^2", "aliases^1.5", "labelNames"]);
  const _shuffle = shuffle(shuffleSeed, query, options.sortBy);

  return performSearch<IStudioSearchDoc, typeof options>({
    index: indexMap.studios,
    options,
    query: {
      bool: {
        ...shuffleSwitch(query, _shuffle),
        filter: [
          ...bookmark(options.bookmark),
          ...favorite(options.favorite),

          ...includeFilter(options.include),
          ...excludeFilter(options.exclude),

          ...extraFilter,
        ],
      },
    },
  });
}
