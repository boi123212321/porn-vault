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
import * as logger from "../logger/index";
import * as database from "../database/index";
import CustomField, { CustomFieldTarget } from "../types/custom_field";
import CrossReference from "../types/cross_references";
import { inspect } from "util";

export interface ICreateOptions {
  scenes?: Dictionary<IImportedScene>;
  actors?: Dictionary<IImportedActor>;
  labels?: Dictionary<IImportedLabel>;
  movies?: Dictionary<IImportedMovie>;
  studios?: Dictionary<IImportedStudio>;
  customFields?: Dictionary<IImportedCustomField>;
}

const isNumber = (i: any) => typeof i === "number";
const isBoolean = (i: any) => typeof i === "boolean";

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

  if (opts.labels) {
    for (const labelId in opts.labels) {
      const labelToCreate = opts.labels[labelId];

      const label = new Label(labelToCreate.name, labelToCreate.aliases || []);

      // TODO: commit
      /* for (const scene of await Scene.getAll()) {
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
      
      await database.insert(database.store.labels, label); */
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

      // TODO: commit
      // await database.insert(database.store.customFields, label);
      createdFields[fieldId] = field;
    }
  }

  if (opts.actors) {
    for (const actorId in opts.actors) {
      const actorToCreate = opts.actors[actorId];

      const actor = new Actor(actorToCreate.name, actorToCreate.aliases || []);

      if (isBoolean(actorToCreate.bookmark))
        actor.bookmark = <boolean>actorToCreate.bookmark;

      if (isBoolean(actorToCreate.favorite))
        actor.favorite = <boolean>actorToCreate.favorite;

      if (isNumber(actorToCreate.bornOn))
        actor.bornOn = <number>actorToCreate.bornOn;

      if (isNumber(actorToCreate.rating))
        actor.rating = <number>actorToCreate.rating;

      if (actorToCreate.thumbnail) {
        const image = new Image(`${actor.name} (thumbnail)`);
        image.path = actorToCreate.thumbnail;
        actor.thumbnail = image._id;

        const reference = new CrossReference(image._id, actor._id);

        // TODO: commit
        // await database.insert(database.store.crossReferences, reference);
        // await database.insert(database.store.images, image);
      }

      if (actorToCreate.labels) {
        const labelIds = normalizeCreatedObjects(
          actorToCreate.labels,
          createdLabels
        );
        // TODO: commit
        // await Actor.setLabels(actor, labelIds);
      }

      if (actorToCreate.customFields) {
        actor.customFields = normalizeCustomFields(
          actorToCreate.customFields,
          createdFields
        );
      }

      // TODO: commit
      // await database.insert(database.store.actors, actor);
      // TODO: plugin event
      createdActors[actorId] = actor;
    }
  }

  // TODO: scene plugin event
  // TODO: movie plugin event

  console.log({ createdFields, createdLabels });
  console.log(inspect(createdActors, true, null));
}
