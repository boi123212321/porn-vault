import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import * as logger from "../../logger";
import Image from "../../types/image";
import { extractLabels, extractActors } from "../../extractor";
import { Dictionary, mapAsync } from "../../types/utility";
import { getConfig } from "../../config/index";
import Studio from "../../types/studio";
import Marker from "../../types/marker";
import { removeSceneDoc, updateSceneDoc } from "../../search/scene";
import { onSceneCreate } from "../../plugin_events/scene";
import { sceneCollection } from "../../database";
import { removeSceneFromQueue } from "../../queue/processing";
import LabelledItem from "../../types/labelled_item";
import ActorReference from "../../types/actor_reference";
import MarkerReference from "../../types/marker_reference";
import MovieScene from "../../types/movie_scene";

type ISceneUpdateOpts = Partial<{
  favorite: boolean;
  bookmark: number;
  actors: string[];
  name: string;
  description: string;
  rating: number;
  labels: string[];
  streamLinks: string[];
  thumbnail: string;
  releaseDate: number;
  studio: string | null;
  customFields: Dictionary<string[] | boolean | string | null>;
}>;

async function runScenePlugins(ids: string[]) {
  const changedScenes = [] as Scene[];
  for (const id of ids) {
    let scene = await Scene.getById(id);

    if (scene) {
      const labels = (await Scene.getLabels(scene)).map((l) => l._id);
      const actors = (await Scene.getActors(scene)).map((a) => a._id);
      logger.log("Labels before plugin: ", labels);
      scene = await onSceneCreate(scene, labels, actors, "sceneCustom");
      logger.log("Labels after plugin: ", labels);

      await Scene.setLabels(scene, labels);
      await Scene.setActors(scene, actors);
      await sceneCollection.upsert(scene._id, scene);
      await updateSceneDoc(scene);

      changedScenes.push(scene);
    }
  }
  return changedScenes;
}

