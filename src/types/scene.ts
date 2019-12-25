import mkdirp from "mkdirp";
import * as database from "../database";
import { generateHash } from "../hash";
import ffmpeg from "fluent-ffmpeg";
import asyncPool from "tiny-async-pool";
import { getConfig } from "../config";
import * as logger from "../logger";
import { libraryPath, mapAsync } from "./utility";
import Label from "./label";
import Actor from "./actor";
import { statAsync, readdirAsync, unlinkAsync, rimrafAsync } from "../fs/async";
import CrossReference from "./cross_references";
import path from "path";
import { existsSync } from "fs";
import Jimp from "jimp";
import nsg from "node-sprite-generator";

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
  fps: number | null = null;
}

export default class Scene {
  _id: string;
  hash: string | null = null;
  name: string;
  description: string | null = null;
  addedOn = +new Date();
  releaseDate: number | null = null;
  thumbnail: string | null = null;
  preview: string | null = null;
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: any = {};
  labels?: string[];
  actors?: string[];
  path: string | null = null;
  streamLinks: string[] = [];
  watches: number[] = []; // Array of timestamps of watches
  meta = new SceneMeta();
  studio: string | null = null;

  static async checkIntegrity() {
    const allScenes = await Scene.getAll();

    for (const scene of allScenes) {
      const sceneId = scene._id.startsWith("sc_")
        ? scene._id
        : `sc_${scene._id}`;

      if (scene.preview === undefined) {
        logger.log(`Undefined scene preview, setting to null...`);
        await database.update(
          database.store.scenes,
          { _id: sceneId },
          { $set: { preview: null } }
        );
      }

      if (scene.actors && scene.actors.length) {
        for (const actor of scene.actors) {
          const actorId = actor.startsWith("ac_") ? actor : `ac_${actor}`;

          if (!!(await CrossReference.get(sceneId, actorId))) {
            logger.log(
              `Cross reference ${sceneId} -> ${actorId} already exists.`
            );
          } else {
            const cr = new CrossReference(sceneId, actorId);
            await database.insert(database.store.cross_references, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (scene.labels && scene.labels.length) {
        for (const label of scene.labels) {
          const labelId = label.startsWith("la_") ? label : `la_${label}`;

          if (!!(await CrossReference.get(sceneId, labelId))) {
            logger.log(
              `Cross reference ${sceneId} -> ${labelId} already exists.`
            );
          } else {
            const cr = new CrossReference(sceneId, labelId);
            await database.insert(database.store.cross_references, cr);
            logger.log(
              `Created cross reference ${cr._id}: ${cr.from} -> ${cr.to}`
            );
          }
        }
      }

      if (!scene._id.startsWith("sc_")) {
        const newScene = JSON.parse(JSON.stringify(scene)) as Scene;
        newScene._id = sceneId;
        if (newScene.actors) delete newScene.actors;
        if (newScene.labels) delete newScene.labels;
        if (scene.thumbnail && !scene.thumbnail.startsWith("im_")) {
          newScene.thumbnail = "im_" + scene.thumbnail;
        }
        if (scene.studio && !scene.studio.startsWith("st_")) {
          newScene.studio = "st_" + scene.studio;
        }
        await database.insert(database.store.scenes, newScene);
        await database.remove(database.store.scenes, { _id: scene._id });
        logger.log(`Changed scene ID: ${scene._id} -> ${sceneId}`);
      } else {
        if (scene.studio && !scene.studio.startsWith("st_")) {
          await database.update(
            database.store.scenes,
            { _id: sceneId },
            { $set: { studio: "st_" + scene.studio } }
          );
        }
        if (scene.thumbnail && !scene.thumbnail.startsWith("im_")) {
          await database.update(
            database.store.scenes,
            { _id: sceneId },
            { $set: { thumbnail: "im_" + scene.thumbnail } }
          );
        }
        if (scene.actors)
          await database.update(
            database.store.scenes,
            { _id: sceneId },
            { $unset: { actors: true } }
          );
        if (scene.labels)
          await database.update(
            database.store.scenes,
            { _id: sceneId },
            { $unset: { labels: true } }
          );
      }
    }
  }

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
    try {
      if (scene.path) await unlinkAsync(scene.path);
    } catch (error) {
      logger.warn("Could not delete source file for scene " + scene._id);
    }
  }

  static async filterStudio(studioId: string) {
    await database.update(
      database.store.scenes,
      { studio: studioId },
      { $set: { studio: null } }
    );
  }

  static async filterImage(imageId: string) {
    await database.update(
      database.store.scenes,
      { thumbnail: imageId },
      { $set: { thumbnail: null } }
    );
    await database.update(
      database.store.scenes,
      { preview: imageId },
      { $set: { preview: null } }
    );
  }

  static async getByActor(id: string) {
    const references = await CrossReference.getByDest(id);
    return (
      await mapAsync(
        references.filter(r => r.from.startsWith("sc_")),
        r => Scene.getById(r.from)
      )
    ).filter(Boolean) as Scene[];
  }

  static async getByStudio(id: string) {
    return (await database.find(database.store.scenes, {
      studio: id
    })) as Scene[];
  }

  static async find(name: string) {
    name = name.toLowerCase().trim();
    const allScenes = await Scene.getAll();
    return allScenes.filter(scene => scene.name.toLowerCase() == name);
  }

  static async getActors(scene: Scene) {
    const references = await CrossReference.getBySource(scene._id);
    return (
      await mapAsync(
        references.filter(r => r.to.startsWith("ac_")),
        r => Actor.getById(r.to)
      )
    ).filter(Boolean) as Actor[];
  }

  static async setActors(scene: Scene, actorIds: string[]) {
    const references = await CrossReference.getBySource(scene._id);

    const oldActorReferences = references
      .filter(r => r.to.startsWith("ac_"))
      .map(r => r._id);

    for (const id of oldActorReferences) {
      await database.remove(database.store.cross_references, { _id: id });
    }

    for (const id of [...new Set(actorIds)]) {
      const crossReference = new CrossReference(scene._id, id);
      logger.log("Adding actor to scene: " + JSON.stringify(crossReference));
      await database.insert(database.store.cross_references, crossReference);
    }
  }

  static async setLabels(scene: Scene, labelIds: string[]) {
    const references = await CrossReference.getBySource(scene._id);

    const oldLabelReferences = references
      .filter(r => r.to && r.to.startsWith("la_"))
      .map(r => r._id);

    for (const id of oldLabelReferences) {
      await database.remove(database.store.cross_references, { _id: id });
    }

    for (const id of [...new Set(labelIds)]) {
      const crossReference = new CrossReference(scene._id, id);
      logger.log("Adding label to scene: " + JSON.stringify(crossReference));
      await database.insert(database.store.cross_references, crossReference);
    }
  }

  static async getLabels(scene: Scene) {
    const references = await CrossReference.getBySource(scene._id);
    return (
      await mapAsync(
        references.filter(r => r.to && r.to.startsWith("la_")),
        r => Label.getById(r.to)
      )
    ).filter(Boolean) as Label[];
  }

  static async getSceneByPath(path: string) {
    return (await database.findOne(database.store.scenes, {
      path
    })) as Scene | null;
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
    this._id = "sc_" + generateHash();
    this.name = name.trim();
  }

  static async generatePreview(scene: Scene): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      if (!scene.path) {
        logger.warn("No scene path, aborting preview generation.");
        return resolve();
      }

      const tmpFolder = `tmp/${scene._id}`;
      if (!existsSync(tmpFolder)) mkdirp.sync(tmpFolder);

      const options = {
        file: scene.path,
        pattern: `${scene._id}-{{index}}.jpg`,
        count: 100 + 1,
        thumbnailPath: tmpFolder,
        quality: "60"
      };

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

      logger.log("Timestamps: ", timestamps);
      logger.log("Creating thumbnails with options: ", options);

      await asyncPool(4, timestamps, timestamp => {
        const index = timestamps.findIndex(s => s == timestamp);
        return new Promise((resolve, reject) => {
          logger.log(`Creating thumbnail ${index}...`);
          ffmpeg(options.file)
            .on("end", async () => {
              logger.success("Created thumbnail " + index);
              resolve();
            })
            .on("error", (err: Error) => {
              logger.error(
                "Thumbnail generation failed for thumbnail " + index
              );
              logger.error({
                options,
                duration: scene.meta.duration,
                timestamps
              });
              reject(err);
            })
            .screenshots({
              count: 1,
              timemarks: [timestamp],
              // Note: we can't use the FFMPEG index syntax
              // because we're generating 1 screenshot at a time instead of N
              filename: options.pattern.replace(
                "{{index}}",
                index.toString().padStart(3, "0")
              ),
              folder: options.thumbnailPath,
              size: "160x?"
            });
        });
      });

      const tmp = path.join("tmp", scene._id);

      if (!existsSync(tmp)) mkdirp.sync(tmp);

      logger.log(`Created preview for ${scene._id}`);
      nsg(
        {
          src: [tmp + "/*.jpg"],
          spritePath: tmp + "/sprite.png",
          stylesheetPath: tmp + "/sprite.css",
          layout: "horizontal",
          compositor: "jimp"
        },
        async (err: Error) => {
          if (err) {
            logger.error(err);
            resolve();
          } else {
            try {
              const file = path.join(
                await libraryPath("previews/"),
                `${scene._id}`
              );
              const lenna = await Jimp.read(tmp + "/sprite.png");
              await lenna.quality(parseInt(options.quality)).writeAsync(file);

              await rimrafAsync(tmp);

              logger.log("Finished generating preview");
              resolve(file);
            } catch (err) {
              logger.error("Preview error");
              logger.error(err);
              resolve();
            }
          }
        }
      );
    });
  }

