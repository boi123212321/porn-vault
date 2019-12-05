import * as database from "../../database";
import Actor from "../../types/actor";
import Label from "../../types/label";
import { ReadStream, createWriteStream } from "fs";
import Scene from "../../types/scene";
import * as logger from "../../logger";
import Image from "../../types/image";
import { extractLabels, extractActors } from "../../extractor";
import { Dictionary, libraryPath, mapAsync } from "../../types/utility";
import Movie from "../../types/movie";
import { unlinkAsync } from "../../fs/async";
import ProcessingQueue from "../../queue/index";
import { extname } from "path";

type ISceneUpdateOpts = Partial<{
  favorite: boolean;
  bookmark: boolean;
  actors: string[];
  name: string;
  description: string;
  rating: number;
  labels: string[];
  streamLinks: string[];
  thumbnail: string;
  releaseDate: number;
  studio: string | null;
}>;

export default {
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

    const sceneName = args.name;
    const scene = new Scene(sceneName);

    if (args.actors) {
      scene.actors = args.actors;
    }

    // Extract actors
    const extractedActors = await extractActors(scene.name);
    logger.log(`Found ${extractedActors.length} actors in scene title.`);
    scene.actors.push(...extractedActors);
    scene.actors = [...new Set(scene.actors)];

    if (args.labels) {
      scene.labels = args.labels;
    }

    // Extract labels
    const extractedLabels = await extractLabels(scene.name);
    logger.log(`Found ${extractedLabels.length} labels in scene title.`);
    scene.labels.push(...extractedLabels);
    scene.labels = [...new Set(scene.labels)];

    await database.insert(database.store.scenes, scene);
    logger.success(`Scene '${sceneName}' done.`);
    return scene;
  },

  async uploadScene(_, args: Dictionary<any>) {
    logger.log(`Receiving file...`);
    const { filename, mimetype, createReadStream } = await args.file;
    logger.log(`Receiving ${filename}...`);
    const ext = extname(filename);
    const ID = new Scene("")._id;
    const path = await libraryPath(`scenes/${ID}${ext}`);

    /* if (!mimetype.includes("video/")) {
      logger.error(`File has invalid format (${mimetype})`);
      throw new Error("Invalid file");
    } */

    logger.log(`Getting file...`);

    const read = createReadStream() as ReadStream;
    const write = createWriteStream(path);

    try {
      const pipe = read.pipe(write);

      await new Promise((resolve, reject) => {
        pipe.on("close", () => resolve());
      });
    } catch (error) {
      logger.error("Error reading file - perhaps a permission problem?");
      try {
        await unlinkAsync(path);
      } catch (error) {
        logger.warn(`Could not cleanup source file - ${path}`);
      }
      throw new Error("Error");
    }

    // File written, now process
    logger.success(`File written to ${path}.`);

    await ProcessingQueue.append({
      _id: ID,
      actors: args.actors,
      filename,
      labels: args.labels,
      name: args.name,
      path
    });

    logger.success(`Entry added to queue.`);

    // Done

    return true;
  },

  async addActorsToScene(_, { id, actors }: { id: string; actors: string[] }) {
    const scene = await Scene.getById(id);

    if (scene) {
      if (Array.isArray(actors)) scene.actors.push(...actors);
      scene.actors = [...new Set(scene.actors)];
      await database.update(
        database.store.scenes,
        { _id: scene._id },
        { $set: { actors: scene.actors } }
      );
      return scene;
    } else {
      throw new Error(`Scene ${id} not found`);
    }
  },

  async updateScenes(
    _,
    { ids, opts }: { ids: string[]; opts: ISceneUpdateOpts }
  ) {
    const updatedScenes = [] as Scene[];

    for (const id of ids) {
      const scene = await Scene.getById(id);

      if (scene) {
        if (typeof opts.name == "string") scene.name = opts.name.trim();

        if (typeof opts.description == "string")
          scene.description = opts.description.trim();

        if (typeof opts.thumbnail == "string") scene.thumbnail = opts.thumbnail;

        if (opts.studio !== undefined) scene.studio = opts.studio;

        if (Array.isArray(opts.labels))
          scene.labels = [...new Set(opts.labels)];

        if (Array.isArray(opts.actors)) {
          const actorIds = [...new Set(opts.actors)];

          scene.actors = actorIds;

          const actors = (await mapAsync(actorIds, Actor.getById)).filter(
            Boolean
          ) as Actor[];
          const labelIds = actors.map(ac => ac.labels).flat();

          logger.log("Applying actor labels to scene");
          logger.log(labelIds);
          scene.labels = [...new Set(scene.labels.concat(labelIds))];
        }

        if (Array.isArray(opts.streamLinks))
          scene.streamLinks = [...new Set(opts.streamLinks)];

        if (typeof opts.bookmark == "boolean") scene.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") scene.favorite = opts.favorite;

        if (typeof opts.rating == "number") scene.rating = opts.rating;

        if (opts.releaseDate !== undefined)
          scene.releaseDate = opts.releaseDate;

        await database.update(database.store.scenes, { _id: scene._id }, scene);
        updatedScenes.push(scene);
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
        await Image.filterScene(scene._id);
        await Movie.filterScene(scene._id);

        if (deleteImages === true) {
          for (const image of await Image.getByScene(scene._id)) {
            await Image.remove(image);
          }
          logger.success("Deleted images of scene " + scene._id);
        }
        logger.success("Deleted scene " + scene._id);
      }
    }
    return true;
  }
};
