import * as database from "../../database";
import Movie from "../../types/movie";
import { Dictionary } from "../../types/utility";

type IMovieUpdateOpts = Partial<{
  name: string;
  description: string;
  releaseDate: number;
  frontCover: string;
  backCover: string;
  favorite: boolean;
  bookmark: boolean;
  rating: number;
  scenes: string[];
}>;

export default {
  async addMovie(_, args: Dictionary<any>) {
    const movie = new Movie(args.name, args.scenes);
    await database.insert(database.store.movies, movie);
    return movie;
  },

  async removeMovies(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const movie = await Movie.getById(id);

      if (movie) {
        await Movie.remove(movie._id);
      }
    }
    return true;
  },

  async addScenesToMovie(_, { id, scenes }: { id: string; scenes: string[] }) {
    const movie = await Movie.getById(id);

    if (movie) {
      if (Array.isArray(scenes)) movie.scenes.push(...scenes);

      movie.scenes = [...new Set(movie.scenes)];

      await database.update(
        database.store.movies,
        { _id: movie._id },
        { $set: { scenes: movie.scenes } }
      );

      return movie;
    } else {
      throw new Error(`Movie ${id} not found`);
    }
  },

  async updateMovies(
    _,
    { ids, opts }: { ids: string[]; opts: IMovieUpdateOpts }
  ) {
    const updatedScenes = [] as Movie[];

    for (const id of ids) {
      const movie = await Movie.getById(id);

      if (movie) {
        if (typeof opts.name == "string") movie.name = opts.name.trim();

        if (typeof opts.description == "string")
          movie.description = opts.description.trim();

        if (typeof opts.backCover == "string") movie.backCover = opts.backCover;

        if (typeof opts.frontCover == "string")
          movie.frontCover = opts.frontCover;

        if (Array.isArray(opts.scenes))
          movie.scenes = [...new Set(opts.scenes)];

        if (typeof opts.bookmark == "boolean") movie.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") movie.favorite = opts.favorite;

        if (typeof opts.rating == "number") movie.rating = opts.rating;

        if (typeof opts.releaseDate == "number")
          movie.releaseDate = opts.releaseDate;

        await database.update(database.store.movies, { _id: movie._id }, movie);
        updatedScenes.push(movie);
      }
    }

    return updatedScenes;
  }
};
