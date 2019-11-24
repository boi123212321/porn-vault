import Scene from "../../types/scene";
import Image from "../../types/image";
import Actor from "../../types/actor";
import Label from "../../types/label";

export default {
  async scenes(actor: Actor) {
    return await Scene.getByActor(actor._id);
  },
  async images(actor: Actor) {
    return await Image.getByActor(actor._id);
  },
  async labels(actor: Actor) {
    return await Promise.all(actor.labels.map(id => Label.getById(id)));
  },
  async thumbnail(actor: Actor) {
    if (actor.thumbnail) return await Image.getById(actor.thumbnail);
    return null;
  },
  async watches(actor: Actor) {
    return await Actor.getWatches(actor);
  }
};
