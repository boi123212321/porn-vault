import Scene from "../../../types/scene";
import extractQueryOptions, { SortTarget } from "../../../query_extractor";
import * as logger from "../../../logger/index";
import * as search from "../../../search/index";
import { ISceneSearchDoc } from "../../../search/scene";

const PAGE_SIZE = 24;

export async function getScenes(
  _,
  { query, random }: { random: boolean | undefined; query: string | undefined }
) {
  try {
    const timeNow = +new Date();
    const options = extractQueryOptions(query);
    logger.log(`Searching scenes for '${options.query}'...`);

    const filters = [] as ((doc: ISceneSearchDoc) => boolean)[];

    if (options.bookmark) filters.push(doc => doc.bookmark);

    if (options.favorite) filters.push(doc => doc.favorite);

    if (options.rating) filters.push(doc => doc.rating >= options.rating);

    if (options.durationMin)
      filters.push(doc => {
        if (!doc.duration) return false;
        return doc.duration >= <number>options.durationMin;
      });

    if (options.durationMax)
      filters.push(doc => {
        if (!doc.duration) return false;
        return doc.duration <= <number>options.durationMax;
      });

    if (options.studios && options.studios.length)
      filters.push(doc => {
        if (!doc.studio) return false;
        // @ts-ignore
        return options.studios.some(id => doc.studio._id == id);
      });

    if (options.include && options.include.length)
      filters.push(doc => {
        return options.include.every(id =>
          doc.labels.map(l => l._id).includes(id)
        );
      });

    if (options.exclude && options.exclude.length)
      filters.push(doc => {
        return !options.exclude.some(id =>
          doc.labels.map(l => l._id).includes(id)
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
        case SortTarget.DURATION:
          if (sortDir == "asc") return (a, b) => a.duration - b.duration;
          return (a, b) => b.duration - a.duration;
        case SortTarget.DATE:
          if (sortDir == "asc")
            return (a, b) => (a.releaseDate || 0) - (b.releaseDate || 0);
          return (a, b) => (b.releaseDate || 0) - (a.releaseDate || 0);
        case SortTarget.RESOLUTION:
          if (sortDir == "asc")
            return (a, b) => (a.resolution || 0) - (b.resolution || 0);
          return (a, b) => (b.resolution || 0) - (a.resolution || 0);
        case SortTarget.SIZE:
          if (sortDir == "asc") return (a, b) => (a.size || 0) - (b.size || 0);
          return (a, b) => (b.size || 0) - (a.size || 0);
        default:
          return undefined;
      }
    }

    const result = await search.indices.scenes.search({
      query: options.query || "",
      skip: options.page * PAGE_SIZE,
      take: PAGE_SIZE,
      sort: sortMode(options.sortBy, options.sortDir),
      filters,
      random
    });

    const scenes = await Promise.all(result.map(i => Scene.getById(i.id)));
    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);
    return scenes;
  } catch (error) {
    logger.error(error);
  }
}
