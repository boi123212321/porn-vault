import mkdirp from "mkdirp";
import * as database from "../database";
import { generateHash } from "../hash";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import asyncPool from "tiny-async-pool";
import { getConfig } from "../config";
import * as logger from "../logger";
import { libraryPath, mapAsync, removeExtension } from "./utility";
import Label from "./label";
import Actor from "./actor";
import { statAsync, readdirAsync, unlinkAsync, rimrafAsync } from "../fs/async";
import CrossReference from "./cross_references";
import path, { basename } from "path";
import { existsSync } from "fs";
import Jimp from "jimp";
import mergeImg from "merge-img";
import Marker from "./marker";
import Image from "./image";
import Movie from "./movie";
import { singleScreenshot } from "../ffmpeg/screenshot";
import { indexScenes } from "../search/scene";
import { extractStudios, extractActors, extractLabels } from "../extractor";
import Studio from "./studio";
import { onSceneCreate } from "../plugin_events/scene";
import { enqueueScene } from "../queue/processing";

export function runFFprobe(file: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

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

export interface IDimensions {
  width: number;
  height: number;
}

export class SceneMeta {
  size: number | null = null;
  duration: number | null = null;
  dimensions: IDimensions | null = null;
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
  bookmark: number | null = null;
  rating: number = 0;
  customFields: any = {};
  labels?: string[]; // backwards compatibility
  actors?: string[]; // backwards compatibility
  path: string | null = null;
  streamLinks: string[] = [];
  watches: number[] = []; // Array of timestamps of watches
  meta = new SceneMeta();
  studio: string | null = null;
  processed?: boolean = false;

  static async onImport(videoPath: string) {
    logger.log("Importing " + videoPath);
    const config = getConfig();

    let sceneName = removeExtension(basename(videoPath));
    let scene = new Scene(sceneName);
    scene.meta.dimensions = { width: -1, height: -1 };
    scene.path = videoPath;

    const streams = (await runFFprobe(videoPath)).streams;

    let foundCorrectStream = false;
    for (const stream of streams) {
      if (stream.width && stream.height) {
        scene.meta.dimensions.width = stream.width;
        scene.meta.dimensions.height = stream.height;
        scene.meta.fps = parseInt(stream.r_frame_rate || "") || null;
        scene.meta.duration = parseInt(stream.duration || "") || null;
        scene.meta.size = (await statAsync(videoPath)).size;
        foundCorrectStream = true;
        break;
      }
    }

    if (!foundCorrectStream) {
      logger.log(streams);
      throw new Error("Could not get video stream...broken file?");
    }

    let sceneActors = [] as string[];

    // Extract actors
    let extractedActors = [] as string[];
    extractedActors = await extractActors(videoPath);
    sceneActors.push(...extractedActors);

    logger.log(`Found ${extractedActors.length} actors in scene path.`);

    let sceneLabels = [] as string[];

    // Extract labels
    const extractedLabels = await extractLabels(videoPath);
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
    const extractedStudios = await extractStudios(videoPath);

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

    const thumbnail = await Scene.generateSingleThumbnail(
      scene._id,
      videoPath,
      // @ts-ignore
      scene.meta.dimensions
    );
    const image = new Image(`${sceneName} (thumbnail)`);
    image.path = thumbnail.path;
    image.scene = scene._id;
    image.meta.size = thumbnail.size;
    await Image.setLabels(image, sceneLabels);
    await Image.setActors(image, sceneActors);
    logger.log(`Creating image with id ${image._id}...`);
    await database.insert(database.store.images, image);

    scene.thumbnail = image._id;
    logger.log(`Creating scene with id ${scene._id}...`);
    await Scene.setLabels(scene, sceneLabels);
    await Scene.setActors(scene, sceneActors);
    await database.insert(database.store.scenes, scene);
    await indexScenes([scene]);
    logger.success(`Scene '${scene.name}' created.`);

    logger.log(`Queueing ${scene._id} for further processing...`);
    await enqueueScene(scene._id);
  }

  static async checkIntegrity() {
    const allScenes = await Scene.getAll();

    for (const scene of allScenes) {
      const sceneId = scene._id.startsWith("sc_")
        ? scene._id
        : `sc_${scene._id}`;

      if (scene.processed === undefined) {
        logger.log(`Undefined scene processed status, setting to true...`);
        await database.update(
          database.store.scenes,
          { _id: sceneId },
          { $set: { processed: true } }
        );
      }

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
            await database.insert(database.store.crossReferences, cr);
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
            await database.insert(database.store.crossReferences, cr);
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

  static async unwatch(scene: Scene) {
    scene.watches.pop();

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

  static async filterCustomField(fieldId: string) {
    await database.update(
      database.store.scenes,
      {},
      { $unset: { [`customFields.${fieldId}`]: true } }
    );
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

  static async getMarkers(scene: Scene) {
    const references = await CrossReference.getBySource(scene._id);
    return (
      await mapAsync(
        references.filter(r => r.to.startsWith("mk_")),
        r => Marker.getById(r.to)
      )
    ).filter(Boolean) as Marker[];
  }

  static async getMovies(scene: Scene) {
    const references = await CrossReference.getByDest(scene._id);
    return (
      await mapAsync(
        references.filter(r => r.from.startsWith("mo_")),
        r => Movie.getById(r.from)
      )
    ).filter(Boolean) as Movie[];
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
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(actorIds)]) {
      const crossReference = new CrossReference(scene._id, id);
      logger.log("Adding actor to scene: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
    }
  }

  static async setLabels(scene: Scene, labelIds: string[]) {
    const references = await CrossReference.getBySource(scene._id);

    const oldLabelReferences = references
      .filter(r => r.to && r.to.startsWith("la_"))
      .map(r => r._id);

    for (const id of oldLabelReferences) {
      await database.remove(database.store.crossReferences, { _id: id });
    }

    for (const id of [...new Set(labelIds)]) {
      const crossReference = new CrossReference(scene._id, id);
      logger.log("Adding label to scene: " + JSON.stringify(crossReference));
      await database.insert(database.store.crossReferences, crossReference);
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

      const tmpFolder = path.join("tmp", scene._id);
      if (!existsSync(tmpFolder)) mkdirp.sync(tmpFolder);

      const options = {
        file: scene.path,
        pattern: `${scene._id}-{{index}}.jpg`,
        count: 100 + 1, // Don't ask why +1, just accept it
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

      let hadError = false;

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
              logger.error({
                options,
                duration: scene.meta.duration,
                timestamps
              });
              logger.error(err);
              logger.error(
                "Thumbnail generation failed for thumbnail " + index
              );
              hadError = true;
              resolve();
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

      if (hadError) {
        logger.error("Failed preview generation");
        try {
          await rimrafAsync(tmpFolder);
        } catch (error) {
          logger.error("Failed deleting tmp folder");
        }
        return resolve();
      }

      logger.log(`Created 100 small thumbnails for ${scene._id}.`);

      const files = (await readdirAsync(tmpFolder, "utf-8")).map(fileName =>
        path.join(tmpFolder, fileName)
      );
      logger.log(files);

      logger.log(`Creating preview strip for ${scene._id}...`);

      const img = (await mergeImg(files)) as Jimp;

      const file = path.join(libraryPath("previews/"), `${scene._id}.jpg`);

      logger.log(`Writing to file ${file}...`);

      img.write(file, async () => {
        logger.log("Finished generating preview.");

        await rimrafAsync(tmpFolder);
        resolve(file);
      });
    });
  }

  static async generateSingleThumbnail(
    id: string,
    file: string,
    dimensions: { width: number; height: number }
  ): Promise<ThumbnailFile> {
    return new Promise(async (resolve, reject) => {
      try {
        const folder = libraryPath("thumbnails/");

        const config = getConfig();

        await (() => {
          return new Promise(async (resolve, reject) => {
            ffmpeg(<string>file)
              .on("end", async () => {
                logger.success("Created thumbnail");
                resolve();
              })
              .on("error", (err: Error) => {
                logger.error("Thumbnail generation failed for thumbnail");
                logger.error(file);
                reject(err);
              })
              .screenshot({
                folder,
                count: 1,
                filename: `${id} (thumbnail).jpg`,
                timestamps: ["50%"],
                size:
                  Math.min(
                    dimensions.width || config.COMPRESS_IMAGE_SIZE,
                    config.COMPRESS_IMAGE_SIZE
                  ) + "x?"
              });
          });
        })();

        logger.success("Thumbnail generation done.");

        const thumbnailFilenames = (await readdirAsync(folder)).filter(name =>
          name.includes(id)
        );

        const thumbnailFiles = await Promise.all(
          thumbnailFilenames.map(async name => {
            const filePath = libraryPath(`thumbnails/${name}`);
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

        resolve(thumbnailFiles[0]);
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }

  static async screenshot(scene: Scene, sec: number): Promise<Image | null> {
    if (!scene.path) {
      logger.log("No scene path.");
      return null;
    }

    const config = getConfig();

    const image = new Image(`${scene.name} (thumbnail)`);
    image.path = path.join(libraryPath("thumbnails/"), image._id) + ".jpg";
    image.scene = scene._id;

    logger.log("Generating screenshot for scene...");

    await singleScreenshot(
      scene.path,
      image.path,
      sec,
      config.COMPRESS_IMAGE_SIZE
    );

    logger.log("Screenshot done.");
    await database.insert(database.store.images, image);

    const actors = (await Scene.getActors(scene)).map(l => l._id);
    await Image.setActors(image, actors);

    const labels = (await Scene.getLabels(scene)).map(l => l._id);
    await Image.setLabels(image, labels);

    await database.update(
      database.store.scenes,
      { _id: scene._id },
      {
        $set: {
          thumbnail: image._id
        }
      }
    );

    return image;
  }

  static async generateThumbnails(scene: Scene): Promise<ThumbnailFile[]> {
    return new Promise(async (resolve, reject) => {
      if (!scene.path) {
        logger.warn("No scene path, aborting thumbnail generation.");
        return resolve([]);
      }

      const config = getConfig();

      let amount: number;

      if (scene.meta.duration) {
        amount = Math.max(
          2,
          Math.floor((scene.meta.duration || 30) / config.SCREENSHOT_INTERVAL)
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
        thumbnailPath: libraryPath("thumbnails/")
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
                folder: options.thumbnailPath,
                size:
                  Math.min(
                    // @ts-ignore
                    scene.meta.dimensions.width || config.COMPRESS_IMAGE_SIZE,
                    config.COMPRESS_IMAGE_SIZE
                  ) + "x?"
              });
          });
        });

        logger.success("Thumbnail generation done.");

        const thumbnailFilenames = (
          await readdirAsync(options.thumbnailPath)
        ).filter(name => name.includes(scene._id));

        const thumbnailFiles = await Promise.all(
          thumbnailFilenames.map(async name => {
            const filePath = libraryPath(`thumbnails/${name}`);
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
