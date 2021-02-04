import { getConfig } from "../../config";
import { ApplyActorLabelsEnum, ApplyStudioLabelsEnum } from "../../config/schema";
import {
  actorCollection,
  imageCollection,
  labelCollection,
  markerCollection,
  movieCollection,
  studioCollection,
  viewCollection,
} from "../../database";
import {
  buildActorExtractor,
  buildFieldExtractor,
  buildLabelExtractor,
  extractMovies,
  extractStudios,
} from "../../extractor";
import { runPluginsSerial } from "../../plugins";
import { indexActors } from "../../search/actor";
import { indexImages } from "../../search/image";
import { indexMarkers } from "../../search/marker";
import { indexMovies } from "../../search/movie";
import { indexStudios } from "../../search/studio";
import Actor from "../../types/actor";
import Image from "../../types/image";
import Label from "../../types/label";
import Marker from "../../types/marker";
import Movie from "../../types/movie";
import Scene from "../../types/scene";
import Studio from "../../types/studio";
import SceneView from "../../types/watch";
import { mapAsync } from "../../utils/async";
import { handleError, logger } from "../../utils/logger";
import { validRating } from "../../utils/misc";
import { isNumber } from "../../utils/types";
import { createImage, createLocalImage } from "../context";
import { onActorCreate } from "./actor";
import { onMovieCreate } from "./movie";
import { onStudioCreate } from "./studio";

