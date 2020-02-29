import Scene from "../../../types/scene";
import * as logger from "../../../logger";
import { searchScenes } from "../../../search/scene";

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getScenes(
  _,
  { query, random }: { random: number | undefined; query: string | undefined }
) {
  try {
    const timeNow = +new Date();
    const res = await searchScenes(query || "", random);

    if (random) {
      logger.log("Randomizing items...");
      res.data.items = shuffle(res.data.items).slice(0, random);
    }

    logger.log(
      `Search results: ${res.data.num_hits} hits found in ${res.data.time.sec} sec`
    );

    const scenes = await Promise.all(res.data.items.map(Scene.getById));
    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);
    return scenes.filter(Boolean);
  } catch (error) {
    logger.error(error);
  }
}