export default {
  async runAllScenePlugins() {
    const ids = (await Scene.getAll()).map((a) => a._id);
    return runScenePlugins(ids);
  },

  async runScenePlugins(_, { ids }: { ids: string[] }) {
    return runScenePlugins(ids);
  },

  async screenshotScene(_, { id, sec }: { id: string; sec: number }) {
    const scene = await Scene.getById(id);

    if (scene) {
      const image = await Scene.screenshot(scene, sec);
      return image;
    }
    return null;
  },

  async unwatchScene(_, { id }: { id: string }) {
    const scene = await Scene.getById(id);

    if (scene) {
      await Scene.unwatch(scene);
      return scene;
    }
    return null;
  },

  async watchScene(_, { id }: { id: string }) {
    const scene = await Scene.getById(id);

    if (scene) {
      await Scene.watch(scene);
      return scene;
    }
    return null;
  },

  async addScene(_, args: Dictionary<any>) {
    for (const actor of args.actors || []) {
      const actorInDb = await Actor.getById(actor);
      if (!actorInDb) throw new Error(`Actor ${actor} not found`);
    }

    for (const label of args.labels || []) {
      const labelInDb = await Label.getById(label);
      if (!labelInDb) throw new Error(`Label ${label} not found`);
    }

    const config = getConfig();

    const sceneName = args.name;
    const scene = new Scene(sceneName);

    let actors = [] as string[];
    if (args.actors) {
      actors = args.actors;
    }

    // Extract actors
    const extractedActors = await extractActors(scene.name);
    logger.log(`Found ${extractedActors.length} actors in scene title.`);
    actors.push(...extractedActors);
    await Scene.setActors(scene, actors);

    let labels = [] as string[];
    if (args.labels) {
      labels = args.labels;
    }

    // Extract labels
    const extractedLabels = await extractLabels(scene.name);
    logger.log(`Found ${extractedLabels.length} labels in scene title.`);
    labels.push(...extractedLabels);

    if (config.APPLY_ACTOR_LABELS === true) {
      logger.log("Applying actor labels to scene");
      labels.push(
        ...(
          await Promise.all(
            extractedActors.map(async (id) => {
              const actor = await Actor.getById(id);
              if (!actor) return [];
              return (await Actor.getLabels(actor)).map((l) => l._id);
            })
          )
        ).flat()
      );
    }

    await Scene.setLabels(scene, labels);
    await sceneCollection.upsert(scene._id, scene);
    logger.success(`Scene '${sceneName}' done.`);
    return scene;
  },

  async updateScenes(
    _,
    { ids, opts }: { ids: string[]; opts: ISceneUpdateOpts }
  ) {
    const config = getConfig();
    const updatedScenes = [] as Scene[];

    for (const id of ids) {
      const scene = await Scene.getById(id);

      if (scene) {
        const sceneLabels = (await Scene.getLabels(scene)).map((l) => l._id);
        if (typeof opts.name == "string") scene.name = opts.name.trim();

        if (typeof opts.description == "string")
          scene.description = opts.description.trim();

        if (typeof opts.thumbnail == "string") scene.thumbnail = opts.thumbnail;

        if (opts.studio !== undefined) {
          scene.studio = opts.studio;

          if (config.APPLY_STUDIO_LABELS === true && opts.studio) {
            const studio = await Studio.getById(opts.studio);

            if (studio) {
              const studioLabels = (await Studio.getLabels(studio)).map(
                (l) => l._id
              );
              logger.log("Applying studio labels to scene");
              await Scene.setLabels(scene, sceneLabels.concat(studioLabels));
            }
          }
        }

        if (Array.isArray(opts.actors)) {
          const actorIds = [...new Set(opts.actors)];
          await Scene.setActors(scene, actorIds);

          const existingLabels = (await Scene.getLabels(scene)).map(
            (l) => l._id
          );

          if (config.APPLY_ACTOR_LABELS === true) {
            const actors = (await mapAsync(actorIds, Actor.getById)).filter(
              Boolean
            ) as Actor[];
            const labelIds = (await mapAsync(actors, Actor.getLabels))
              .flat()
              .map((l) => l._id);

            logger.log("Applying actor labels to scene");
            await Scene.setLabels(scene, existingLabels.concat(labelIds));
          }
        } else {
          if (Array.isArray(opts.labels))
            await Scene.setLabels(scene, opts.labels);
        }

        if (Array.isArray(opts.streamLinks))
          scene.streamLinks = [...new Set(opts.streamLinks)];

        if (typeof opts.bookmark == "number" || opts.bookmark === null)
          scene.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") scene.favorite = opts.favorite;

        if (typeof opts.rating == "number") scene.rating = opts.rating;

        if (opts.releaseDate !== undefined)
          scene.releaseDate = opts.releaseDate;

        if (opts.customFields) {
          for (const key in opts.customFields) {
            const value =
              opts.customFields[key] !== undefined
                ? opts.customFields[key]
                : null;
            logger.log(`Set scene custom.${key} to ${value}`);
            opts.customFields[key] = value;
          }
          scene.customFields = opts.customFields;
        }

        await sceneCollection.upsert(scene._id, scene);
        updatedScenes.push(scene);
        await updateSceneDoc(scene);
      }
    }

    return updatedScenes;
  },

  async removeScenes(
    _,
    { ids, deleteImages }: { ids: string[]; deleteImages?: boolean }
  ) {
    for (const id of ids) {
      const scene = await Scene.getById(id);

      if (scene) {
        await Scene.remove(scene);
        await removeSceneDoc(scene._id);
        await Image.filterScene(scene._id);

        if (deleteImages === true) {
          for (const image of await Image.getByScene(scene._id)) {
            await Image.remove(image);
            await LabelledItem.removeByItem(image._id);
          }
          logger.success("Deleted images of scene " + scene._id);
        }

        await Marker.removeByScene(scene._id);

        logger.success("Deleted scene " + scene._id);

        await LabelledItem.removeByItem(scene._id);
        // await MarkerReference.removeByScene(scene._id);
        await ActorReference.removeByItem(scene._id);
        await MovieScene.removeByScene(scene._id);

        logger.log("Deleting scene from queue (if needed)");
        try {
          await removeSceneFromQueue(scene._id);
        } catch (err) {}
      }
    }
    return true;
  },
};