  static async generateThumbnails(scene: Scene): Promise<ThumbnailFile[]> {
    return new Promise(async (resolve, reject) => {
      if (!scene.path) {
        logger.warn("No scene path, aborting thumbnail generation.");
        return resolve([]);
      }

      const config = await getConfig();

      let amount: number;

      if (scene.meta.duration) {
        amount = Math.max(
          2,
          Math.floor((scene.meta.duration || 30) / config.THUMBNAIL_INTERVAL)
        );
      } else {
        logger.warn(
          "No duration of scene found, defaulting to 10 thumbnails..."
        );
        amount = 10;
      }

      const options = {
        file: scene.path,
        pattern: `${scene._id}-{{index}}.jpg`,
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

        logger.log("Timestamps: ", timestamps);
        logger.log("Creating thumbnails with options: ", options);

        await asyncPool(4, timestamps, timestamp => {
          const index = timestamps.findIndex(s => s == timestamp);
          return new Promise((resolve, reject) => {
            logger.log(`Creating thumbnail ${index}...`);
            ffmpeg(options.file)
              .on("end", async () => {
                logger.success("Created thumbnail " + index);
                resolve();
              })
              .on("error", (err: Error) => {
                logger.error(
                  "Thumbnail generation failed for thumbnail " + index
                );
                logger.error({
                  options,
                  duration: scene.meta.duration,
                  timestamps
                });
                reject(err);
              })
              .screenshots({
                count: 1,
                timemarks: [timestamp],
                // Note: we can't use the FFMPEG index syntax
                // because we're generating 1 screenshot at a time instead of N
                filename: options.pattern.replace(
                  "{{index}}",
                  index.toString().padStart(3, "0")
                ),
                folder: options.thumbnailPath
              });
          });
        });

        logger.success("Thumbnail generation done.");

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

        logger.success(`Generated ${thumbnailFiles.length} thumbnails.`);

        resolve(thumbnailFiles);
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }
}
