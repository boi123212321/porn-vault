import Actor from "../../../types/actor";
import extractQueryOptions, { SortTarget } from "../../../query_extractor";
import * as logger from "../../../logger";
import * as search from "../../../search/index";
import { IActorSearchDoc } from "../../../search/actor";

const PAGE_SIZE = 24;

export async function getActors(_, { query }: { query: string | undefined }) {
  try {
    const timeNow = +new Date();
    const options = extractQueryOptions(query);
    logger.log(`Searching actors for '${options.query}'...`);

    const filters = [] as ((doc: IActorSearchDoc) => boolean)[];

    if (options.bookmark) filters.push((doc) => !!doc.bookmark);

    if (options.favorite) filters.push((doc) => doc.favorite);

    if (options.rating) filters.push((doc) => doc.rating >= options.rating);

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
        case SortTarget.RATING:
          if (sortDir == "asc") return (a, b) => a.rating - b.rating;
          return (a, b) => b.rating - a.rating;
        case SortTarget.ALPHABETIC:
          if (sortDir == "asc") return (a, b) => a.name.localeCompare(b.name);
          return (a, b) => b.name.localeCompare(a.name);
        case SortTarget.VIEWS:
          if (sortDir == "asc") return (a, b) => a.views - b.views;
          return (a, b) => b.views - a.views;
        case SortTarget.VIEWS:
          if (sortDir == "asc") return (a, b) => a.views - b.views;
          return (a, b) => b.views - a.views;
        case SortTarget.DATE:
          if (sortDir == "asc")
            return (a, b) => (b.bornOn || 0) - (a.bornOn || 0);
          return (a, b) => (a.bornOn || 0) - (b.bornOn || 0);
        case SortTarget.BOOKMARK:
          if (sortDir == "asc")
            return (a, b) => (a.bookmark || 0) - (b.bookmark || 0);
          return (a, b) => (b.bookmark || 0) - (a.bookmark || 0);
        case SortTarget.NUM_SCENES:
          if (sortDir == "asc") return (a, b) => a.numScenes - b.numScenes;
          return (a, b) => b.numScenes - a.numScenes;
        default:
          return undefined;
      }
    }

    const result = await search.indices.actors.search({
      query: options.query || "",
      skip: options.page * PAGE_SIZE,
      take: PAGE_SIZE,
      sort: sortMode(options.sortBy, options.sortDir),
      filters,
    });

    const actors = await Promise.all(result.map((i) => Actor.getById(i.id)));
    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);
    return actors.filter(Boolean);
  } catch (error) {
    logger.error(error);
  }
}
