import Movie from "../../types/movie";
import { Dictionary } from "../../types/utility";
import * as logger from "../../logger";
import { indices } from "../../search/index";
import { createMovieSearchDoc } from "../../search/movie";
import { onMovieCreate } from "../../plugin_events/movie";
import { movieCollection } from "../../database";
import MovieScene from "../../types/movie_scene";
import LabelledItem from "../../types/labelled_item";

type IMovieUpdateOpts = Partial<{
  name: string;
  description: string;
  releaseDate: number;
  frontCover: string;
  backCover: string;
  spineCover: string;
  favorite: boolean;
  bookmark: number | null;
  rating: number;
  scenes: string[];
  studio: string | null;
  customFields: Dictionary<string[] | boolean | string | null>;
}>;

export default {
  async addMovie(_, args: Dictionary<any>) {
    let movie = new Movie(args.name, args.scenes);

    if (args.scenes) {
      if (Array.isArray(args.scenes)) await Movie.setScenes(movie, args.scenes);
    }

    try {
      movie = await onMovieCreate(movie);
    } catch (error) {
      logger.log(error);
      logger.error(error.message);
    }

    await movieCollection.upsert(movie._id, movie);
    indices.movies.add(await createMovieSearchDoc(movie));

    return movie;
  },

  async removeMovies(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const movie = await Movie.getById(id);

      if (movie) {
        await Movie.remove(movie._id);
        indices.movies.remove(movie._id);

        await LabelledItem.removeByItem(movie._id);
        await MovieScene.removeByMovie(movie._id);
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

        if (opts.studio !== undefined) movie.studio = opts.studio;

        if (typeof opts.frontCover == "string")
          movie.frontCover = opts.frontCover;

        if (typeof opts.backCover == "string") movie.backCover = opts.backCover;

        if (typeof opts.spineCover == "string")
          movie.spineCover = opts.spineCover;

        if (Array.isArray(opts.scenes))
          await Movie.setScenes(movie, opts.scenes);

        if (typeof opts.bookmark == "number" || opts.bookmark === null)
          movie.bookmark = opts.bookmark;

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

        await movieCollection.upsert(movie._id, movie);
        updatedScenes.push(movie);
        indices.movies.update(movie._id, await createMovieSearchDoc(movie));
      }
    }

    return updatedScenes;
  },
};
