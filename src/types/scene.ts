import { database } from "../database";
import { generateHash } from "../hash";
import ffmpeg from "fluent-ffmpeg";
import asyncPool from "tiny-async-pool";
import config from "../config";
import * as logger from "../logger";
import * as fs from "fs";
import * as path from "path";

type ThumbnailFile = {
  name: string;
  path: string;
  size: number;
  time: number;
}

export type ScreenShotOptions = {
  file: string;
  pattern: string;
  count: number;
  thumbnailPath: string;
}

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
  id: string;
  name: string;
  addedOn = +new Date();
  releaseDate: string | null = null;
  images: string[] = [];
  coverIndex: number = 0;
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

  static getByActor(id: string): Scene[] {
    return Scene
      .getAll()
      .filter(scene => scene.actors.includes(id))
  }

  static find(name: string): Scene[] {
    name = name.toLowerCase().trim();
    return Scene
      .getAll()
      .filter(scene => scene.name.toLowerCase() == name)
  }

  static getById(id: string): Scene | null {
    return Scene
      .getAll()
      .find(scene => scene.id == id) || null;
  }

  static getAll(): Scene[] {
    return database.get('scenes').value();
  }

  constructor(name: string) {
    this.id = generateHash();
    this.name = name.trim();
  }

  async generateThumbnails(): Promise<ThumbnailFile[]> {
    return new Promise(async (resolve, reject) => {
      if (!this.path || !this.meta.duration) {
        logger.ERROR("Error while generating thumbnails");
        return resolve([]);
      }

      const amount = Math.max(
        1,
        Math.floor(
          (this.meta.duration || 30) / config.THUMBNAIL_INTERVAL
        )
      );

      const options = {
        file: this.path,
        pattern: `${this.id}-%s.jpg`,
        count: amount,
        thumbnailPath: "./library/thumbnails/"
      }

      try {
        const timestamps = [] as string[];
        const startPositionPercent = 5;
        const endPositionPercent = 100;
        const addPercent = (endPositionPercent - startPositionPercent) / (options.count - 1);

        let i = 0;
        while (i < options.count) {
          timestamps.push(`${startPositionPercent + addPercent * i}%`);
          i++;
        }

        await asyncPool(4, timestamps, timestamp => {
          return new Promise((resolve, reject) => {
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
          })
        });

        logger.SUCCESS(`SUCCESS: Generated ${amount} thumbnails`);

        const thumbnailFilenames = fs
          .readdirSync(options.thumbnailPath)
          .filter(name => name.includes(this.id)) as string[];

        const thumbnailFiles = thumbnailFilenames.map(name => {
          const filePath = path.resolve(
            process.cwd(),
            "library/thumbnails/",
            name
          );
          const stats = fs.statSync(filePath);
          return {
            name,
            path: filePath,
            size: stats.size,
            time: stats.mtime.getTime()
          };
        });

        thumbnailFiles.sort((a, b) => a.time - b.time);

        resolve(thumbnailFiles);
      }
      catch (err) {
        reject(err);
      }
    })
  }
}