import Image from "../../../types/image";
import extractQueryOptions, { SortTarget } from "../../../query_extractor";
import * as logger from "../../../logger/index";
import * as search from "../../../search/index";
import { IImageSearchDoc } from "../../../search/image";

const PAGE_SIZE = 24;

export async function getImages(
  _,
  { query, auto }: { query: string | undefined; auto?: boolean | null }
) {
  try {
    const timeNow = +new Date();
    const options = extractQueryOptions(query);
    logger.log(`Searching images for '${options.query}'...`);

    const filters = [] as ((doc: IImageSearchDoc) => boolean)[];

    if (options.bookmark) filters.push(doc => doc.bookmark);

    if (options.favorite) filters.push(doc => doc.favorite);

    if (options.rating) filters.push(doc => doc.rating >= options.rating);

    if (options.scenes && options.scenes.length)
      filters.push(doc => {
        return options.scenes.some(id => doc.scene == id);
      });

    if (options.actors && options.actors.length)
      filters.push(doc => {
        return options.actors.every(id =>
          doc.actors.map(l => l._id).includes(id)
        );
      });

    if (options.include && options.include.length)
      filters.push(doc => {
        return options.include.every(id =>
          doc.labels.map(l => l._id).includes(id)
        );
      });

    // Filter thumbnails, screenshots, previews
    if (!auto)
      filters.push(doc =>
        [
          "(thumbnail)",
          "(preview)",
          "(screenshot)",
          "(front cover)",
          "(back cover)"
        ].every(ending => !doc.name.endsWith(ending))
      );

    function sortMode(sortBy: SortTarget, sortDir: "asc" | "desc") {
      switch (sortBy) {
        case SortTarget.ADDED_ON:
          if (sortDir == "asc") return (a, b) => a.addedOn - b.addedOn;
          return (a, b) => b.addedOn - a.addedOn;
        case SortTarget.RATING:
          if (sortDir == "asc") return (a, b) => a.rating - b.rating;
          return (a, b) => b.rating - a.rating;
        case SortTarget.ALPHABETIC:
          if (sortDir == "asc") return (a, b) => a.name.localeCompare(b.name);
          return (a, b) => b.name.localeCompare(a.name);
        default:
          return undefined;
      }
    }

    const result = await search.indices.images.search({
      query: options.query || "",
      skip: options.page * PAGE_SIZE,
      take: PAGE_SIZE,
      sort: sortMode(options.sortBy, options.sortDir),
      filters
    });

    const images = await Promise.all(result.map(i => Image.getById(i.id)));
    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);
    return images;
  } catch (error) {
    logger.error(error);
  }
}
