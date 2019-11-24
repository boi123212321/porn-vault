import Movie from "../../types/movie";
import Image from "../../types/image";

export default {
  frontCover(movie: Movie) {
    if (movie.frontCover) return Image.getById(movie.frontCover);
    return null;
  },

  backCover(movie: Movie) {
    if (movie.backCover) return Image.getById(movie.backCover);
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
    const scenesWithScore = (await Movie.getScenes(movie)).filter(
      scene => !!scene.rating
    );

    if (!scenesWithScore.length) return null;

    return Math.round(
      scenesWithScore.reduce((rating, scene) => rating + scene.rating, 0) /
        scenesWithScore.length
    );
  },

  async duration(movie: Movie) {
    const scenesWithSource = (await Movie.getScenes(movie)).filter(
      scene => scene.meta && scene.path
    );

    if (!scenesWithSource.length) return null;

    return scenesWithSource.reduce(
      (dur, scene) => dur + <number>scene.meta.duration,
      0
    );
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
  }
};
