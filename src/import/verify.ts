import { ICreateOptions } from "./create";
import Actor from "../types/actor";
import CustomField from "../types/custom_field";
import Movie from "../types/movie";
import Scene from "../types/scene";
import Studio from "../types/studio";
import { existsSync } from "fs";
import Label from "../types/label";
import { Dictionary } from "../types/utility";

async function checkDuplicates(opts: ICreateOptions) {
  if (opts.actors) {
    for (const actorId in opts.actors) {
      const actorInDb = await Actor.getById(actorId);
      if (actorInDb) throw new Error(`Actor ${actorId} already exists!`);
    }
  }

  if (opts.customFields) {
    for (const fieldId in opts.customFields) {
      const fieldInDb = await CustomField.getById(fieldId);
      if (fieldInDb) throw new Error(`Custom field ${fieldId} already exists!`);
    }
  }

  if (opts.labels) {
    for (const labelId in opts.labels) {
      const labelInDb = await Label.getById(labelId);
      if (labelInDb) throw new Error(`Label ${labelId} already exists!`);
    }
  }

  if (opts.movies) {
    for (const movieId in opts.movies) {
      const movieInDb = await Movie.getById(movieId);
      if (movieInDb) throw new Error(`Movie ${movieId} already exists!`);
    }
  }

  if (opts.scenes) {
    for (const sceneId in opts.scenes) {
      const sceneInDb = await Scene.getById(sceneId);
      if (sceneInDb) throw new Error(`Scene ${sceneId} already exists!`);
    }
  }

  if (opts.studios) {
    for (const studioId in opts.studios) {
      const studioInDb = await Studio.getById(studioId);
      if (studioInDb) throw new Error(`Studio ${studioId} already exists!`);
    }
  }
}

async function checkIfActorsExist(
  actors: string[],
  actorDict?: Dictionary<any>
) {
  for (const actorId of actors) {
    if (!(await Actor.getById(actorId))) {
      if (!actorDict) throw new Error(`Actor ${actorId} does not exist`);
      else if (!actorDict[actorId])
        throw new Error(`Actor ${actorId} does not exist`);
    }
  }
}

async function checkIfScenesExist(
  scenes: string[],
  sceneDict?: Dictionary<any>
) {
  for (const sceneId of scenes) {
    if (!(await Scene.getById(sceneId))) {
      if (!sceneDict) throw new Error(`Scene ${sceneId} does not exist`);
      else if (!sceneDict[sceneId])
        throw new Error(`Scene ${sceneId} does not exist`);
    }
  }
}

async function checkIfLabelsExist(
  labels: string[],
  labelDict?: Dictionary<any>
) {
  for (const labelId of labels) {
    if (!(await Label.getById(labelId))) {
      if (!labelDict) throw new Error(`Label ${labelId} does not exist`);
      else if (!labelDict[labelId])
        throw new Error(`Label ${labelId} does not exist`);
    }
  }
}

async function checkIfStudioExists(
  studioId: string,
  studioDict?: Dictionary<any>
) {
  if (!(await Studio.getById(studioId))) {
    if (!studioDict) throw new Error(`Studio ${studioId} does not exist`);
    else if (!studioDict[studioId])
      throw new Error(`Studio ${studioId} does not exist`);
  }
}

async function checkIfCustomFieldsExist(
  fields: string[],
  fieldDict?: Dictionary<any>
) {
  for (const fieldId of fields) {
    if (!(await CustomField.getById(fieldId))) {
      if (!fieldDict) throw new Error(`Custom field ${fieldId} does not exist`);
      else if (!fieldDict[fieldId])
        throw new Error(`Custom field ${fieldId} does not exist`);
    }
  }
}

async function checkMovies(opts: ICreateOptions) {
  if (opts.movies) {
    for (const movieId in opts.movies) {
      const newMovie = opts.movies[movieId];

      if (newMovie.frontCover) {
        if (!existsSync(newMovie.frontCover))
          throw new Error(`Scene ${movieId} frontCover does not exist.`);
      }

      if (newMovie.backCover) {
        if (!existsSync(newMovie.backCover))
          throw new Error(`Scene ${movieId} backCover does not exist.`);
      }

      if (newMovie.customFields)
        await checkIfCustomFieldsExist(
          Object.keys(newMovie.customFields),
          opts.customFields
        );

      if (newMovie.scenes)
        await checkIfScenesExist(newMovie.scenes, opts.scenes);

      if (newMovie.studio)
        await checkIfStudioExists(newMovie.studio, opts.studios);
    }
  }
}

async function checkScenes(opts: ICreateOptions) {
  if (opts.scenes) {
    for (const sceneId in opts.scenes) {
      const newScene = opts.scenes[sceneId];

      if (!existsSync(newScene.path))
        throw new Error(`Scene ${sceneId} video does not exist.`);

      if (newScene.thumbnail) {
        if (!existsSync(newScene.thumbnail))
          throw new Error(`Scene ${sceneId} thumbnail does not exist.`);
      }

      if (newScene.labels)
        await checkIfLabelsExist(newScene.labels, opts.labels);

      if (newScene.customFields)
        await checkIfCustomFieldsExist(
          Object.keys(newScene.customFields),
          opts.customFields
        );

      if (newScene.actors)
        await checkIfActorsExist(newScene.actors, opts.actors);

      if (newScene.studio)
        await checkIfStudioExists(newScene.studio, opts.studios);
    }
  }
}

async function checkStudios(opts: ICreateOptions) {
  if (opts.studios) {
    for (const studioId in opts.studios) {
      const newStudio = opts.studios[studioId];

      if (newStudio.thumbnail) {
        if (!existsSync(newStudio.thumbnail))
          throw new Error(`Studio ${studioId} thumbnail does not exist.`);
      }

      if (newStudio.parent) await checkIfStudioExists(newStudio.parent);
    }
  }
}

async function checkActors(opts: ICreateOptions) {
  if (opts.actors) {
    for (const actorId in opts.actors) {
      const newActor = opts.actors[actorId];

      if (newActor.thumbnail) {
        if (!existsSync(newActor.thumbnail))
          throw new Error(`Actor ${actorId} thumbnail does not exist.`);
      }

      if (newActor.labels)
        await checkIfLabelsExist(newActor.labels, opts.labels);

      if (newActor.customFields)
        await checkIfCustomFieldsExist(
          Object.keys(newActor.customFields),
          opts.customFields
        );
    }
  }
}

export async function verifyFileData(opts: ICreateOptions) {
  await checkDuplicates(opts);

  await checkActors(opts);
  await checkStudios(opts);
  await checkScenes(opts);
  await checkMovies(opts);
}
