import { getConfig } from "../config";
import { collections } from "../database";
import { buildExtractor } from "../extractor";
import { ignoreSingleNames } from "../matching/matcher";
import { indexScenes } from "../search/scene";
import { searchStudios } from "../search/studio";
import { mapAsync } from "../utils/async";
import { generateHash } from "../utils/hash";
import { handleError, logger } from "../utils/logger";
import { createObjectSet } from "../utils/misc";
import Actor from "./actor";
import { iterate } from "./common";
import Label from "./label";
import Movie from "./movie";
import Scene, { getAverageRating } from "./scene";

import ora = require("ora");

export default class Studio {
  _id: string;
  name: string;
  description: string | null = null;
  url: string | null = null;
  thumbnail: string | null = null;
  addedOn: number = +new Date();
  favorite = false;
  bookmark: number | null = null;
  parent: string | null = null;
  aliases?: string[];
  customFields: Record<string, boolean | string | number | string[] | null> = {};
  rating = 0;

  static async iterate(
    func: (scene: Studio) => void | unknown | Promise<void | unknown>,
    extraFilter: unknown[] = []
  ) {
    return iterate(searchStudios, Studio.getBulk, func, "studio", extraFilter);
  }

  constructor(name: string) {
    this._id = `st_${generateHash()}`;
    this.name = name;
  }

  static async getAverageRating(studio: Studio): Promise<number> {
    logger.debug(`Calculating average rating for "${studio.name}"`);
    const scenes = await Studio.getScenes(studio);
    return getAverageRating(scenes);
  }

  static async getParents(studio: Studio): Promise<Studio[]> {
    const list: Studio[] = [];
    let current = studio;
    while (current && current.parent) {
      const parent = await Studio.getById(current.parent);
      if (parent) {
        list.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    return list;
  }

  static async remove(studioId: string): Promise<void> {
    await collections.studios.remove(studioId);
  }

  static async filterParentStudio(studioId: string): Promise<void> {
    for (const studio of await Studio.getSubStudios(studioId)) {
      studio.parent = null;
      await collections.studios.upsert(studio._id, studio);
    }
  }

  static async getById(_id: string): Promise<Studio | null> {
    return collections.studios.get(_id);
  }

  static getBulk(_ids: string[]): Promise<Studio[]> {
    return collections.studios.getBulk(_ids);
  }

  static async getAll(): Promise<Studio[]> {
    return collections.studios.getAll();
  }

  static async getScenes(studio: Studio): Promise<Scene[]> {
    const scenes = await Scene.getByStudio(studio._id);
    const subStudios = await Studio.getSubStudios(studio._id);

    const scenesOfSubStudios = (
      await Promise.all(subStudios.map((child) => Studio.getScenes(child)))
    ).flat();

    return scenes.concat(scenesOfSubStudios);
  }

  static async getMovies(studio: Studio): Promise<Movie[]> {
    const movies = await Movie.getByStudio(studio._id);

    const moviesOfSubStudios = (
      await Promise.all(
        (await Studio.getSubStudios(studio._id)).map((child) => Studio.getMovies(child))
      )
    ).flat();

    return movies.concat(moviesOfSubStudios);
  }

  static async getSubStudios(studioId: string): Promise<Studio[]> {
    return collections.studios.query("parent-index", studioId);
  }

  static async getActors(studio: Studio): Promise<Actor[]> {
    const scenes = await Studio.getScenes(studio);
    const actorIds = [
      ...new Set((await mapAsync(scenes, Scene.getActors)).flat().map((a) => a._id)),
    ];
    return await Actor.getBulk(actorIds);
  }

  static async setLabels(studio: Studio, labelIds: string[]): Promise<void> {
    return Label.setForItem(studio._id, labelIds, "studio");
  }

  static async addLabels(studio: Studio, labelIds: string[]): Promise<void> {
    return Label.addForItem(studio._id, labelIds, "studio");
  }

  static async getLabels(studio: Studio): Promise<Label[]> {
    return Label.getForItem(studio._id);
  }

  static async inferLabels(studio: Studio): Promise<Label[]> {
    const scenes = await Studio.getScenes(studio);
    const labels = (await mapAsync(scenes, Scene.getLabels)).flat();
    return createObjectSet(labels, "_id");
  }

  /**
   * Adds the studio's labels to its attached scenes
   *
   * @param studio - the studio
   * @param studioLabels - the labels to push
   */
  static async pushLabelsToCurrentScenes(studio: Studio, studioLabels: string[]): Promise<void> {
    if (!studioLabels?.length) {
      // Prevent looping if there are no labels to add
      return;
    }

    const studioScenes = await Scene.getByStudio(studio._id);
    if (!studioScenes.length) {
      logger.debug(`No scenes to update studio "${studio.name}" labels for`);
      return;
    }

    logger.verbose(`Attaching studio "${studio.name}"'s labels to existing scenes`);

    for (const scene of studioScenes) {
      await Scene.addLabels(scene, studioLabels);
    }

    try {
      await indexScenes(studioScenes);
    } catch (error) {
      logger.error(error);
    }
    logger.verbose(`Updated labels of all studio "${studio.name}"'s scenes`);
  }

  /**
   * Attaches the studio and its labels to all matching scenes that it
   * isn't already attached to
   *
   * @param studio - the studio
   * @param studioLabels - the studio's labels. Will be applied to scenes if given.
   */
  static async findUnmatchedScenes(studio: Studio, studioLabels?: string[]): Promise<void> {
    const config = getConfig();
    // Prevent looping on scenes if we know it'll never be matched
    if (
      config.matching.matcher.options.ignoreSingleNames &&
      !ignoreSingleNames([studio.name]).length
    ) {
      return;
    }

    const localExtractStudios = await buildExtractor(
      () => [studio],
      (studio) => [studio.name, ...(studio.aliases || [])],
      true
    );
    const matchedScenes: Scene[] = [];

    logger.verbose(`Attaching studio "${studio.name}" labels to scenes`);
    let sceneIterationCount = 0;
    const loader = ora(
      `Attaching studio "${studio.name}" to unmatched scenes. Checked ${sceneIterationCount} scenes`
    ).start();

    await Scene.iterate(async (scene) => {
      sceneIterationCount++;
      loader.text = `Attaching studio "${studio.name}" to unmatched scenes. Checked ${sceneIterationCount} scenes`;

      if (localExtractStudios(scene.path || scene.name)[0] === studio._id) {
        logger.debug(`Found scene "${scene.name}"`);
        matchedScenes.push(scene);

        if (studioLabels?.length) {
          await Scene.addLabels(scene, studioLabels);
        }

        scene.studio = studio._id;
        await collections.scenes.upsert(scene._id, scene);
      }
    });

    loader.succeed(`Attached studio "${studio.name}" to ${matchedScenes.length} scenes`);

    try {
      await indexScenes(matchedScenes);
    } catch (error) {
      handleError("Error indexing scenes", error);
    }

    logger.debug(
      `Added studio "${studio.name}" ${
        studioLabels?.length ? "with" : "without"
      } labels to scenes: ${JSON.stringify(
        matchedScenes.map((s) => s._id),
        null,
        2
      )}`
    );
  }
}
