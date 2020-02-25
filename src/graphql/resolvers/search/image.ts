import Image from "../../../types/image";
import * as logger from "../../../logger";
import { searchImages } from "../../../search/image";

export async function getImages(
  _,
  { query, auto }: { query: string | undefined; auto?: boolean | null }
) {
  try {
    const timeNow = +new Date();

    const res = await searchImages(query || "");

    // Filter thumbnails, screenshots, previews
    // TODO: reimplement in twigs
    /* if (!auto)
     filters.push(doc =>
       [
         "(thumbnail)",
         "(preview)",
         "(screenshot)",
         "(front cover)",
         "(back cover)"
       ].every(ending => !doc.name.endsWith(ending))
     ); */

    logger.log(
      `Search results: ${res.data.num_hits} hits found in ${res.data.time.sec} sec`
    );

    const images = await Promise.all(res.data.items.map(Image.getById));
    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);
    return images.filter(Boolean);
  } catch (error) {
    logger.error(error);
  }
}
