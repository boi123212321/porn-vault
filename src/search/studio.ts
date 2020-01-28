import { SearchIndex } from "./engine";
import Studio from "../types/studio";
import { tokenizeNames, tokenize } from "./tokenize";
import * as log from "../logger/index";
import { memorySizeOf } from "../mem";

export interface IStudioSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  labels: { _id: string; name: string; aliases: string[] }[];
  bookmark: boolean;
  favorite: boolean;
  // rating: number;
  numScenes: number;
}

export async function createStudioSearchDoc(
  studio: Studio
): Promise<IStudioSearchDoc> {
  const labels = await Studio.getLabels(studio);
  // const actors = await Studio.getActors(studio);

  return {
    _id: studio._id,
    addedOn: studio.addedOn,
    name: studio.name,
    labels: labels.map(l => ({
      _id: l._id,
      name: l.name,
      aliases: l.aliases
    })),
    // rating: studio.rating,
    bookmark: studio.bookmark,
    favorite: studio.favorite,
    numScenes: (await Studio.getScenes(studio)).length
  };
}

export const studioIndex = new SearchIndex(
  (doc: IStudioSearchDoc) => {
    return [
      ...tokenize(doc.name),
      ...tokenizeNames(doc.labels.map(l => l.name))
    ];
  },
  (studio: IStudioSearchDoc) => studio._id
);

export async function buildStudioIndex() {
  const timeNow = +new Date();
  log.log("Building studio index...");
  for (const studio of await Studio.getAll()) {
    studioIndex.add(await createStudioSearchDoc(studio));
  }
  log.message(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  log.log(
    `Index size: ${studioIndex.size()} items, ${memorySizeOf(studioIndex)}`
  );
}
