import { SearchIndex } from "./engine";
import Movie from "../types/movie";
import { tokenizeNames, tokenize } from "./tokenize";
import Studio from "../types/studio";
import * as log from "../logger/index";
import { memorySizeOf } from "../mem";

export interface IMovieSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  actors: { _id: string; name: string; aliases: string[] }[];
  labels: { _id: string; name: string; aliases: string[] }[];
  rating: number;
  bookmark: boolean;
  favorite: boolean;
  releaseDate: number | null;
  duration: number | null;
  studio: Studio | null;
}

export async function createMovieSearchDoc(
  movie: Movie
): Promise<IMovieSearchDoc> {
  const labels = await Movie.getLabels(movie);
  const actors = await Movie.getActors(movie);

  return {
    _id: movie._id,
    addedOn: movie.addedOn,
    name: movie.name,
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
    studio: movie.studio ? await Studio.getById(movie.studio) : null,
    rating: await Movie.getRating(movie),
    bookmark: movie.bookmark,
    favorite: movie.favorite,
    duration: await Movie.calculateDuration(movie),
    releaseDate: movie.releaseDate
  };
}

export const movieIndex = new SearchIndex(
  (doc: IMovieSearchDoc) => {
    return [
      ...tokenize(doc.name),
      ...tokenizeNames(doc.actors.map(l => l.name)),
      ...tokenizeNames(doc.actors.map(l => l.aliases).flat()),
      ...tokenizeNames(doc.labels.map(l => l.name)),
      ...tokenize(doc.studio ? doc.studio.name : "")
    ];
  },
  (movie: IMovieSearchDoc) => movie._id
);

export async function buildMovieIndex() {
  const timeNow = +new Date();
  log.log("Building movie index...");
  for (const movie of await Movie.getAll()) {
    movieIndex.add(await createMovieSearchDoc(movie));
  }
  log.message(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
  log.log(
    `Index size: ${movieIndex.size()} items, ${memorySizeOf(movieIndex)}`
  );
}
