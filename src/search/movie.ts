import ora from "ora";

import argv from "../args";
import * as logger from "../logger";
import extractQueryOptions from "../query_extractor";
import Movie from "../types/movie";
import Studio from "../types/studio";
import { mapAsync } from "../types/utility";
import {
  filterActors,
  filterBookmark,
  filterDuration,
  filterExclude,
  filterFavorites,
  filterInclude,
  filterRating,
  filterStudios,
} from "./common";
import { Gianna } from "./internal/index";

const PAGE_SIZE = 24;

export let index!: Gianna.Index<IMovieSearchDoc>;

const FIELDS = ["name", "actorNames", "labelNames", "studioName"];

export interface IMovieSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  actors: string[];
  labels: string[];
  actorNames: string[];
  labelNames: string[];
  rating: number;
  bookmark: number | null;
  favorite: boolean;
  releaseDate: number | null;
  duration: number | null;
  studio: string | null;
  studioName: string | null;
  numScenes: number;
}

export async function createMovieSearchDoc(movie: Movie): Promise<IMovieSearchDoc> {
  const labels = await Movie.getLabels(movie);
  const actors = await Movie.getActors(movie);
  const studio = movie.studio ? await Studio.getById(movie.studio) : null;
  const scenes = await Movie.getScenes(movie);

  return {
    _id: movie._id,
    addedOn: movie.addedOn,
    name: movie.name,
    labels: labels.map((l) => l._id),
    actors: actors.map((a) => a._id),
    actorNames: actors.map((a) => [a.name, ...a.aliases]).flat(),
    labelNames: labels.map((l) => [l.name, ...l.aliases]).flat(),
    studio: studio ? studio._id : null,
    studioName: studio ? studio.name : null,
    rating: await Movie.getRating(movie),
    bookmark: movie.bookmark,
    favorite: movie.favorite,
    duration: await Movie.calculateDuration(movie),
    releaseDate: movie.releaseDate,
    numScenes: scenes.length,
  };
}

async function addMovieSearchDocs(docs: IMovieSearchDoc[]) {
  logger.log(`Indexing ${docs.length} items...`);
  const timeNow = +new Date();
  const res = await index.index(docs);
  logger.log(`Gianna indexing done in ${(Date.now() - timeNow) / 1000}s`);
  return res;
}

export async function updateMovies(movies: Movie[]): Promise<void> {
  return index.update(await mapAsync(movies, createMovieSearchDoc));
}

export async function indexMovies(movies: Movie[]): Promise<number> {
  let docs = [] as IMovieSearchDoc[];
  let numItems = 0;
  for (const movie of movies) {
    docs.push(await createMovieSearchDoc(movie));

    if (docs.length === (argv["index-slice-size"] || 5000)) {
      await addMovieSearchDocs(docs);
      numItems += docs.length;
      docs = [];
    }
  }
  if (docs.length) {
    await addMovieSearchDocs(docs);
    numItems += docs.length;
  }
  docs = [];
  return numItems;
}

export async function buildMovieIndex(): Promise<Gianna.Index<IMovieSearchDoc>> {
  index = await Gianna.createIndex("movies", FIELDS);

  const timeNow = +new Date();
  const loader = ora("Building movie index...").start();

  const res = await indexMovies(await Movie.getAll());

  loader.succeed(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  logger.log(`Index size: ${res} items`);

  return index;
}

export async function searchMovies(
  query: string,
  shuffleSeed = "default"
): Promise<Gianna.ISearchResults> {
  const options = extractQueryOptions(query);
  logger.log(`Searching scenes for '${options.query}'...`);

  let sort = undefined as Gianna.ISortOptions | undefined;
  const filter = {
    type: "AND",
    children: [],
  } as Gianna.IFilterTreeGrouping;

  filterDuration(filter, options);
  filterFavorites(filter, options);
  filterBookmark(filter, options);
  filterRating(filter, options);
  filterInclude(filter, options);
  filterExclude(filter, options);
  filterActors(filter, options);
  filterStudios(filter, options);

  if (options.sortBy) {
    if (options.sortBy === "$shuffle") {
      sort = {
        // eslint-disable-next-line camelcase
        sort_by: "$shuffle",
        // eslint-disable-next-line camelcase
        sort_asc: false,
        // eslint-disable-next-line camelcase
        sort_type: shuffleSeed,
      };
    } else {
      const sortType: string = {
        addedOn: "number",
        name: "string",
        rating: "number",
        bookmark: "number",
        releaseDate: "number",
        duration: "number",
      }[options.sortBy];
      sort = {
        // eslint-disable-next-line camelcase
        sort_by: options.sortBy,
        // eslint-disable-next-line camelcase
        sort_asc: options.sortDir === "asc",
        // eslint-disable-next-line camelcase
        sort_type: sortType,
      };
    }
  }

  return index.search({
    query: options.query,
    skip: options.skip || options.page * 24,
    take: options.take || options.take || PAGE_SIZE,
    sort,
    filter,
  });
}
