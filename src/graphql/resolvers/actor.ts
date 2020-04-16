import Scene from "../../types/scene";
import Image from "../../types/image";
import Actor from "../../types/actor";
import CustomField, { CustomFieldTarget } from "../../types/custom_field";
import { createObjectSet } from "../../types/utility";

export default {
  async scenes(actor: Actor) {
    return await Scene.getByActor(actor._id);
  },
  async labels(actor: Actor) {
    return await Actor.getLabels(actor);
  },
  async avatar(actor: Actor) {
    if (actor.avatar) return await Image.getById(actor.avatar);
    return null;
  },
  async thumbnail(actor: Actor) {
    if (actor.thumbnail) return await Image.getById(actor.thumbnail);
    return null;
  },
  async altThumbnail(actor: Actor) {
    if (actor.altThumbnail) return await Image.getById(actor.altThumbnail);
    return null;
  },
  async hero(actor: Actor) {
    if (actor.hero) return await Image.getById(actor.hero);
    return null;
  },
  async watches(actor: Actor) {
    const watches = await Actor.getWatches(actor);
    return watches;
  },
  async numScenes(actor: Actor) {
    return (await Scene.getByActor(actor._id)).length;
  },
  async availableFields() {
    const fields = await CustomField.getAll();
    return fields.filter((field) =>
      field.target.includes(CustomFieldTarget.ACTORS)
    );
  },
  age(actor: Actor) {
    return Actor.getAge(actor);
  },
  async movies(actor: Actor) {
    return Actor.getMovies(actor);
  },
  async collabs(actor: Actor) {
    const collabs = await Actor.getCollabs(actor);
    const actors = collabs.map((c) => c.actors).flat();
    return createObjectSet(actors, "_id");
  },
};
