import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import { existsSync } from "fs";
import Jimp from "jimp";
import mergeImg from "merge-img";
import path, { basename } from "path";
import asyncPool from "tiny-async-pool";

import { getConfig } from "../config";
import { actorCollection, imageCollection, sceneCollection, viewCollection } from "../database";
import { extractActors, extractLabels, extractMovies, extractStudios } from "../extractor";
import { singleScreenshot } from "../ffmpeg/screenshot";
import { onSceneCreate } from "../plugins/events/scene";
import { enqueueScene } from "../queue/processing";
import { indexActors } from "../search/actor";
import { indexScenes, searchScenes } from "../search/scene";
import { mapAsync } from "../utils/async";
import { mkdirpSync, readdirAsync, rimrafAsync, statAsync, unlinkAsync } from "../utils/fs/async";
import { generateHash } from "../utils/hash";
import { formatMessage, handleError, logger } from "../utils/logger";
import { generateTimestampsAtIntervals } from "../utils/misc";
import { libraryPath } from "../utils/path";
import { removeExtension } from "../utils/string";
import { ApplyActorLabelsEnum, ApplyStudioLabelsEnum } from "./../config/schema";
import Actor from "./actor";
import ActorReference from "./actor_reference";
import { iterate } from "./common";
import Image from "./image";
import Label from "./label";
import Marker from "./marker";
import Movie from "./movie";
import Studio from "./studio";
import SceneView from "./watch";

