import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Movie from "../../types/movie";
import { mapAsync } from "../../types/utility";
import Studio from "../../types/studio";
import Image from "../../types/image";
import * as database from "../../database/index";
import CustomField from "../../types/custom_field";
import { getImages } from "./search/image";
import { getScenes } from "./search/scene";
import { getActors } from "./search/actor";
import { getStudios } from "./search/studio";
import { getMovies } from "./search/movie";
import { twigsVersion } from "../../search/index";
import { getLength, isProcessing } from "../../queue/processing";

export default {
  async twigs() {
    return {
      version: await twigsVersion()
    };
  },

  async getScenesWithoutStudios(_, { num }: { num: number }) {
    const numStudios = await database.count(database.store.studios, {});

    if (numStudios == 0) return [];

    return (await Scene.getAll())
      .filter(s => s.studio === null)
      .slice(0, num || 12);
  },

  async getScenesWithoutLabels(_, { num }: { num: number }) {
    return (
      await mapAsync(await Scene.getAll(), async scene => ({
        scene,
        numLabels: (await Scene.getLabels(scene)).length
      }))
    )
      .filter(i => i.numLabels == 0)
      .map(i => i.scene)
      .slice(0, num || 12);
  },

  async getActorsWithoutLabels(_, { num }: { num: number }) {
    return (
      await mapAsync(await Actor.getAll(), async actor => ({
        actor,
        numLabels: (await Actor.getLabels(actor)).length
      }))
    )
      .filter(i => i.numLabels == 0)
      .map(i => i.actor)
      .slice(0, num || 12);
  },

  async getScenesWithoutActors(_, { num }: { num: number }) {
    return (
      await mapAsync(await Scene.getAll(), async scene => ({
        scene,
        numActors: (await Scene.getActors(scene)).length
      }))
    )
      .filter(i => i.numActors == 0)
      .map(i => i.scene)
      .slice(0, num || 12);
  },

  async getActorsWithoutScenes(_, { num }: { num: number }) {
    return (
      await mapAsync(await Actor.getAll(), async actor => ({
        actor,
        numScenes: (await Scene.getByActor(actor._id)).length
      }))
    )
      .filter(i => i.numScenes == 0)
      .map(i => i.actor)
      .slice(0, num || 12);
  },

  async topActors(_, { num }: { num: number }) {
    return (await Actor.getTopActors()).slice(0, num || 12);
  },

  async getQueueInfo() {
    return {
      length: await getLength(),
      processing: isProcessing()
    };
  },

  getStudios,

  getMovies,

  getActors,
  getScenes,
  getImages,

  async getImageById(_, { id }: { id: string }) {
    return await Image.getById(id);
  },

  async getSceneById(_, { id }: { id: string }) {
    return await Scene.getById(id);
  },

  async getActorById(_, { id }: { id: string }) {
    return await Actor.getById(id);
  },

  async getMovieById(_, { id }: { id: string }) {
    return await Movie.getById(id);
  },

  async getStudioById(_, { id }: { id: string }) {
    return await Studio.getById(id);
  },

  async getLabelById(_, { id }: { id: string }) {
    return await Label.getById(id);
  },
  async getCustomFields() {
    const fields = await CustomField.getAll();
    return fields.sort((a, b) => a.name.localeCompare(b.name));
  },
  async getLabels() {
    const labels = await Label.getAll();
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  },
  async numScenes() {
    return await database.count(database.store.scenes, {});
  },
  async numActors() {
    return await database.count(database.store.actors, {});
  },
  async numMovies() {
    return await database.count(database.store.movies, {});
  },
  async numLabels() {
    return await database.count(database.store.labels, {});
  },
  async numStudios() {
    return await database.count(database.store.studios, {});
  },
  async numImages() {
    return await database.count(database.store.images, {});
  },
  async actorGraph() {
    const actors = await Actor.getAll();

    let links = [] as {
      _id: string;
      from: string;
      to: string;
      title: string;
    }[];

    for (const actor of actors) {
      const collabs = await Actor.getCollabs(actor);

      for (const collab of collabs) {
        for (const other of collab.actors) {
          links.push({
            from: actor._id,
            to: other._id,
            title: collab.scene.name,
            _id: collab.scene._id
          });
        }
      }
    }

    // TODO: Remove duplicates?

    return {
      actors,
      links: { items: links }
    };
  },
  async getSceneLabelUsage() {
    const scores = {} as Record<string, { label: Label; score: number }>;
    for (const scene of await Scene.getAll()) {
      for (const label of await Scene.getLabels(scene)) {
        const item = scores[label._id];
        scores[label._id] = item
          ? { label, score: item.score + 1 }
          : {
              label,
              score: 0
            };
      }
    }
    return Object.keys(scores)
      .map(key => ({
        label: scores[key].label,
        score: scores[key].score
      }))
      .sort((a, b) => b.score - a.score);
  },
  async getActorLabelUsage() {
    const scores = {} as Record<string, { label: Label; score: number }>;
    for (const actor of await Actor.getAll()) {
      for (const label of await Actor.getLabels(actor)) {
        const item = scores[label._id];
        scores[label._id] = item
          ? { label, score: item.score + 1 }
          : {
              label,
              score: 0
            };
      }
    }
    return Object.keys(scores)
      .map(key => ({
        label: scores[key].label,
        score: scores[key].score
      }))
      .sort((a, b) => b.score - a.score);
  }
};
