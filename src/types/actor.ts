import moment from "moment";

import { getConfig } from "../config";
import { actorCollection, actorReferenceCollection } from "../database";
import { buildExtractor } from "../extractor";
import { ignoreSingleNames } from "../matching/matcher";
import { searchActors } from "../search/actor";
import { indexScenes } from "../search/scene";
import { mapAsync } from "../utils/async";
import { generateHash } from "../utils/hash";
import { handleError, logger } from "../utils/logger";
import { arrayDiff, createObjectSet } from "../utils/misc";
import ActorReference from "./actor_reference";
import { iterate } from "./common";
import Label from "./label";
import Movie from "./movie";
import Scene, { getAverageRating } from "./scene";
import Studio from "./studio";
import SceneView from "./watch";
import ora = require("ora");

export default class Actor {
  _id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  bornOn: number | null = null;
  thumbnail: string | null = null;
  altThumbnail: string | null = null;
  hero?: string | null = null;
  avatar?: string | null = null;
  favorite = false;
  bookmark: number | null = null;
  rating = 0;
  customFields: Record<string, boolean | string | number | string[] | null> = {};

  description?: string | null = null;
  nationality?: string | null = null;

  static async iterate(
    func: (scene: Actor) => void | unknown | Promise<void | unknown>,
    extraFilter: unknown[] = []
  ) {
    return iterate(searchActors, Actor.getBulk, func, "actor", extraFilter);
  }

  static async getStudioFeatures(actor: Actor): Promise<Studio[]> {
    const scenes = await Scene.getByActor(actor._id);
    return Studio.getBulk(scenes.map((scene) => scene.studio!).filter(Boolean));
  }

  static async getAverageRating(actor: Actor): Promise<number> {
    logger.debug(`Calculating average rating for "${actor.name}"`);
    const scenes = await Scene.getByActor(actor._id);
    return getAverageRating(scenes);
  }

  static getAge(actor: Actor): number | null {
    if (actor.bornOn) {
      return moment().diff(actor.bornOn, "years");
    }
    return null;
  }

  static async remove(actor: Actor): Promise<Actor> {
    return actorCollection.remove(actor._id);
  }

  static async setLabels(actor: Actor, labelIds: string[]): Promise<void> {
    return Label.setForItem(actor._id, labelIds, "actor");
  }

  static async getLabels(actor: Actor): Promise<Label[]> {
    return Label.getForItem(actor._id);
  }

  static async setForItem(itemId: string, actorIds: string[], type: string): Promise<void> {
    const oldRefs = await ActorReference.getByItem(itemId);

    const { removed, added } = arrayDiff(oldRefs, [...new Set(actorIds)], "actor", (l) => l);

    for (const oldRef of removed) {
      await actorReferenceCollection.remove(oldRef._id);
    }

    for (const id of added) {
      const actorRef = new ActorReference(itemId, id, type);
      logger.debug(`Adding actor to ${type}: ${JSON.stringify(actorRef)}`);
      await actorReferenceCollection.upsert(actorRef._id, actorRef);
    }
  }

  static async addForItem(itemId: string, actorIds: string[], type: string): Promise<void> {
    const oldRefs = await ActorReference.getByItem(itemId);

    const { added } = arrayDiff(oldRefs, [...new Set(actorIds)], "actor", (l) => l);

    for (const id of added) {
      const actorRef = new ActorReference(itemId, id, type);
      logger.debug(`Adding actor to ${type}: ${JSON.stringify(actorRef)}`);
      await actorReferenceCollection.upsert(actorRef._id, actorRef);
    }
  }

  static async getById(_id: string): Promise<Actor | null> {
    return actorCollection.get(_id);
  }

  static async getByName(name: string): Promise<Actor | null> {
    const actor = await actorCollection.query("name-index", encodeURIComponent(name));
    return actor[0] as Actor | null;
  }

  static async getBulk(_ids: string[]): Promise<Actor[]> {
    return actorCollection.getBulk(_ids);
  }

  static async getAll(): Promise<Actor[]> {
    return actorCollection.getAll();
  }

  static async getWatches(actor: Actor): Promise<SceneView[]> {
    const scenes = await Scene.getByActor(actor._id);

    return (
      await mapAsync(scenes, (scene) => {
        return SceneView.getByScene(scene._id);
      })
    )
      .flat()
      .sort((a, b) => a.date - b.date);
  }

  static calculateScore(actor: Actor, numViews: number, numScenes: number): number {
    const viewScore = Math.round((10 * numViews) / (numScenes / 2) || 0);
    const favScore = +actor.favorite * 10;
    const score = viewScore + numViews + favScore + actor.rating;
    return score;
  }

