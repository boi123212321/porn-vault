import DataStore from "nedb";
import * as database from "../database/index";
import * as logger from "../logger/index";
import Actor from "../types/actor";
import Label from "../types/label";
import Scene, { ThumbnailFile } from "../types/scene";
import ffmpeg from "fluent-ffmpeg";
import Image from "../types/image";
import { getConfig } from "../config";
import { extractLabels, extractActors, extractStudios } from "../extractor";
import ora from "ora";
import { existsAsync, statAsync } from "../fs/async";
import { fileHash } from "../hash";
import Studio from "../types/studio";
import { createSceneSearchDoc } from "../search/scene";
import { indices } from "../search/index";
import { createImageSearchDoc } from "../search/image";
import { Dictionary } from "../types/utility";
import { onSceneCreate } from "../plugin_events/scene";

function removeExtension(file: string) {
  return file.replace(/\.[^/.]+$/, "");
}

export interface IQueueItem {
  _id: string;
  name: string | null;
  filename: string;
  path: string;
  actors: string[];
  labels: string[];
  customFields?: Dictionary<string>;

  description?: string | null;
  thumbnail?: string | null;
  favorite?: boolean;
  bookmark?: boolean;
  rating?: number;
  releaseDate?: number;
  studio?: string | null;
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

    if (!(await existsAsync(sourcePath)))
      throw new Error(`File ${sourcePath} not found`);

    logger.message(`Processing ${sourcePath}...`);

    for (const actor of item.actors || []) {
      const actorInDb = await Actor.getById(actor);
      if (!actorInDb) throw new Error(`Actor ${actor} not found`);
    }

    for (const label of item.labels || []) {
      const labelInDb = await Label.getById(label);
      if (!labelInDb) throw new Error(`Label ${label} not found`);
    }

    let sceneName = removeExtension(item.filename);
    if (item.name) sceneName = item.name;

    const config = getConfig();

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

    let scene = new Scene(sceneName);
    scene._id = item._id;
    scene.path = sourcePath;
    if (item.rating) scene.rating = item.rating;
    if (item.bookmark) scene.bookmark = item.bookmark;
    if (item.favorite) scene.favorite = item.favorite;
    if (item.releaseDate) scene.releaseDate = item.releaseDate;
    if (item.customFields) scene.customFields = item.customFields;
    if (item.description) scene.description = item.description;
    if (item.studio) scene.studio = item.studio;
    if (item.thumbnail) scene.thumbnail = item.thumbnail;

    if (config.CALCULATE_FILE_CHECKSUM) {
      logger.log("Generating file checksum...");
      scene.hash = await fileHash(sourcePath);
    }

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
      logger.error(
        `Error ffprobing file '${sourcePath}' - perhaps a permission problem?`
      );
      throw new Error("Error when running FFPROBE");
    }

    let sceneActors = [] as string[];
    if (item.actors) {
      sceneActors = item.actors;
    }

    // Extract actors
    let extractedActors = [] as string[];
    extractedActors = await extractActors(sourcePath);
    sceneActors.push(...extractedActors);

    logger.log(`Found ${extractedActors.length} actors in scene path.`);

    let sceneLabels = [] as string[];
    if (item.labels) {
      sceneLabels = item.labels;
    }

    // Extract labels
    const extractedLabels = await extractLabels(sourcePath);
    sceneLabels.push(...extractedLabels);
    logger.log(`Found ${extractedLabels.length} labels in scene path.`);

    if (config.APPLY_ACTOR_LABELS === true) {
      logger.log("Applying actor labels to scene");
      sceneLabels.push(
        ...(
          await Promise.all(
            extractedActors.map(async id => {
              const actor = await Actor.getById(id);
              if (!actor) return [];
              return (await Actor.getLabels(actor)).map(l => l._id);
            })
          )
        ).flat()
      );
    }

    // Extract studio
    const extractedStudios = await extractStudios(sourcePath);

    scene.studio = extractedStudios[0] || null;

    if (scene.studio) {
      logger.log("Found studio in scene path");

      if (config.APPLY_STUDIO_LABELS === true) {
        const studio = await Studio.getById(scene.studio);

        if (studio) {
          logger.log("Applying studio labels to scene");
          sceneLabels.push(...(await Studio.getLabels(studio)).map(l => l._id));
        }
      }
    }

    try {
      scene = await onSceneCreate(scene, sceneLabels, sceneActors);
    } catch (error) {
      logger.error(error.message);
    }

    // Thumbnails
    if (config.GENERATE_THUMBNAILS) {
      const loader = ora("Generating thumbnail(s)...").start();

      let thumbnailFiles = [] as ThumbnailFile[];
      let images = [] as Image[];

      if (config.GENERATE_MULTIPLE_THUMBNAILS) {
        try {
          thumbnailFiles = await Scene.generateThumbnails(scene);
        } catch (error) {
          logger.error(error);
          loader.fail(`Error generating thumbnails.`);
        }
      } else {
        const thumbnail = await Scene.generateSingleThumbnail(scene);
        if (thumbnail) thumbnailFiles.push(thumbnail);
      }

      for (let i = 0; i < thumbnailFiles.length; i++) {
        const file = thumbnailFiles[i];
        const image = new Image(`${sceneName} ${i + 1} (screenshot)`);
        image.path = file.path;
        image.scene = scene._id;
        image.meta.size = file.size;
        image.labels = scene.labels;
        await Image.setLabels(image, sceneLabels);
        await Image.setActors(image, sceneActors);
        logger.log(`Creating image with id ${image._id}...`);
        await database.insert(database.store.images, image);
        indices.images.add(await createImageSearchDoc(image));
        images.push(image);
      }

      if (images.length > 0) {
        if (!item.thumbnail)
          scene.thumbnail = images[Math.floor(images.length / 2)]._id;
        loader.succeed(`Created ${images.length} thumbnails.`);
      } else loader.warn(`Created 0 thumbnails.`);
    }

    if (config.GENERATE_PREVIEWS && !scene.preview) {
      const loader = ora("Generating previews...").start();

      try {
        let preview = await Scene.generatePreview(scene);

        if (preview) {
          let image = new Image(sceneName + " (preview)");
          const stats = await statAsync(preview);
          image.path = preview;
          image.scene = scene._id;
          image.meta.size = stats.size;

          await database.insert(database.store.images, image);
          scene.preview = image._id;

          loader.succeed("Generated preview for " + scene._id);
        } else {
          loader.fail(`Error generating preview.`);
        }
      } catch (error) {
        logger.error(error);
        loader.fail(`Error generating preview.`);
      }
    }

    await Scene.setActors(scene, sceneActors);
    await Scene.setLabels(scene, sceneLabels);

    logger.log(`Creating scene with id ${scene._id}...`);
    await database.insert(database.store.scenes, scene);
    indices.scenes.add(await createSceneSearchDoc(scene));
    logger.success(`Scene '${scene.name}' created.`);
  }

  async processLoop() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    logger.log("Starting processing loop");
    try {
      let head = await this.getFirst();

      while (!!head) {
        try {
          await this.process(head);
        } catch (error) {
          logger.warn("Error processing scene:", error.message);
        }
        await database.remove(this.store, { _id: head._id });
        head = await this.getFirst();
      }
      logger.success("Processing done");
    } catch (error) {
      logger.error("Error in processing loop:", error.message);
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
