import * as database from "../database";
import { generateHash } from "../hash";
import ffmpeg from "fluent-ffmpeg";
import asyncPool from "tiny-async-pool";
import { getConfig } from "../config";
import * as logger from "../logger";
import { libraryPath } from "./utility";
import Label from "./label";
import Actor from "./actor";
import { statAsync, readdirAsync } from "../fs/async";

export type ThumbnailFile = {
  name: string;
  path: string;
  size: number;
  time: number;
};

export type ScreenShotOptions = {
  file: string;
  pattern: string;
  count: number;
  thumbnailPath: string;
};

export class VideoDimensions {
  width: number | null = null;
  height: number | null = null;
}

export class SceneMeta {
  size: number | null = null;
  duration: number | null = null;
  dimensions = new VideoDimensions();
}

export default class Scene {
  _id: string;
  name: string;
  description: string | null = null;
  addedOn = +new Date();
  releaseDate: number | null = null;
  thumbnail: string | null = null;
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  labels: string[] = [];
  actors: string[] = [];
  path: string | null = null;
  streamLinks: string[] = [];
  watches: number[] = []; // Array of timestamps of watches
  meta = new SceneMeta();
  studio: string | null = null;

  static async watch(scene: Scene) {
    scene.watches.push(Date.now());

    await database.update(
      database.store.scenes,
      { _id: scene._id },
      { $set: { watches: scene.watches } }
    );
  }

  static async remove(scene: Scene) {
    await database.remove(database.store.scenes, { _id: scene._id });
  }

  static async filterImage(thumbnail: string) {
    await database.update(
      database.store.scenes,
      { thumbnail },
      { $set: { thumbnail: null } }
    );
  }

  static async filterActor(actor: string) {
    await database.update(
      database.store.scenes,
      {},
      { $pull: { actors: actor } }
    );
  }

  static async filterLabel(label: string) {
    await database.update(
      database.store.scenes,
      {},
      { $pull: { labels: label } }
    );
  }

  static async getByActor(id: string) {
    return (await database.find(database.store.scenes, {
      actors: id
    })) as Scene[];
  }

  static async find(name: string) {
    name = name.toLowerCase().trim();
    const allScenes = await Scene.getAll();
    return allScenes.filter(scene => scene.name.toLowerCase() == name);
  }

  static async getActors(scene: Scene) {
    const actors = [] as Actor[];

    for (const id of scene.actors) {
      const actor = await Actor.getById(id);
      if (actor) actors.push(actor);
    }

    return actors;
  }

  static async getLabels(scene: Scene) {
    const labels = [] as Label[];

    for (const id of scene.labels) {
      const label = await Label.getById(id);
      if (label) labels.push(label);
    }

    return labels;
  }

  static async getSceneByPath(path: string) {
    return (await Scene.getAll()).filter(scene => scene.path == path)[0];
  }

  static async getById(_id: string) {
    return (await database.findOne(database.store.scenes, {
      _id
    })) as Scene | null;
  }

  static async getAll(): Promise<Scene[]> {
    return (await database.find(database.store.scenes, {})) as Scene[];
  }

  constructor(name: string) {
    this._id = generateHash();
    this.name = name.trim();
  }

  static async generateThumbnails(scene: Scene): Promise<ThumbnailFile[]> {
    return new Promise(async (resolve, reject) => {
      if (!scene.path || !scene.meta.duration) {
        logger.error("Error while generating thumbnails");
        return resolve([]);
      }

      const config = await getConfig();

      const amount = Math.max(
        1,
        Math.floor((scene.meta.duration || 30) / config.THUMBNAIL_INTERVAL)
      );

      const options = {
        file: scene.path,
        pattern: `${scene._id}-%s.jpg`,
        count: amount,
        thumbnailPath: await libraryPath("thumbnails/")
      };

      try {
        const timestamps = [] as string[];
        const startPositionPercent = 2;
        const endPositionPercent = 100;
        const addPercent =
          (endPositionPercent - startPositionPercent) / (options.count - 1);

        let i = 0;
        while (i < options.count) {
          timestamps.push(`${startPositionPercent + addPercent * i}%`);
          i++;
        }

        await asyncPool(4, timestamps, timestamp => {
          const index = timestamps.findIndex(s => s == timestamp);
          return new Promise((resolve, reject) => {
            logger.log(`Creating thumbnail ${index}`);
            ffmpeg(options.file)
              .on("end", async () => {
                resolve();
              })
              .on("error", (err: Error) => {
                reject(err);
              })
              .screenshots({
                count: 1,
                timemarks: [timestamp],
                filename: options.pattern,
                folder: options.thumbnailPath
              });
          });
        });

        const thumbnailFilenames = (
          await readdirAsync(options.thumbnailPath)
        ).filter(name => name.includes(scene._id));

        const thumbnailFiles = await Promise.all(
          thumbnailFilenames.map(async name => {
            const filePath = await libraryPath(`thumbnails/${name}`);
            const stats = await statAsync(filePath);
            return {
              name,
              path: filePath,
              size: stats.size,
              time: stats.mtime.getTime()
            };
          })
        );

        thumbnailFiles.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        );

        resolve(thumbnailFiles);
      } catch (err) {
        reject(err);
      }
    });
  }
}
