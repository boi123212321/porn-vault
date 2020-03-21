import Scene from "../types/scene";
import Studio from "../types/studio";
import * as logger from "../logger";
import ora from "ora";
import Axios from "axios";
import extractQueryOptions from "../query_extractor";
import { ISearchResults } from "./index";
import argv from "../args";

const PAGE_SIZE = 24;

export async function searchScenes(query: string, random = 0) {
  const options = extractQueryOptions(query);
  logger.log(`Searching scenes for '${options.query}'...`);
  return Axios.get<ISearchResults>("http://localhost:8000/scene", {
    params: {
      query: options.query || "",
      skip: options.skip || options.page * 24,
      take: (random ? 999999 : null) || options.take || PAGE_SIZE,
      sort_by: options.sortBy,
      sort_dir: options.sortDir,
      favorite: options.favorite ? "true" : undefined,
      bookmark: options.bookmark ? "true" : undefined,
      rating: options.rating || 0,
      include: options.include.join(","),
      exclude: options.exclude.join(","),
      actors: options.actors.join(","),
      studio: options.studios[0],
      duration_min: options.durationMin || undefined,
      duration_max: options.durationMax || undefined
    }
  });
}

export interface ISceneSearchDoc {
  id: string;
  added_on: number;
  name: string;
  actors: { id: string; name: string; aliases: string[] }[];
  labels: { id: string; name: string; aliases: string[] }[];
  rating: number;
  bookmark: number | null;
  favorite: boolean;
  num_watches: number;
  release_date: number | null;
  duration: number | null;
  studio: string | null;
  studio_name: string | null;
  resolution: number | null;
  size: number | null;
}

export async function clearSceneIndex() {
  return Axios.delete("http://localhost:8000/scene");
}

export async function updateSceneDoc(scene: Scene) {
  return Axios.put(
    `http://localhost:8000/scene/${scene._id}`,
    await createSceneSearchDoc(scene)
  );
}

export async function removeSceneDoc(sceneId: string) {
  return Axios.delete("http://localhost:8000/scene/" + sceneId);
}

export async function indexScenes(scenes: Scene[]) {
  let docs = [] as ISceneSearchDoc[];
  let numItems = 0;
  for (const scene of scenes) {
    docs.push(await createSceneSearchDoc(scene));

    if (docs.length == (argv["index-slice-size"] || 5000)) {
      await addSceneSearchDocs(docs);
      numItems += docs.length;
      docs = [];
    }
  }
  if (docs.length) {
    await addSceneSearchDocs(docs);
    numItems += docs.length;
  }
  docs = [];
  return numItems;
}

export async function addSceneSearchDocs(docs: ISceneSearchDoc[]) {
  logger.log(`Indexing ${docs.length} items...`);
  const timeNow = +new Date();
  const res = await Axios.post("http://localhost:8000/scene", docs);
  logger.log(`Twigs indexing done in ${(Date.now() - timeNow) / 1000}s`);
  return res;
}

export async function buildSceneIndex() {
  const timeNow = +new Date();
  const loader = ora("Building scene index...").start();

  const res = await indexScenes(await Scene.getAll());

  loader.succeed(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  logger.log(`Index size: ${res} items`);
}

export async function createSceneSearchDoc(
  scene: Scene
): Promise<ISceneSearchDoc> {
  const labels = await Scene.getLabels(scene);
  const actors = await Scene.getActors(scene);

  return {
    id: scene._id,
    added_on: scene.addedOn,
    name: scene.name,
    labels: labels.map(l => ({
      id: l._id,
      name: l.name,
      aliases: l.aliases
    })),
    actors: actors.map(a => ({
      id: a._id,
      name: a.name,
      aliases: a.aliases
    })),
    rating: scene.rating,
    bookmark: scene.bookmark,
    favorite: scene.favorite,
    num_watches: scene.watches.length,
    duration: scene.meta.duration,
    release_date: scene.releaseDate,
    studio: scene.studio,
    // @ts-ignore
    resolution: scene.meta.dimensions.height,
    size: scene.meta.size,
    studio_name: scene.studio
      ? ((await Studio.getById(scene.studio)) || { name: null }).name
      : null
  };
}
