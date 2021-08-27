import Movie from "../types/movie";
import Scene from "../types/scene";
import Studio from "../types/studio";
import SceneView from "../types/watch";
import { mapAsync } from "../utils/async";
import { getClient, indexMap } from ".";
import {
  arrayFilter,
  bookmark,
  durationFilter,
  excludeFilter,
  favorite,
  getActorNames,
  includeFilter,
  ISearchResults,
  performSearch,
  ratingFilter,
  searchQuery,
  shuffle,
  shuffleSwitch,
  unwatchedOnly,
} from "./common";
import { addSearchDocs, buildIndex, indexItems, ProgressCallback } from "./internal/buildIndex";

export interface ISceneSearchDoc {
  id: string;
  addedOn: number;
  name: string;
  rawName: string;
  path: string | null;
  numActors: number;
  actors: string[];
  labels: string[];
  numLabels: number;
  actorNames: string[];
  labelNames: string[];
  rating: number;
  bookmark: number | null;
  favorite: boolean;
  numViews: number;
  lastViewedOn: number;
  releaseDate: number | null;
  releaseYear: number | null;
  duration: number | null;
  studios: string[];
  studioName: string | null;
  resolution: number | null;
  size: number | null;
  score: number;
  movieNames: string[];
  numMovies: number;
  custom: Record<string, boolean | string | number | string[] | null>;
}

async function createSceneSearchDoc(scene: Scene): Promise<ISceneSearchDoc> {
  const labels = await Scene.getLabels(scene);
  const actors = await Scene.getActors(scene);
  const movies = await Movie.getByScene(scene._id);

  const watches = await SceneView.getByScene(scene._id);

  const studio = scene.studio ? await Studio.getById(scene.studio) : null;
  const parentStudios = studio ? await Studio.getParents(studio) : [];

  return {
    id: scene._id,
    addedOn: scene.addedOn,
    name: scene.name,
    rawName: scene.name,
    path: scene.path,
    labels: labels.map((l) => l._id),
    numLabels: labels.length,
    actors: actors.map((a) => a._id),
    numActors: actors.length,
    actorNames: [...new Set(actors.map(getActorNames).flat())],
    labelNames: labels.map((l) => l.name),
    rating: scene.rating,
    bookmark: scene.bookmark,
    favorite: scene.favorite,
    numViews: watches.length,
    lastViewedOn: watches.sort((a, b) => b.date - a.date)[0]?.date || 0,
    duration: scene.meta.duration,
    releaseDate: scene.releaseDate,
    releaseYear: scene.releaseDate ? new Date(scene.releaseDate).getFullYear() : null,
    studios: studio ? [studio, ...parentStudios].map((s) => s._id) : [],
    resolution: scene.meta.dimensions ? scene.meta.dimensions.height : 0,
    size: scene.meta.size,
    studioName: studio ? studio.name : null,
    score: Scene.calculateScore(scene, watches.length),
    movieNames: movies.map((m) => m.name),
    numMovies: movies.length,
    custom: scene.customFields,
  };
}

export async function buildSceneIndex(): Promise<void> {
  await buildIndex(indexMap.scenes, Scene.getAll, indexScenes);
}

async function addSceneSearchDocs(docs: ISceneSearchDoc[]) {
  return addSearchDocs(indexMap.scenes, docs);
}

export async function indexScenes(scenes: Scene[], progressCb?: ProgressCallback): Promise<number> {
  return indexItems(scenes, createSceneSearchDoc, addSceneSearchDocs, progressCb);
}

export async function removeScene(sceneId: string): Promise<void> {
  await getClient().delete({
    index: indexMap.scenes,
    id: sceneId,
    type: "_doc",
    refresh: "wait_for",
  });
}

export async function removeScenes(sceneIds: string[]): Promise<void> {
  await mapAsync(sceneIds, removeScene);
}

export interface ISceneSearchQuery {
  id: string;
  query: string;
  favorite?: boolean;
  bookmark?: boolean;
  unwatchedOnly: boolean;
  rating: number;
  include?: string[];
  exclude?: string[];
  studios?: string[];
  actors?: string[];
  sortBy?: string;
  sortDir?: string;
  skip?: number;
  take?: number;
  page?: number;
  durationMin?: number;
  durationMax?: number;

  rawQuery?: unknown;
}

export async function searchScenes(
  options: Partial<ISceneSearchQuery>,
  shuffleSeed = "default",
  extraFilter: unknown[] = []
): Promise<ISearchResults> {
  const query = searchQuery(options.query, [
    "name",
    "actorNames^1.5",
    "labelNames",
    "studioName^1.25",
    "movieNames^0.25",
  ]);
  const _shuffle = shuffle(shuffleSeed, query, options.sortBy);

  return performSearch<ISceneSearchDoc, typeof options>({
    index: indexMap.scenes,
    options,
    query: options.rawQuery || {
      bool: {
        ...shuffleSwitch(query, _shuffle),
        filter: [
          ...ratingFilter(options.rating),
          ...bookmark(options.bookmark),
          ...favorite(options.favorite),
          ...unwatchedOnly(options.unwatchedOnly),

          ...includeFilter(options.include),
          ...excludeFilter(options.exclude),

          ...arrayFilter(options.actors, "actors", "AND"),
          ...arrayFilter(options.studios, "studios", "OR"),

          ...durationFilter(options.durationMin, options.durationMax),

          ...extraFilter,
        ],
      },
    },
  });
}
