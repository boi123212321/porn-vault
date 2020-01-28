import { SearchIndex } from "./engine";
import Image from "../types/image";
import { tokenizeNames, tokenize } from "./tokenize";
import * as log from "../logger/index";
import { memorySizeOf } from "../mem";

export interface IImageSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  actors: { _id: string; name: string; aliases: string[] }[];
  labels: { _id: string; name: string; aliases: string[] }[];
  rating: number;
  bookmark: boolean;
  favorite: boolean;
  scene: string | null;
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
    rating: image.rating,
    bookmark: image.bookmark,
    favorite: image.favorite,
    scene: image.scene
  };
}

export const imageIndex = new SearchIndex(
  (doc: IImageSearchDoc) => {
    return [
      ...tokenize(doc.name),
      ...tokenizeNames(doc.actors.map(l => l.name)),
      ...tokenizeNames(doc.actors.map(l => l.aliases).flat()),
      ...tokenizeNames(doc.labels.map(l => l.name))
    ];
  },
  (image: IImageSearchDoc) => image._id
);

export async function buildImageIndex() {
  const timeNow = +new Date();
  log.log("Building image index...");
  for (const image of await Image.getAll()) {
    imageIndex.add(await createImageSearchDoc(image));
  }
  log.message(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  log.log(
    `Index size: ${imageIndex.size()} items, ${memorySizeOf(imageIndex)}`
  );
}