  static async getLabelUsage(): Promise<
    {
      label: Label;
      score: number;
    }[]
  > {
    const scores = {} as Record<string, { label: Label; score: number }>;

    for (const label of await Label.getAll()) {
      const { total } = await searchActors({
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

  static async getTopActors(skip = 0, take = 0): Promise<(Actor | null)[]> {
    const result = await searchActors({
      sortBy: "score",
      sortDir: "desc",
      skip,
      take,
    });
    return Actor.getBulk(result.items);
  }

  constructor(name: string, aliases: string[] = []) {
    this._id = `ac_${generateHash()}`;
    this.name = name.trim();
    this.aliases = [...new Set(aliases.map((tag) => tag.trim()))];
  }

  static async getMovies(actor: Actor): Promise<Movie[]> {
    const scenes = await Scene.getByActor(actor._id);
    const movies = await mapAsync(scenes, Scene.getMovies);
    return createObjectSet(movies.flat(), "_id");
  }

  static async getCollabs(
    actor: Actor
  ): Promise<
    {
      scene: Scene;
      actors: Actor[];
    }[]
  > {
    const scenes = await Scene.getByActor(actor._id);

    return await mapAsync(scenes, async (scene) => {
      return {
        scene,
        actors: (await Scene.getActors(scene)).filter((ac) => ac._id !== actor._id),
      };
    });
  }

  /**
   * Adds the actor's labels to its attached scenes
   *
   * @param actor - the actor
   * @param actorLabels - the actor's labels. Will be applied to scenes if given.
   */
  static async pushLabelsToCurrentScenes(actor: Actor, actorLabels?: string[]): Promise<void> {
    if (!actorLabels?.length) {
      // Prevent looping if there are no labels to add
      return;
    }

    const actorScenes = await Scene.getByActor(actor._id);
    if (!actorScenes.length) {
      logger.debug(`No scenes to update actor "${actor.name}" labels for`);
      return;
    }

    logger.verbose(`Attaching actor "${actor.name}" labels to existing scenes`);

    for (const scene of actorScenes) {
      await Scene.addLabels(scene, actorLabels);
    }

    try {
      await indexScenes(actorScenes);
    } catch (error) {
      logger.error(error);
    }
    logger.verbose(`Updated labels of all actor "${actor.name}"'s scenes`);
  }

  /**
   * Attaches the actor and its labels to all matching scenes that it
   * isn't already attached to
   *
   * @param actor - the actor
   * @param actorLabels - the actor's labels. Will be applied to scenes if given.
   */
  static async findUnmatchedScenes(actor: Actor, actorLabels?: string[]): Promise<void> {
    const config = getConfig();
    // Prevent looping on scenes if we know it'll never be matched
    if (
      config.matching.matcher.options.ignoreSingleNames &&
      !ignoreSingleNames([actor.name]).length
    ) {
      return;
    }

    const localExtractActors = await buildExtractor(
      async () => [actor],
      (actor) => [actor.name, ...actor.aliases],
      false
    );
    const matchedScenes: Scene[] = [];

    logger.verbose(`Attaching actor "${actor.name}" labels to scenes`);
    let sceneIterationCount = 0;
    const loader = ora(
      `Attaching actor "${actor.name}" to unmatched scenes. Checked ${sceneIterationCount} scenes`
    ).start();

    await Scene.iterate(async (scene) => {
      if (localExtractActors(scene.path || scene.name).includes(actor._id)) {
        logger.debug(`Found scene "${scene.name}"`);
        matchedScenes.push(scene);

        if (actorLabels?.length) {
          logger.debug(`Adding ${actorLabels.length} actor labels to scene`);
          await Scene.addLabels(scene, actorLabels);
        }

        await Scene.addActors(scene, [actor._id]);
      }

      sceneIterationCount++;
      loader.text = `Attaching actor "${actor.name}" to unmatched scenes. Checked ${sceneIterationCount} scenes`;
    });

    loader.succeed(`Attached actor "${actor.name}" to ${matchedScenes.length} scenes`);

    try {
      await indexScenes(matchedScenes);
    } catch (error) {
      handleError("Error indexing scenes", error);
    }

    logger.debug(
      `Added actor "${actor.name}" ${
        actorLabels?.length ? "with" : "without"
      } labels to scenes: ${JSON.stringify(
        matchedScenes.map((s) => s._id),
        null,
        2
      )}`
    );
  }
}