export function ffprobeAsync(file: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

export function getAverageRating(items: { rating: number }[]): number {
  const filtered = items.filter(({ rating }) => rating);
  if (!filtered.length) {
    return 0;
  }
  const sum = filtered.reduce((sum, { rating }) => sum + rating, 0);
  logger.debug(`Rating sum: ${sum}`);
  const average = sum / filtered.length;
  logger.debug(`${average} average rating`);
  return average;
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
  favorite = false;
  bookmark: number | null = null;
  rating = 0;
  customFields: Record<string, boolean | string | number | string[] | null> = {};
  path: string | null = null;
  streamLinks: string[] = [];
  meta = new SceneMeta();
  album?: string | null = null;
  studio: string | null = null;
  processed?: boolean = false;

  static async iterate(
    func: (scene: Scene) => void | unknown | Promise<void | unknown>,
    extraFilter: unknown[] = []
  ) {
    return iterate(searchScenes, Scene.getBulk, func, "scene", extraFilter);
  }

  static calculateScore(scene: Scene, numViews: number): number {
    return numViews + +scene.favorite * 5 + scene.rating;
  }

  static async getLabelUsage(): Promise<
    {
      label: Label;
      score: number;
    }[]
  > {
    const scores = {} as Record<string, { label: Label; score: number }>;

    for (const label of await Label.getAll()) {
      const { total } = await searchScenes({
        include: [label._id],
      });
      scores[label._id] = {
        score: total,
        label,
      };
    }

    return Object.keys(scores)
      .map((key) => ({
        label: scores[key].label,
        score: scores[key].score,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Extracts metadata from the scene and updates the scene object
   * (does not upsert into db)
   *
   * @param scene - scene on which to run ffprobe
   * @returns the ffprobe metadata
   */
  static async runFFProbe(scene: Scene): Promise<FfprobeData> {
    const videoPath = scene.path;
    if (!videoPath) {
      throw new Error(`Scene ${scene._id} has no path, cannot run ffprobe`);
    }

    scene.meta.dimensions = { width: -1, height: -1 };

    const metadata = await ffprobeAsync(videoPath);
    const { streams } = metadata;

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
      logger.debug(streams);
      throw new Error("Could not get video stream...broken file?");
    }

    return metadata;
  }

  static async onImport(videoPath: string, extractInfo = true): Promise<Scene> {
    logger.debug(`Importing ${videoPath}`);
    const config = getConfig();

    const sceneName = removeExtension(basename(videoPath));
    let scene = new Scene(sceneName);
    scene.path = videoPath;
    await Scene.runFFProbe(scene);

    const sceneActors = [] as string[];
    const sceneLabels = [] as string[];

    let actors = [] as Actor[];

    if (extractInfo && config.matching.extractSceneActorsFromFilepath) {
      // Extract actors
      let extractedActors = [] as string[];
      extractedActors = await extractActors(videoPath);
      sceneActors.push(...extractedActors);

      logger.debug(`Found ${extractedActors.length} actors in scene path.`);

      actors = await Actor.getBulk(extractedActors);

      if (
        config.matching.applyActorLabels.includes(ApplyActorLabelsEnum.enum["event:scene:create"])
      ) {
        logger.debug("Applying actor labels to scene");
        const actors = await Actor.getBulk(extractedActors);
        const actorLabels = (
          await mapAsync(actors, async (actor) => (await Actor.getLabels(actor)).map((l) => l._id))
        ).flat();
        sceneLabels.push(...actorLabels);
      }
    }

    if (extractInfo && config.matching.extractSceneLabelsFromFilepath) {
      // Extract labels
      const extractedLabels = await extractLabels(videoPath);
      sceneLabels.push(...extractedLabels);
      logger.debug(`Found ${extractedLabels.length} labels in scene path.`);
    }

    if (extractInfo && config.matching.extractSceneStudiosFromFilepath) {
      // Extract studio
      const extractedStudio = (await extractStudios(videoPath))[0] || null;
      scene.studio = extractedStudio;

      if (scene.studio) {
        logger.debug("Found studio in scene path");

        if (
          config.matching.applyStudioLabels.includes(
            ApplyStudioLabelsEnum.enum["event:scene:create"]
          )
        ) {
          const studio = await Studio.getById(scene.studio);

          if (studio) {
            logger.debug("Applying studio labels to scene");
            sceneLabels.push(...(await Studio.getLabels(studio)).map((l) => l._id));
          }
        }
      }
    }

    if (extractInfo && config.matching.extractSceneMoviesFromFilepath) {
      // Extract movie
      const extractedMovie = (await extractMovies(videoPath))[0] || null;

      if (extractedMovie) {
        logger.debug("Found movie in scene path");

        const movie = <Movie>await Movie.getById(extractedMovie);
        const scenes = (await Movie.getScenes(movie)).map((sc) => sc._id);
        scenes.push(scene._id);
        await Movie.setScenes(movie, scenes);
        logger.debug("Added scene to movie");
      }
    }

    try {
      scene = await onSceneCreate(scene, sceneLabels, sceneActors);
    } catch (error) {
      logger.error(error);
    }

    if (!scene.thumbnail) {
      const thumbnail = await Scene.generateSingleThumbnail(
        scene._id,
        videoPath,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        scene.meta.dimensions!
      );
      const image = new Image(`${sceneName} (thumbnail)`);
      image.path = thumbnail.path;
      image.scene = scene._id;
      image.meta.size = thumbnail.size;
      await Image.setLabels(image, sceneLabels);
      await Image.setActors(image, sceneActors);
      logger.debug(`Creating image with id ${image._id}...`);
      await imageCollection.upsert(image._id, image);
      scene.thumbnail = image._id;
    }

    logger.debug(`Creating scene with id ${scene._id}...`);
    await Scene.setLabels(scene, sceneLabels);
    await Scene.setActors(scene, sceneActors);
    await sceneCollection.upsert(scene._id, scene);
    await indexScenes([scene]);
    logger.info(`Scene '${scene.name}' created.`);

    if (actors.length) {
      await indexActors(actors);
    }

    logger.verbose(`Queueing ${scene._id} for further processing...`);
    await enqueueScene(scene._id);

    return scene;
  }

  static async watch(scene: Scene, time = Date.now()): Promise<void> {
    logger.debug(`Watch scene ${scene._id}`);
    const watchItem = new SceneView(scene._id, time);
    await viewCollection.upsert(watchItem._id, watchItem);
    await indexScenes([scene]);
  }

  static async unwatch(scene: Scene): Promise<void> {
    const watches = await SceneView.getByScene(scene._id);
    const last = watches[watches.length - 1];
    if (last) {
      logger.debug(`Remove most recent view of scene ${scene._id}`);
      await viewCollection.remove(last._id);
    }
    await indexScenes([scene]);
  }

  static async remove(scene: Scene): Promise<void> {
    await sceneCollection.remove(scene._id);
    try {
      if (scene.path) {
        await unlinkAsync(scene.path);
      }
    } catch (error) {
      handleError(`Could not delete source file for scene ${scene._id}`, error);
    }
  }

  /**
   * Removes the given studio from all images that
   * are associated to the studio
   *
   * @param studioId - id of the studio to remove
   */
  static async filterStudio(studioId: string): Promise<void> {
    const scenes = await Scene.getByStudio(studioId);
    for (const scene of scenes) {
      scene.studio = null;
      await sceneCollection.upsert(scene._id, scene);
    }
    await indexScenes(scenes);
  }

  static async getByActor(id: string): Promise<Scene[]> {
    const references = await ActorReference.getByActor(id);
    return await sceneCollection.getBulk(
      references.filter((r) => r.item.startsWith("sc_")).map((r) => r.item)
    );
  }

  static async getByStudio(id: string): Promise<Scene[]> {
    return sceneCollection.query("studio-index", id);
  }

  static async getMarkers(scene: Scene): Promise<Marker[]> {
    return Marker.getByScene(scene._id);
  }

  static async getMovies(scene: Scene): Promise<Movie[]> {
    return Movie.getByScene(scene._id);
  }

  static async getActors(scene: Scene): Promise<Actor[]> {
    const references = await ActorReference.getByItem(scene._id);
    return (await actorCollection.getBulk(references.map((r) => r.actor))).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  static async setActors(scene: Scene, actorIds: string[]): Promise<void> {
    return Actor.setForItem(scene._id, actorIds, "scene");
  }

  static async addActors(scene: Scene, actorIds: string[]): Promise<void> {
    return Actor.addForItem(scene._id, actorIds, "scene");
  }

  static async setLabels(scene: Scene, labelIds: string[]): Promise<void> {
    return Label.setForItem(scene._id, labelIds, "scene");
  }

  static async addLabels(scene: Scene, labelIds: string[]): Promise<void> {
    return Label.addForItem(scene._id, labelIds, "scene");
  }

  static async getLabels(scene: Scene): Promise<Label[]> {
    return Label.getForItem(scene._id);
  }

  static async getSceneByPath(path: string): Promise<Scene | undefined> {
    const scenes = await sceneCollection.query("path-index", encodeURIComponent(path));
    return scenes[0] as Scene | undefined;
  }

  static async getById(_id: string): Promise<Scene | null> {
    return sceneCollection.get(_id);
  }

  static async getBulk(_ids: string[]): Promise<Scene[]> {
    return sceneCollection.getBulk(_ids);
  }

  static async getAll(): Promise<Scene[]> {
    return sceneCollection.getAll();
  }

  constructor(name: string) {
    this._id = `sc_${generateHash()}`;
    this.name = name.trim();
  }

  static async generatePreview(scene: Scene): Promise<string | null> {
    return new Promise<string | null>(async (resolve) => {
      if (!scene.path) {
        logger.warn("No scene path, aborting preview generation.");
        return resolve(null);
      }

      const tmpFolder = path.join("tmp", scene._id);
      if (!existsSync(tmpFolder)) {
        mkdirpSync(tmpFolder);
      }

      const options = {
        file: scene.path,
        pattern: `${scene._id}-{{index}}.jpg`,
        count: 100,
        thumbnailPath: tmpFolder,
        quality: "60",
      };

      const timestamps = generateTimestampsAtIntervals(options.count, scene.meta.duration, {
        startPercentage: 2,
        endPercentage: 100,
      });

      logger.debug(`Timestamps: ${formatMessage(timestamps)}`);
      logger.debug(`Creating previews with options: ${formatMessage(options)}`);

      let hadError = false;

      await asyncPool(4, timestamps, (timestamp) => {
        const index = timestamps.findIndex((s) => s === timestamp);
        return new Promise<void>((resolve) => {
          logger.debug(`Creating preview ${index}...`);
          ffmpeg(options.file)
            .on("end", () => {
              logger.verbose(`Created preview ${index}`);
              resolve();
            })
            .on("error", (err: Error) => {
              logger.error({
                options,
                duration: scene.meta.duration,
                timestamps,
              });
              logger.error(err);
              logger.error(`Preview generation failed for preview ${index}`);
              hadError = true;
              resolve();
            })
            .screenshots({
              count: 1,
              timemarks: [timestamp],
              // Note: we can't use the FFMPEG index syntax
              // because we're generating 1 screenshot at a time instead of N
              filename: options.pattern.replace("{{index}}", index.toString().padStart(3, "0")),
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
        return resolve(null);
      }

      logger.debug(`Created 100 small previews for ${scene._id}.`);

      const files = (await readdirAsync(tmpFolder, "utf-8")).map((fileName) =>
        path.join(tmpFolder, fileName)
      );
      logger.debug(files);
      if (!files.length) {
        logger.error("Failed preview generation: no images");
        return resolve(null);
      }

      logger.debug(`Creating preview strip for ${scene._id}...`);

      const img = (await mergeImg(files)) as Jimp;

      const file = path.join(libraryPath("previews/"), `${scene._id}.jpg`);

      logger.debug(`Writing to file ${file}...`);

      img.write(file, async () => {
        logger.debug("Finished generating preview.");

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
          return new Promise<void>((resolve, reject) => {
            ffmpeg(file)
              .on("end", () => {
                logger.verbose("Created thumbnail");
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
                size: `${Math.min(
                  dimensions.width || config.processing.imageCompressionSize,
                  config.processing.imageCompressionSize
                )}x?`,
              });
          });
        })();

        logger.info("Thumbnail generation done.");

        const thumbnailFilenames = (await readdirAsync(folder)).filter((name) => name.includes(id));

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

        const thumb = thumbnailFiles[0];
        if (!thumb) {
          throw new Error("Thumbnail generation failed");
        }
        resolve(thumb);
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }

  static async screenshot(scene: Scene, sec: number): Promise<Image | null> {
    if (!scene.path) {
      logger.debug("No scene path.");
      return null;
    }

    const config = getConfig();

    const image = new Image(`${scene.name} (thumbnail)`);
    const imagePath = `${path.join(libraryPath("thumbnails/"), image._id)}.jpg`;
    image.path = imagePath;
    image.scene = scene._id;

    logger.debug("Generating screenshot for scene...");

    await singleScreenshot(scene.path, imagePath, sec, config.processing.imageCompressionSize);

    logger.debug("Screenshot done.");
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
          Math.floor((scene.meta.duration || 30) / config.processing.screenshotInterval)
        );
      } else {
        logger.warn("No duration of scene found, defaulting to 10 thumbnails...");
        amount = 10;
      }

      const options = {
        file: scene.path,
        pattern: `${scene._id}-{{index}}.jpg`,
        count: amount,
        thumbnailPath: libraryPath("thumbnails/"),
      };

      try {
        const timestamps = generateTimestampsAtIntervals(options.count, scene.meta.duration, {
          startPercentage: 2,
          endPercentage: 100,
        });

        logger.debug(`Timestamps: ${formatMessage(timestamps)}`);
        logger.debug(`Creating thumbnails with options: ${formatMessage(options)}`);

        await asyncPool(4, timestamps, (timestamp) => {
          const index = timestamps.findIndex((s) => s === timestamp);
          return new Promise<void>((resolve, reject) => {
            logger.debug(`Creating thumbnail ${index}...`);
            ffmpeg(options.file)
              .on("end", () => {
                logger.verbose(`Created thumbnail ${index}`);
                resolve();
              })
              .on("error", (err: Error) => {
                logger.error(`Thumbnail generation failed for thumbnail ${index}`);
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
                filename: options.pattern.replace("{{index}}", index.toString().padStart(3, "0")),
                folder: options.thumbnailPath,
                size: `${Math.min(
                  scene.meta.dimensions?.width || config.processing.imageCompressionSize,
                  config.processing.imageCompressionSize
                )}x?`,
              });
          });
        });

        logger.info("Thumbnail generation done.");

        const thumbnailFilenames = (await readdirAsync(options.thumbnailPath)).filter((name) =>
          name.includes(scene._id)
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

        thumbnailFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        logger.info(`Generated ${thumbnailFiles.length} thumbnails.`);

        resolve(thumbnailFiles);
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }
}