// This function has side effects
export async function onSceneCreate(
  scene: Scene,
  sceneLabels: string[],
  sceneActors: string[],
  event: "sceneCustom" | "sceneCreated" = "sceneCreated"
): Promise<Scene> {
  const config = getConfig();

  const createdImages = [] as Image[];

  const pluginResult = await runPluginsSerial(config, event, {
    scene: JSON.parse(JSON.stringify(scene)) as Scene,
    sceneName: scene.name,
    scenePath: scene.path,
    $createMarker: async (name: string, seconds: number) => {
      const marker = new Marker(name, scene._id, seconds);
      await markerCollection.upsert(marker._id, marker);
      await Marker.createMarkerThumbnail(marker);
      await indexMarkers([marker]);
      return marker._id;
    },
    $createLocalImage: async (path: string, name: string, thumbnail?: boolean) => {
      const img = await createLocalImage(path, name, thumbnail);
      img.scene = scene._id;
      await imageCollection.upsert(img._id, img);

      if (!thumbnail) {
        createdImages.push(img);
      }

      return img._id;
    },
    $createImage: async (url: string, name: string, thumbnail?: boolean) => {
      const img = await createImage(url, name, thumbnail);
      img.scene = scene._id;
      await imageCollection.upsert(img._id, img);
      if (!thumbnail) {
        createdImages.push(img);
      }
      return img._id;
    },
  });

  if (
    event === "sceneCreated" &&
    pluginResult.watches &&
    Array.isArray(pluginResult.watches) &&
    pluginResult.watches.every((v) => typeof v === "number")
  ) {
    for (const stamp of pluginResult.watches) {
      const watchItem = new SceneView(scene._id, stamp);
      await viewCollection.upsert(watchItem._id, watchItem);
    }
  }

  if (
    typeof pluginResult.thumbnail === "string" &&
    pluginResult.thumbnail.startsWith("im_") &&
    (!scene.thumbnail || config.plugins.allowSceneThumbnailOverwrite)
  ) {
    scene.thumbnail = pluginResult.thumbnail;
  }

  if (typeof pluginResult.name === "string") {
    scene.name = pluginResult.name;
  }

  if (typeof pluginResult.path === "string") {
    scene.path = pluginResult.path;
  }

  if (typeof pluginResult.description === "string") {
    scene.description = pluginResult.description;
  }

  if (typeof pluginResult.releaseDate === "number") {
    scene.releaseDate = new Date(pluginResult.releaseDate).valueOf();
  }

  if (typeof pluginResult.addedOn === "number") {
    scene.addedOn = new Date(pluginResult.addedOn).valueOf();
  }

  if (Array.isArray(pluginResult.views) && pluginResult.views.every(isNumber)) {
    for (const viewTime of pluginResult.views) {
      await Scene.watch(scene, viewTime);
    }
  }

  if (pluginResult.custom && typeof pluginResult.custom === "object") {
    const localExtractFields = await buildFieldExtractor();
    for (const key in pluginResult.custom) {
      const fields = localExtractFields(key);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      if (fields.length) scene.customFields[fields[0]] = pluginResult.custom[key];
    }
  }

  if (validRating(pluginResult.rating)) {
    scene.rating = pluginResult.rating;
  }

  if (typeof pluginResult.favorite === "boolean") {
    scene.favorite = pluginResult.favorite;
  }

  if (typeof pluginResult.bookmark === "number") {
    scene.bookmark = pluginResult.bookmark;
  }

  if (pluginResult.actors && Array.isArray(pluginResult.actors)) {
    const actorIds = [] as string[];
    const shouldApplyActorLabels =
      (event === "sceneCreated" &&
        config.matching.applyActorLabels.includes(
          ApplyActorLabelsEnum.enum["plugin:scene:create"]
        )) ||
      (event === "sceneCustom" &&
        config.matching.applyActorLabels.includes(
          ApplyActorLabelsEnum.enum["plugin:scene:custom"]
        ));

    const localExtractActors = await buildActorExtractor();
    for (const actorName of pluginResult.actors) {
      const extractedIds = localExtractActors(actorName);
      if (extractedIds.length) {
        actorIds.push(...extractedIds);
      } else if (config.plugins.createMissingActors) {
        let actor = new Actor(actorName);
        actorIds.push(actor._id);
        const actorLabels = [] as string[];
        try {
          actor = await onActorCreate(actor, actorLabels);
        } catch (error) {
          handleError(`onActorCreate error`, error);
        }
        await Actor.setLabels(actor, actorLabels);
        await actorCollection.upsert(actor._id, actor);
        if (config.matching.matchCreatedActors) {
          await Actor.findUnmatchedScenes(actor, shouldApplyActorLabels ? actorLabels : []);
        }
        await indexActors([actor]);
        logger.debug(`Created actor ${actor.name}`);
      }

      if (shouldApplyActorLabels) {
        const actors = await Actor.getBulk(actorIds);
        const actorLabelIds = (await mapAsync(actors, Actor.getLabels)).flat().map((l) => l._id);
        logger.verbose("Applying actor labels to scene");
        sceneLabels.push(...actorLabelIds);
      }
    }
    sceneActors.push(...actorIds);
  }

  if (pluginResult.labels && Array.isArray(pluginResult.labels)) {
    const labelIds = [] as string[];
    const localExtractLabels = await buildLabelExtractor();
    for (const labelName of pluginResult.labels) {
      const extractedIds = localExtractLabels(labelName);
      if (extractedIds.length) {
        labelIds.push(...extractedIds);
        logger.verbose(`Found ${extractedIds.length} labels for ${<string>labelName}:`);
        logger.debug(extractedIds);
      } else if (config.plugins.createMissingLabels) {
        const label = new Label(labelName);
        labelIds.push(label._id);
        await labelCollection.upsert(label._id, label);
        logger.debug(`Created label ${label.name}`);
      }
    }
    sceneLabels.push(...labelIds);
  }

  if (!scene.studio && pluginResult.studio && typeof pluginResult.studio === "string") {
    let studioLabels: string[] = [];
    const studioId = (await extractStudios(pluginResult.studio))[0] || null;
    const shouldApplyStudioLabels =
      (event === "sceneCreated" &&
        config.matching.applyStudioLabels.includes(
          ApplyStudioLabelsEnum.enum["plugin:scene:create"]
        )) ||
      (event === "sceneCustom" &&
        config.matching.applyStudioLabels.includes(
          ApplyStudioLabelsEnum.enum["plugin:scene:custom"]
        ));

    if (studioId) {
      scene.studio = studioId;
      if (shouldApplyStudioLabels) {
        const studio = await Studio.getById(studioId);
        if (studio) {
          studioLabels = (await Studio.getLabels(studio)).map((l) => l._id);
        }
      }
    } else if (config.plugins.createMissingStudios) {
      let studio = new Studio(pluginResult.studio);
      scene.studio = studio._id;

      try {
        studio = await onStudioCreate(studio, studioLabels);
      } catch (error) {
        handleError(`Error running studio plugin for new studio, in scene plugin`, error);
      }

      await Studio.findUnmatchedScenes(studio, shouldApplyStudioLabels ? studioLabels : []);
      await studioCollection.upsert(studio._id, studio);
      await indexStudios([studio]);
      logger.debug(`Created studio ${studio.name}`);
    }
    if (shouldApplyStudioLabels) {
      logger.verbose("Applying actor labels to scene");
      sceneLabels.push(...studioLabels);
    }
  }

  if (pluginResult.movie && typeof pluginResult.movie === "string") {
    const movieId = (await extractMovies(pluginResult.movie))[0] || null;

    if (movieId) {
      const movie = <Movie>await Movie.getById(movieId);
      const sceneIds = (await Movie.getScenes(movie)).map((sc) => sc._id);
      await Movie.setScenes(movie, sceneIds.concat(scene._id));
      await indexMovies([movie]);
    } else if (config.plugins.createMissingMovies) {
      let movie = new Movie(pluginResult.movie);

      try {
        movie = await onMovieCreate(movie, "movieCreated");
      } catch (error) {
        handleError(`onMovieCreate error`, error);
      }

      await movieCollection.upsert(movie._id, movie);
      logger.debug(`Created movie ${movie.name}`);
      await Movie.setScenes(movie, [scene._id]);
      logger.debug(`Attached ${scene.name} to movie ${movie.name}`);
      await indexMovies([movie]);
    }
  }

  for (const image of createdImages) {
    if (config.matching.applySceneLabels) {
      await Image.setLabels(image, sceneLabels);
    }
    await Image.setActors(image, sceneActors);
    await indexImages([image]);
  }

  return scene;
}
