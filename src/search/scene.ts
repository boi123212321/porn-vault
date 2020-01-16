import { SearchIndex } from "./engine";
import Scene from "../types/scene";
import { tokenizeNames, tokenize } from "./tokenize";

export interface ISceneSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  actors: { _id: string; name: string; aliases: string[] }[];
  labels: { _id: string; name: string; aliases: string[] }[];
  rating: number;
  bookmark: boolean;
  favorite: boolean;
  views: number;
  releaseDate: number | null;
  duration: number | null;
  // movies: string[];
  studio: string | null;
  resolution: number | null;
  size: number | null;
}

export async function createSceneSearchDoc(
  scene: Scene
): Promise<ISceneSearchDoc> {
  const labels = await Scene.getLabels(scene);
  const actors = await Scene.getActors(scene);

  return {
    _id: scene._id,
    addedOn: scene.addedOn,
    name: scene.name,
    labels: labels.map(l => ({
      _id: l._id,
      name: l.name,
      aliases: l.aliases
    })),
    actors: actors.map(a => ({
      _id: a._id,
      name: a.name,
      aliases: a.aliases
    })),
    rating: scene.rating,
    bookmark: scene.bookmark,
    favorite: scene.favorite,
    views: scene.watches.length,
    duration: scene.meta.duration,
    releaseDate: scene.releaseDate,
    studio: scene.studio,
    resolution: scene.meta.dimensions.height,
    size: scene.meta.size
  };
}

export const sceneIndex = new SearchIndex(
  (doc: ISceneSearchDoc) => {
    return [
      ...tokenize(doc.name),
      ...tokenizeNames(doc.actors.map(l => l.name)),
      ...tokenizeNames(doc.actors.map(l => l.aliases).flat()),
      ...tokenizeNames(doc.labels.map(l => l.name))
    ];
  },
  (scene: ISceneSearchDoc) => scene._id
);

export async function buildSceneIndex() {
  const timeNow = +new Date();
  console.log("Building scene index...");
  for (const scene of await Scene.getAll()) {
    sceneIndex.add(await createSceneSearchDoc(scene));
  }
  console.log(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
}
