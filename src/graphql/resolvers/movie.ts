import Movie from "../../types/movie";
import Image from "../../types/image";
import Studio from "../../types/studio";

export default {
  frontCover(movie: Movie) {
    if (movie.frontCover) return Image.getById(movie.frontCover);
    return null;
  },

  backCover(movie: Movie) {
    if (movie.backCover) return Image.getById(movie.backCover);
    return null;
  },

  spineCover(movie: Movie) {
    if (movie.spineCover) return Image.getById(movie.spineCover);
    return null;
  },

  scenes(movie: Movie) {
    return Movie.getScenes(movie);
  },

  actors(movie: Movie) {
    return Movie.getActors(movie);
  },

  labels(movie: Movie) {
    return Movie.getLabels(movie);
  },

  async rating(movie: Movie) {
    return await Movie.getRating(movie);
  },

  async duration(movie: Movie) {
    return await Movie.calculateDuration(movie);
  },

  async size(movie: Movie) {
    const scenesWithSource = (await Movie.getScenes(movie)).filter(
      scene => scene.meta && scene.path
    );

    if (!scenesWithSource.length) return null;

    return scenesWithSource.reduce(
      (dur, scene) => dur + <number>scene.meta.size,
      0
    );
  },

  async studio(movie: Movie) {
    if (movie.studio) return Studio.getById(movie.studio);
    return null;
  }
};
