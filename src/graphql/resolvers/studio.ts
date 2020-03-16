import Studio from "../../types/studio";
import Image from "../../types/image";

export default {
  thumbnail(studio: Studio) {
    if (studio.thumbnail) return Image.getById(studio.thumbnail);
    return null;
  },

  scenes(studio: Studio) {
    return Studio.getScenes(studio);
  },

  actors(studio: Studio) {
    return Studio.getActors(studio);
  },

  labels(studio: Studio) {
    return Studio.getLabels(studio);
  },

  movies(studio: Studio) {
    return Studio.getMovies(studio);
  },

  async rating(studio: Studio) {
    const scenesWithScore = (await Studio.getScenes(studio)).filter(
      scene => !!scene.rating
    );

    if (!scenesWithScore.length) return null;

    return Math.round(
      scenesWithScore.reduce((rating, scene) => rating + scene.rating, 0) /
        scenesWithScore.length
    );
  },

  async parent(studio: Studio) {
    if (studio.parent) return await Studio.getById(studio.parent);
    return null;
  },

  async substudios(studio: Studio) {
    return await Studio.getSubStudios(studio._id);
  },

  async numScenes(studio: Studio) {
    return (await Studio.getScenes(studio)).length;
  }
};
