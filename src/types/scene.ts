import mkdirp from "mkdirp";
import { generateHash } from "../hash";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import asyncPool from "tiny-async-pool";
import { getConfig } from "../config";
import * as logger from "../logger";
import { libraryPath, mapAsync, removeExtension } from "./utility";
import Label from "./label";
import Actor from "./actor";
import { statAsync, readdirAsync, unlinkAsync, rimrafAsync } from "../fs/async";
import path, { basename } from "path";
import { existsSync } from "fs";
import Jimp from "jimp";
import mergeImg from "merge-img";
import Marker from "./marker";
import Image from "./image";
import Movie from "./movie";
import { singleScreenshot } from "../ffmpeg/screenshot";
import { indexScenes } from "../search/scene";
import {
  extractStudios,
  extractActors,
  extractLabels,
  extractMovies,
} from "../extractor";
import Studio from "./studio";
import { onSceneCreate } from "../plugin_events/scene";
import { enqueueScene } from "../queue/processing";
import {
  imageCollection,
  sceneCollection,
  actorCollection,
  labelledItemCollection,
  actorReferenceCollection,
  viewCollection,
} from "../database";
import LabelledItem from "./labelled_item";
import ActorReference from "./actor_reference";
import MarkerReference from "./marker_reference";
import SceneView from "./watch";

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
  watches?: number[]; // backwards compatibility, array of timestamps of watches
  meta = new SceneMeta();
  studio: string | null = null;
  processed?: boolean = false;

  static async onImport(videoPath: string, extractInfo = true) {
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
        if (scene.meta.fps) {
          if (scene.meta.fps >= 10000) {
            scene.meta.fps /= 1000;
          } else if (scene.meta.fps >= 1000) {
            scene.meta.fps /= 100;
          }
        }
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
    let sceneLabels = [] as string[];

    if (extractInfo) {
      // Extract actors
      let extractedActors = [] as string[];
      extractedActors = await extractActors(videoPath);
      sceneActors.push(...extractedActors);

      logger.log(`Found ${extractedActors.length} actors in scene path.`);

      if (config.APPLY_ACTOR_LABELS === true) {
        logger.log("Applying actor labels to scene");
        sceneLabels.push(
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
    }

    if (extractInfo) {
      // Extract labels
      const extractedLabels = await extractLabels(videoPath);
      sceneLabels.push(...extractedLabels);
      logger.log(`Found ${extractedLabels.length} labels in scene path.`);
    }

    if (extractInfo) {
      // Extract studio
      const extractedStudios = await extractStudios(videoPath);

      scene.studio = extractedStudios[0] || null;

      if (scene.studio) {
        logger.log("Found studio in scene path");

        if (config.APPLY_STUDIO_LABELS === true) {
          const studio = await Studio.getById(scene.studio);

          if (studio) {
            logger.log("Applying studio labels to scene");
            sceneLabels.push(
              ...(await Studio.getLabels(studio)).map((l) => l._id)
            );
          }
        }
      }
    }

    if (extractInfo) {
      // Extract movie
      const extractedMovies = await extractMovies(videoPath);

      if (extractedMovies.length) {
        logger.log("Found movie in scene path");

        const movie = <Movie>await Movie.getById(extractedMovies[0]);
        const scenes = (await Movie.getScenes(movie)).map((sc) => sc._id);
        scenes.push(scene._id);
        await Movie.setScenes(movie, scenes);
        logger.log("Added scene to movie");
      }
    }

    try {
      scene = await onSceneCreate(scene, sceneLabels, sceneActors);
    } catch (error) {
      logger.error(error.message);
    }

    if (!scene.thumbnail) {
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
      await imageCollection.upsert(image._id, image);
      scene.thumbnail = image._id;
    }

    logger.log(`Creating scene with id ${scene._id}...`);
    await Scene.setLabels(scene, sceneLabels);
    await Scene.setActors(scene, sceneActors);
    await sceneCollection.upsert(scene._id, scene);
    await indexScenes([scene]);
    logger.success(`Scene '${scene.name}' created.`);

    logger.log(`Queueing ${scene._id} for further processing...`);
    await enqueueScene(scene._id);

    return scene;
  }

  static async checkIntegrity() {
    const allScenes = await Scene.getAll();

    for (const scene of allScenes) {
      if (scene.processed === undefined) {
        logger.log(`Undefined scene processed status, setting to true...`);
        scene.processed = true;
        await sceneCollection.upsert(scene._id, scene);
      }

      if (scene.preview === undefined) {
        logger.log(`Undefined scene preview, setting to null...`);
        scene.preview = null;
        await sceneCollection.upsert(scene._id, scene);
      }

      if (scene.watches) {
        logger.log("Moving scene watches to separate table");
        for (const watch of scene.watches) {
          const watchItem = new SceneView(scene._id, watch);
          await viewCollection.upsert(watchItem._id, watchItem);
        }
        delete scene.watches;
        await sceneCollection.upsert(scene._id, scene);
      }
    }
  }

  static async watch(scene: Scene) {
    logger.log("Watch scene " + scene._id);
    const watchItem = new SceneView(scene._id, +new Date());
    await viewCollection.upsert(watchItem._id, watchItem);
    await indexScenes([scene]);
  }

  static async unwatch(scene: Scene) {
    const watches = await SceneView.getByScene(scene._id);
    const last = watches[watches.length - 1];
    if (last) {
      logger.log("Remove most recent view of scene " + scene._id);
      await viewCollection.remove(last._id);
    }
    await indexScenes([scene]);
  }

  static async remove(scene: Scene) {
    await sceneCollection.remove(scene._id);
    try {
      if (scene.path) await unlinkAsync(scene.path);
    } catch (error) {
      logger.warn("Could not delete source file for scene " + scene._id);
    }
  }

  static async filterStudio(studioId: string) {
    for (const scene of await Scene.getAll()) {
      if (scene.studio == studioId) {
        scene.studio = null;
        await sceneCollection.upsert(scene._id, scene);
      }
    }
  }

  static async getByActor(id: string) {
    const references = await ActorReference.getByActor(id);
    return (
      await sceneCollection.getBulk(
        references.filter((r) => r.item.startsWith("sc_")).map((r) => r.item)
      )
    ).filter(Boolean);
  }

  static async getByStudio(id: string) {
    return sceneCollection.query("studio-index", id);
  }

  static async getMarkers(scene: Scene) {
    return Marker.getByScene(scene._id);
    /* const references = await MarkerReference.getByScene(scene._id);
    return (await mapAsync(references, (r) => Marker.getById(r.marker))).filter(
      Boolean
    ) as Marker[]; */
  }

  static async getMovies(scene: Scene) {
    return Movie.getByScene(scene._id);
  }

  static async getActors(scene: Scene) {
    const references = await ActorReference.getByItem(scene._id);
    return (
      await actorCollection.getBulk(references.map((r) => r.actor))
    ).filter(Boolean);
  }

  static async setActors(scene: Scene, actorIds: string[]) {
    const references = await ActorReference.getByItem(scene._id);

    const oldActorReferences = references.map((r) => r._id);

    for (const id of oldActorReferences) {
      await actorReferenceCollection.remove(id);
    }

    for (const id of [...new Set(actorIds)]) {
      const actorReference = new ActorReference(scene._id, id, "scene");
      logger.log("Adding actor to scene: " + JSON.stringify(actorReference));
      await actorReferenceCollection.upsert(actorReference._id, actorReference);
    }
  }

  static async setLabels(scene: Scene, labelIds: string[]) {
    const references = await LabelledItem.getByItem(scene._id);

    const oldLabelReferences = references.map((r) => r._id);

    for (const id of oldLabelReferences) {
      await labelledItemCollection.remove(id);
    }

    for (const id of [...new Set(labelIds)]) {
      const labelledItem = new LabelledItem(scene._id, id, "scene");
      logger.log("Adding label to scene: " + JSON.stringify(labelledItem));
      await labelledItemCollection.upsert(labelledItem._id, labelledItem);
    }
  }

  static async getLabels(scene: Scene) {
    const references = await LabelledItem.getByItem(scene._id);
    return (await mapAsync(references, (r) => Label.getById(r.label))).filter(
      Boolean
    ) as Label[];
  }

  static async getSceneByPath(path: string) {
    const scenes = await sceneCollection.query(
      "path-index",
      encodeURIComponent(path)
    );
    return scenes[0] as Scene | undefined;
  }

  static async getById(_id: string) {
    return sceneCollection.get(_id);
  }

  static async getAll(): Promise<Scene[]> {
    return sceneCollection.getAll();
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
        quality: "60",
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

      await asyncPool(4, timestamps, (timestamp) => {
        const index = timestamps.findIndex((s) => s == timestamp);
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
                timestamps,
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
              size: "160x?",
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

      const files = (await readdirAsync(tmpFolder, "utf-8")).map((fileName) =>
        path.join(tmpFolder, fileName)
      );
      logger.log(files);
      if (!files.length) {
        logger.error("Failed preview generation: no images");
        return resolve();
      }

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
                  ) + "x?",
              });
          });
        })();

        logger.success("Thumbnail generation done.");

        const thumbnailFilenames = (await readdirAsync(folder)).filter((name) =>
          name.includes(id)
        );

        const thumbnailFiles = await Promise.all(
          thumbnailFilenames.map(async (name) => {
            const filePath = libraryPath(`thumbnails/${name}`);
            const stats = await statAsync(filePath);
            return {
              name,
              path: filePath,
              size: stats.size,
              time: stats.mtime.getTime(),
            };
          })
        );

        logger.success(`Generated 1 thumbnail.`);

        const thumb = thumbnailFiles[0];
        if (!thumb) throw new Error("Thumbnail generation failed");
        resolve(thumb);
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
    const imagePath = path.join(libraryPath("thumbnails/"), image._id) + ".jpg";
    image.path = imagePath;
    image.scene = scene._id;

    logger.log("Generating screenshot for scene...");

    await singleScreenshot(
      scene.path,
      imagePath,
      sec,
      config.COMPRESS_IMAGE_SIZE
    );

    logger.log("Screenshot done.");
    // await database.insert(database.store.images, image);
    await imageCollection.upsert(image._id, image);

    const actors = (await Scene.getActors(scene)).map((l) => l._id);
    await Image.setActors(image, actors);

    const labels = (await Scene.getLabels(scene)).map((l) => l._id);
    await Image.setLabels(image, labels);

    scene.thumbnail = image._id;
    await sceneCollection.upsert(scene._id, scene);

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
        thumbnailPath: libraryPath("thumbnails/"),
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

        await asyncPool(4, timestamps, (timestamp) => {
          const index = timestamps.findIndex((s) => s == timestamp);
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
                  timestamps,
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
                  ) + "x?",
              });
          });
        });

        logger.success("Thumbnail generation done.");

        const thumbnailFilenames = (
          await readdirAsync(options.thumbnailPath)
        ).filter((name) => name.includes(scene._id));

        const thumbnailFiles = await Promise.all(
          thumbnailFilenames.map(async (name) => {
            const filePath = libraryPath(`thumbnails/${name}`);
            const stats = await statAsync(filePath);
            return {
              name,
              path: filePath,
              size: stats.size,
              time: stats.mtime.getTime(),
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
