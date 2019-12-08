import Scene from "../../types/scene";
import Image from "../../types/image";
import Actor from "../../types/actor";
import Studio from "../../types/studio";

export default {
  async actors(image: Image) {
    return await Image.getActors(image);
  },
  async scene(image: Image) {
    if (image.scene) return await Scene.getById(image.scene);
    return null;
  },
  async labels(image: Image) {
    return await Image.getLabels(image);
  },

  async studio(image: Image) {
    if (image.studio) return Studio.getById(image.studio);
    return null;
  }
};
