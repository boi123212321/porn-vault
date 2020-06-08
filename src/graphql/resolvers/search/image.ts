import { imageCollection } from "../../../database";
import * as logger from "../../../logger";
import { searchImages } from "../../../search/image";
import Image from "../../../types/image";

export async function getImages(
  _: unknown,
  { query, seed }: { query: string | undefined; seed?: string }
): Promise<
  | {
      numItems: number;
      numPages: number;
      items: (Image | null)[];
    }
  | undefined
> {
  try {
    const timeNow = +new Date();
    const result = await searchImages(query || "", seed);

    logger.log(
      `Search results: ${result.max_items} hits found in ${(Date.now() - timeNow) / 1000}s`
    );

    const images = await imageCollection.getBulk(result.items);

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return {
      numItems: result.max_items,
      numPages: result.num_pages,
      items: images.filter(Boolean),
    };
  } catch (error) {
    logger.error(error);
  }
}
