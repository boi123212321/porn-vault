import DataStore from "nedb";
import * as database from "../database/index";
import * as logger from "../logger/index";
import Actor from "../types/actor";
import Label from "../types/label";
import Scene, { ThumbnailFile } from "../types/scene";
import ffmpeg from "fluent-ffmpeg";
import Image from "../types/image";
import { getConfig } from "../config";
import { extractLabels, extractActors } from "../extractor";
import ora from "ora";
import { existsAsync, unlinkAsync, statAsync } from "../fs/async";
import { fileHash } from "../hash";

export interface IQueueItem {
  _id: string;
  name: string | null;
  filename: string;
  path: string;
  actors: string[];
  labels: string[];
}

class Queue {
  private store!: DataStore;
  private isProcessing = false;

  setStore(store: DataStore) {
    this.store = store;
  }

  getLength(): Promise<number> {
    return database.count(this.store, {});
  }

  async process(item: IQueueItem) {
    const sourcePath = item.path;
    logger.log(`Processing ${sourcePath}...`);

    for (const actor of item.actors || []) {
      const actorInDb = await Actor.getById(actor);
      if (!actorInDb) throw new Error(`Actor ${actor} not found`);
    }

    for (const label of item.labels || []) {
      const labelInDb = await Label.getById(label);
      if (!labelInDb) throw new Error(`Label ${label} not found`);
    }

    const fileNameWithoutExtension = item.filename.split(".")[0];
    let sceneName = fileNameWithoutExtension;
    if (item.name) sceneName = item.name;

    const config = await getConfig();

    logger.log(`Checking binaries...`);

    if (!(await existsAsync(config.FFMPEG_PATH))) {
      logger.error("FFMPEG not found");
      throw new Error("FFMPEG not found");
    }

    if (!(await existsAsync(config.FFPROBE_PATH))) {
      logger.error("FFPROBE not found");
      throw new Error("FFPROBE not found");
    }

    ffmpeg.setFfmpegPath(config.FFMPEG_PATH);
    ffmpeg.setFfprobePath(config.FFPROBE_PATH);

    const scene = new Scene(sceneName);
    scene._id = item._id;
    scene.path = sourcePath;

    logger.log("Generating file checksum...");

    scene.hash = await fileHash(sourcePath);

    try {
      await new Promise(async (resolve, reject) => {
        ffmpeg.ffprobe(sourcePath, async (err, data) => {
          if (err) {
            console.log(err);
            return reject(err);
          }

          const meta = data.streams[0];
          const { size } = await statAsync(sourcePath);

          if (meta) {
            scene.meta.dimensions = {
              width: <any>meta.width || null,
              height: <any>meta.height || null
            };
            if (meta.duration) scene.meta.duration = parseInt(meta.duration);

            const fps = data.streams[0].avg_frame_rate;
            if (fps) scene.meta.fps = parseFloat(fps);
          } else {
            logger.warn("Could not get video meta data.");
          }

          scene.meta.size = size;
          resolve();
        });
      });
    } catch (err) {
      logger.error("Error ffprobing file - perhaps a permission problem?");
      try {
        await unlinkAsync(sourcePath);
      } catch (error) {
        logger.warn(`Could not cleanup source file - ${sourcePath}`);
      }
      throw new Error("Error");
    }

    if (item.actors) {
      scene.actors = item.actors;
    }

    // Extract actors
    let extractedActors = [] as string[];
    extractedActors = await extractActors(sourcePath);

    scene.actors.push(...extractedActors);
    scene.actors = [...new Set(scene.actors)];
    logger.log(`Found ${scene.actors.length} actors in scene path.`);

    if (item.labels) {
      scene.labels = item.labels;
    }

    // Extract labels
    const extractedLabels = await extractLabels(scene.name);

    let extractedLabelsFromFilePath = [] as string[];
    if (item.name)
      extractedLabelsFromFilePath = await extractLabels(sourcePath);

    scene.labels.push(...extractedLabels);
    scene.labels.push(...extractedLabelsFromFilePath);
    logger.log(`Found ${scene.labels.length} labels in scene path.`);

    if (config.APPLY_ACTOR_LABELS === true) {
      logger.log("Applying actor labels to scene");
      scene.labels.push(
        ...(
          await Promise.all(
            extractedActors.map(async id => {
              const actor = await Actor.getById(id);
              if (!actor) return [];
              return actor.labels;
            })
          )
        ).flat()
      );
    }

    scene.labels = [...new Set(scene.labels)];

    if (config.GENERATE_THUMBNAILS) {
      const loader = ora("Generating thumbnails...").start();

      let thumbnailFiles = [] as ThumbnailFile[];
      let images = [] as Image[];

      try {
        thumbnailFiles = await Scene.generateThumbnails(scene);
        for (let i = 0; i < thumbnailFiles.length; i++) {
          const file = thumbnailFiles[i];
          const image = new Image(`${sceneName} ${i + 1}`);
          image.path = file.path;
          image.scene = scene._id;
          image.meta.size = file.size;
          image.actors = scene.actors;
          image.labels = scene.labels;
          logger.log(`Creating image with id ${image._id}...`);
          await database.insert(database.store.images, image);
          images.push(image);
        }
      } catch (error) {
        logger.error(error);
        loader.fail(`Error generating thumbnails.`);
        throw error;
      }

      scene.thumbnail = images[Math.floor(images.length / 2)]._id;
      loader.succeed(`Created ${thumbnailFiles.length} thumbnails.`);
    }

    logger.log(`Creating scene with id ${scene._id}...`);
    await database.insert(database.store.scenes, scene);
    logger.success(`Scene '${scene.name}' created.`);
  }

  async processLoop() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    logger.log("Starting processing loop");
    try {
      let head = await this.getFirst();

      while (!!head) {
        await this.process(head);
        await database.remove(this.store, { _id: head._id });
        head = await this.getFirst();
      }
      logger.success("Processing done");
    } catch (error) {
      logger.error(error);
      logger.error("Error processing stuff");
    }
    this.isProcessing = false;
  }

  async append(item: IQueueItem) {
    await database.insert(this.store, item);

    // Start as async task
    if (!this.isProcessing) {
      this.processLoop();
    }
  }

  getFirst(): Promise<IQueueItem | null> {
    return new Promise((resolve, reject) => {
      this.store
        .find({})
        .limit(1)
        .exec(function(err, docs) {
          if (err) return reject(err);
          resolve(docs[0]);
        });
    });
  }
}

export default new Queue();
