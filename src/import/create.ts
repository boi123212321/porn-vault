import { Dictionary } from "../types/utility";
import {
  IImportedScene,
  IImportedActor,
  IImportedLabel,
  IImportedMovie,
  IImportedStudio,
  IImportedCustomField
} from "./types";
import Label from "../types/label";
import Scene from "../types/scene";
import Actor from "../types/actor";
import Image from "../types/image";
import { stripStr } from "../extractor";
import * as logger from "../logger";
import * as database from "../database/index";
import CustomField, { CustomFieldTarget } from "../types/custom_field";
import CrossReference from "../types/cross_references";
import { inspect } from "util";
import { basename } from "path";
import Movie from "../types/movie";
import Studio from "../types/studio";
import args from "../args";
import { onActorCreate } from "../plugin_events/actor";
import { isString } from "./schemas/common";
import { onMovieCreate } from "../plugin_events/movie";
import { isNumber, isBoolean } from "../types/utility";

export interface ICreateOptions {
  scenes?: Dictionary<IImportedScene>;
  actors?: Dictionary<IImportedActor>;
  labels?: Dictionary<IImportedLabel>;
  movies?: Dictionary<IImportedMovie>;
  studios?: Dictionary<IImportedStudio>;
  customFields?: Dictionary<IImportedCustomField>;
}

function normalizeCustomFields(
  ids: Dictionary<string>,
  newlyCreated: Dictionary<{ _id: string }>
) {
  const fieldIds = Object.keys(ids);

  const newFields = {} as Dictionary<string>;
  for (const fieldId of fieldIds) {
    const value = ids[fieldId];
    // Newly created field
    if (newlyCreated[fieldId] !== undefined)
      newFields[newlyCreated[fieldId]._id] = value;
    // Already existing field
    else newFields[fieldId] = value;
  }

  return newFields;
}

function normalizeCreatedObjects(
  ids: string[],
  newlyCreated: Dictionary<{ _id: string }>
) {
  return ids.map(str => {
    // Newly created object, get database ID instead
    if (newlyCreated[str] !== undefined) return newlyCreated[str]._id;
    // Already in database, just return ID
    return str;
  });
}

