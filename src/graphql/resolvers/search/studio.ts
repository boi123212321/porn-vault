import Studio from "../../../types/studio";
import extractQueryOptions, { SortTarget } from "../../../query_extractor";
import * as logger from "../../../logger";
import * as search from "../../../search/index";
import { IStudioSearchDoc } from "../../../search/studio";

const PAGE_SIZE = 24;

export async function getStudios(_, { query }: { query: string | undefined }) {
  try {
    const timeNow = +new Date();
    const options = extractQueryOptions(query);
    logger.log(`Searching studios for '${options.query}'...`);

    const filters = [] as ((doc: IStudioSearchDoc) => boolean)[];

    if (options.bookmark) filters.push((doc) => !!doc.bookmark);

    if (options.favorite) filters.push((doc) => doc.favorite);

    // if (options.rating) filters.push(doc => doc.rating >= options.rating);

    if (options.include && options.include.length)
      filters.push((doc) => {
        return options.include.every((id) =>
          doc.labels.map((l) => l._id).includes(id)
        );
      });

    if (options.exclude && options.exclude.length)
      filters.push((doc) => {
        return options.exclude.every(
          (id) => !doc.labels.map((l) => l._id).includes(id)
        );
      });

    function sortMode(sortBy: SortTarget, sortDir: "asc" | "desc") {
      switch (sortBy) {
        case SortTarget.ADDED_ON:
          if (sortDir == "asc") return (a, b) => a.addedOn - b.addedOn;
          return (a, b) => b.addedOn - a.addedOn;
        /* case SortTarget.RATING:
          if (sortDir == "asc") return (a, b) => a.rating - b.rating;
          return (a, b) => b.rating - a.rating; */
        case SortTarget.ALPHABETIC:
          if (sortDir == "asc") return (a, b) => a.name.localeCompare(b.name);
          return (a, b) => b.name.localeCompare(a.name);
        case SortTarget.NUM_SCENES:
          if (sortDir == "asc") return (a, b) => a.numScenes - b.numScenes;
          return (a, b) => b.numScenes - a.numScenes;
        case SortTarget.BOOKMARK:
          if (sortDir == "asc")
            return (a, b) => (a.bookmark || 0) - (b.bookmark || 0);
          return (a, b) => (b.bookmark || 0) - (a.bookmark || 0);
        default:
          return undefined;
      }
    }

    const result = await search.indices.studios.search({
      query: options.query || "",
      skip: options.page * PAGE_SIZE,
      take: PAGE_SIZE,
      sort: sortMode(options.sortBy, options.sortDir),
      filters,
    });

    const studios = await Promise.all(result.map((i) => Studio.getById(i.id)));
    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);
    return studios.filter(Boolean);
  } catch (error) {
    logger.error(error);
  }
}
