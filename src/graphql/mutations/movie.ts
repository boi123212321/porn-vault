import * as database from "../../database";
import Movie from "../../types/movie";
import { Dictionary } from "../../types/utility";
import * as logger from "../../logger";

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
  studio: string | null;
  customFields: Dictionary<string[] | boolean | string | null>;
}>;

export default {
  async addMovie(_, args: Dictionary<any>) {
    const movie = new Movie(args.name, args.scenes);
    await database.insert(database.store.movies, movie);

    if (args.scenes) {
      if (Array.isArray(args.scenes)) await Movie.setScenes(movie, args.scenes);
    }
    return movie;
  },

  async removeMovies(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const movie = await Movie.getById(id);

      if (movie) {
        await Movie.remove(movie._id);
        await database.remove(database.store.crossReferences, {
          from: movie._id
        });
        await database.remove(database.store.crossReferences, {
          to: movie._id
        });
      }
    }
    return true;
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

        if (opts.studio !== undefined) movie.studio = opts.studio;

        if (typeof opts.frontCover == "string")
          movie.frontCover = opts.frontCover;

        if (Array.isArray(opts.scenes))
          await Movie.setScenes(movie, opts.scenes);

        if (typeof opts.bookmark == "boolean") movie.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") movie.favorite = opts.favorite;

        if (typeof opts.rating == "number") movie.rating = opts.rating;

        if (opts.releaseDate !== undefined)
          movie.releaseDate = opts.releaseDate;

        if (opts.customFields) {
          for (const key in opts.customFields) {
            const value =
              opts.customFields[key] !== undefined
                ? opts.customFields[key]
                : null;
            logger.log(`Set scene custom.${key} to ${value}`);
            opts.customFields[key] = value;
          }
          movie.customFields = opts.customFields;
        }

        await database.update(database.store.movies, { _id: movie._id }, movie);
        updatedScenes.push(movie);
      }
    }

    return updatedScenes;
  }
};