export async function createFromFileData(opts: ICreateOptions) {
  const createdLabels = {} as Dictionary<Label>;
  const createdFields = {} as Dictionary<CustomField>;
  const createdActors = {} as Dictionary<Actor>;
  // const createdScenes = {} as Dictionary<IQueueItem>; // TODO:
  const createdMovies = {} as Dictionary<Movie>;
  const createdStudios = {} as Dictionary<Studio>;

  if (opts.labels) {
    for (const labelId in opts.labels) {
      const labelToCreate = opts.labels[labelId];

      const label = new Label(labelToCreate.name, labelToCreate.aliases || []);

      if (args["commit-import"]) {
        for (const scene of await Scene.getAll()) {
          const perms = stripStr(scene.path || scene.name);
          if (
            perms.includes(stripStr(label.name)) ||
            label.aliases.some(alias => perms.includes(stripStr(alias)))
          ) {
            const labels = (await Scene.getLabels(scene)).map(l => l._id);
            labels.push(label._id);
            await Scene.setLabels(scene, labels);
            logger.log(`Updated labels of ${scene._id}.`);
          }
        }
        await database.insert(database.store.labels, label);
      }
      createdLabels[labelId] = label;
    }
  }

  if (opts.customFields) {
    for (const fieldId in opts.customFields) {
      const fieldToCreate = opts.customFields[fieldId];

      const field = new CustomField(
        fieldToCreate.name,
        CustomFieldTarget.ACTORS,
        fieldToCreate.type
      );

      field.values = [...new Set(fieldToCreate.values || [])];

      if (args["commit-import"])
        await database.insert(database.store.customFields, field);
      createdFields[fieldId] = field;
    }
  }

  if (opts.studios) {
    for (const studioId in opts.studios) {
      const studioToCreate = opts.studios[studioId];

      const studio = new Studio(studioToCreate.name);

      if (isNumber(studioToCreate.bookmark))
        studio.bookmark = <number>studioToCreate.bookmark;

      if (isBoolean(studioToCreate.favorite))
        studio.favorite = <boolean>studioToCreate.favorite;

      /* if (isNumber(studioToCreate.rating))
        studio.rating = <number>studioToCreate.rating; */

      if (studioToCreate.parent) studio.parent = studioToCreate.parent;

      if (studioToCreate.thumbnail) {
        const image = new Image(`${studio.name} (thumbnail)`);
        image.path = studioToCreate.thumbnail;
        studio.thumbnail = image._id;

        if (args["commit-import"])
          await database.insert(database.store.images, image);
      }

      if (args["commit-import"])
        await database.insert(database.store.studios, studio);
      createdStudios[studioId] = studio;
    }
  }

  if (opts.actors) {
    for (const actorId in opts.actors) {
      const actorToCreate = opts.actors[actorId];

      let actor = new Actor(actorToCreate.name, actorToCreate.aliases || []);

      if (isNumber(actorToCreate.bookmark))
        actor.bookmark = <number>actorToCreate.bookmark;

      if (isBoolean(actorToCreate.favorite))
        actor.favorite = <boolean>actorToCreate.favorite;

      if (isNumber(actorToCreate.bornOn))
        actor.bornOn = <number>actorToCreate.bornOn;

      if (isNumber(actorToCreate.rating))
        actor.rating = <number>actorToCreate.rating;

      if (isString(actorToCreate.description))
        actor.description = actorToCreate.description;

      if (actorToCreate.thumbnail) {
        const image = new Image(`${actor.name} (thumbnail)`);
        image.path = actorToCreate.thumbnail;
        actor.thumbnail = image._id;

        const reference = new CrossReference(image._id, actor._id);

        if (args["commit-import"]) {
          await database.insert(database.store.crossReferences, reference);
          await database.insert(database.store.images, image);
        }
      }

      let actorLabels = [] as string[];

      if (actorToCreate.labels) {
        actorLabels = normalizeCreatedObjects(
          actorToCreate.labels,
          createdLabels
        );
        if (args["commit-import"]) await Actor.setLabels(actor, actorLabels);
      }

      if (actorToCreate.customFields) {
        actor.customFields = normalizeCustomFields(
          actorToCreate.customFields,
          createdFields
        );
      }

      try {
        actor = await onActorCreate(actor, actorLabels);
      } catch (error) {
        logger.error(error.message);
      }

      if (args["commit-import"])
        await database.insert(database.store.actors, actor);
      createdActors[actorId] = actor;
    }
  } // TODO:
  /*
  if (opts.scenes) {
    for (const sceneId in opts.scenes) {
      const sceneToCreate = opts.scenes[sceneId];

      const _id = new Scene("")._id;
      logger.log(`Creating scene queue item with id ${_id}...`);

      let thumbnail = null as string | null;
      let labels = [] as string[];
      let actors = [] as string[];
      let customFields = {} as Dictionary<string>;

      if (sceneToCreate.thumbnail) {
        const image = new Image(`${sceneToCreate.name} (thumbnail)`);
        image.path = sceneToCreate.thumbnail;
        thumbnail = image._id;

        const reference = new CrossReference(_id, image._id);

        if (args["commit-import"]) {
          await database.insert(database.store.crossReferences, reference);
          await database.insert(database.store.images, image);
        }
      }

      if (sceneToCreate.actors) {
        actors = normalizeCreatedObjects(sceneToCreate.actors, createdActors);
      }

      if (sceneToCreate.labels) {
        labels = normalizeCreatedObjects(sceneToCreate.labels, createdLabels);
      }

      if (sceneToCreate.customFields) {
        customFields = normalizeCustomFields(
          sceneToCreate.customFields,
          createdFields
        );
      }

      const queueItem: IQueueItem = {
        _id,
        filename: basename(sceneToCreate.path),
        path: sceneToCreate.path,
        name: sceneToCreate.name,
        description: sceneToCreate.description || null,
        bookmark: isNumber(sceneToCreate.bookmark)
          ? <number>sceneToCreate.bookmark
          : undefined,
        favorite: isBoolean(sceneToCreate.favorite)
          ? <boolean>sceneToCreate.favorite
          : undefined,
        releaseDate: isNumber(sceneToCreate.releaseDate)
          ? <number>sceneToCreate.releaseDate
          : undefined,
        rating: isNumber(sceneToCreate.rating)
          ? <number>sceneToCreate.rating
          : undefined,
        thumbnail,
        actors,
        labels,
        customFields,
        studio: sceneToCreate.studio
          ? normalizeCreatedObjects(
              [sceneToCreate.studio],
              createdStudios
            ).pop() || null
          : undefined
      };

      if (args["commit-import"]) {
        // TODO: add to library/queue
        // await ProcessingQueue.append(queueItem);
      }
      createdScenes[_id] = queueItem;
    }
  }*/
  /*
  if (opts.movies) {
    for (const movieId in opts.movies) {
      const movieToCreate = opts.movies[movieId];

      let movie = new Movie(movieToCreate.name, Object.keys(createdScenes));

      if (isNumber(movieToCreate.bookmark))
        movie.bookmark = <number>movieToCreate.bookmark;

      if (isBoolean(movieToCreate.favorite))
        movie.favorite = <boolean>movieToCreate.favorite;

      if (isNumber(movieToCreate.releaseDate))
        movie.releaseDate = <number>movieToCreate.releaseDate;

      if (isNumber(movieToCreate.rating))
        movie.rating = <number>movieToCreate.rating;

      if (movieToCreate.studio) {
        movie.studio =
          normalizeCreatedObjects(
            [movieToCreate.studio],
            createdStudios
          ).pop() || null;
      }

      if (movieToCreate.frontCover) {
        const image = new Image(`${movie.name} (front cover)`);
        image.path = movieToCreate.frontCover;
        movie.frontCover = image._id;

        if (args["commit-import"])
          await database.insert(database.store.images, image);
      }

      if (movieToCreate.backCover) {
        const image = new Image(`${movie.name} (back cover)`);
        image.path = movieToCreate.backCover;
        movie.backCover = image._id;

        if (args["commit-import"])
          await database.insert(database.store.images, image);
      }

      if (movieToCreate.spineCover) {
        const image = new Image(`${movie.name} (back cover)`);
        image.path = movieToCreate.spineCover;
        movie.spineCover = image._id;

        if (args["commit-import"])
          await database.insert(database.store.images, image);
      }

      try {
        movie = await onMovieCreate(movie);
      } catch (error) {
        logger.error(error.message);
      }

      if (args["commit-import"])
        await database.insert(database.store.movies, movie);
      createdMovies[movieId] = movie;
    }
  }*/ if (
    !args["commit-import"]
  ) {
    console.log(
      inspect(
        {
          createdFields,
          createdLabels,
          //createdScenes,
          createdActors,
          createdMovies,
          createdStudios
        },
        true,
        null
      )
    );
    logger.message("Run with --commit-import to actually import stuff.");
  }
}
