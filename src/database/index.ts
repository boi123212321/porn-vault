import { existsSync } from "fs";
import ora from "ora";

import args from "../args";
import { ISceneProcessingItem } from "../queue/processing";
import Actor from "../types/actor";
import ActorReference from "../types/actor_reference";
import CustomField from "../types/custom_field";
import Image from "../types/image";
import Label from "../types/label";
import LabelledItem from "../types/labelled_item";
import Marker from "../types/marker";
import Movie from "../types/movie";
import MovieScene from "../types/movie_scene";
import Scene from "../types/scene";
import Studio from "../types/studio";
import SceneView from "../types/watch";
import { mkdirpSync } from "../utils/fs/async";
import { logger } from "../utils/logger";
import { libraryPath } from "../utils/path";
import { Izzy } from "./internal";

mkdirpSync("backups/");
mkdirpSync("tmp/");

export let sceneCollection!: Izzy.Collection<Scene>;
export let imageCollection!: Izzy.Collection<Image>;
export let actorCollection!: Izzy.Collection<Actor>;
export let movieCollection!: Izzy.Collection<Movie>;
export let labelledItemCollection!: Izzy.Collection<LabelledItem>;
export let movieSceneCollection!: Izzy.Collection<MovieScene>;
export let actorReferenceCollection!: Izzy.Collection<ActorReference>;
export let viewCollection!: Izzy.Collection<SceneView>;
export let labelCollection!: Izzy.Collection<Label>;
export let customFieldCollection!: Izzy.Collection<CustomField>;
export let markerCollection!: Izzy.Collection<Marker>;
export let studioCollection!: Izzy.Collection<Studio>;
export let processingCollection!: Izzy.Collection<ISceneProcessingItem>;

export async function loadImageStore(): Promise<void> {
  imageCollection = await Izzy.createCollection("images", libraryPath("images.db"), [
    {
      name: "path-index",
      key: "path",
    },
  ]);
}

export async function loadStores(): Promise<void> {
  const crossReferencePath = libraryPath("cross_references.db");
  if (existsSync(crossReferencePath)) {
    throw new Error("cross_references.db found, are you using an outdated library?");
  }

  logger.debug("Creating folders if needed");
  mkdirpSync(libraryPath("images/"));
  mkdirpSync(libraryPath("thumbnails/")); // generated screenshots
  mkdirpSync(libraryPath("thumbnails/images")); // generated image thumbnails
  mkdirpSync(libraryPath("thumbnails/markers")); // generated marker thumbnails
  mkdirpSync(libraryPath("previews/"));

  const dbLoader = ora("Loading DB").start();

  customFieldCollection = await Izzy.createCollection(
    "custom_fields",
    libraryPath("custom_fields.db"),
    []
  );

  labelCollection = await Izzy.createCollection("labels", libraryPath("labels.db"), []);

  viewCollection = await Izzy.createCollection("scene_views", libraryPath("scene_views.db"), [
    {
      key: "scene",
      name: "scene-index",
    },
  ]);

  actorReferenceCollection = await Izzy.createCollection(
    "actor-references",
    libraryPath("actor_references.db"),
    [
      {
        name: "actor-index",
        key: "actor",
      },
      {
        name: "item-index",
        key: "item",
      },
      {
        name: "type-index",
        key: "type",
      },
    ]
  );

  movieSceneCollection = await Izzy.createCollection(
    "movie-scenes",
    libraryPath("movie_scenes.db"),
    [
      {
        name: "movie-index",
        key: "movie",
      },
      {
        name: "scene-index",
        key: "scene",
      },
    ]
  );

  labelledItemCollection = await Izzy.createCollection(
    "labelled-items",
    libraryPath("labelled_items.db"),
    [
      {
        name: "label-index",
        key: "label",
      },
      {
        name: "item-index",
        key: "item",
      },
      {
        name: "type-index",
        key: "type",
      },
    ]
  );

  await loadImageStore();

  sceneCollection = await Izzy.createCollection("scenes", libraryPath("scenes.db"), [
    {
      name: "studio-index",
      key: "studio",
    },
    {
      name: "path-index",
      key: "path",
    },
  ]);

  actorCollection = await Izzy.createCollection("actors", libraryPath("actors.db"), [
    {
      name: "name-index",
      key: "name",
    },
  ]);

  movieCollection = await Izzy.createCollection("movies", libraryPath("movies.db"), [
    {
      name: "studio-index",
      key: "studio",
    },
  ]);

  markerCollection = await Izzy.createCollection("markers", libraryPath("markers.db"), [
    {
      name: "scene-index",
      key: "scene",
    },
  ]);

  studioCollection = await Izzy.createCollection("studios", libraryPath("studios.db"), [
    {
      key: "parent",
      name: "parent-index",
    },
  ]);

  processingCollection = await Izzy.createCollection(
    "processing",
    libraryPath("processing.db"),
    []
  );

  logger.debug("Created Izzy collections");

  if (!args["skip-compaction"]) {
    const compactLoader = ora("Compacting DB...").start();
    await sceneCollection.compact();
    await imageCollection.compact();
    await labelledItemCollection.compact();
    await movieSceneCollection.compact();
    await actorReferenceCollection.compact();
    await actorCollection.compact();
    await movieCollection.compact();
    await viewCollection.compact();
    await labelCollection.compact();
    await customFieldCollection.compact();
    await markerCollection.compact();
    await studioCollection.compact();
    await processingCollection.compact();
    compactLoader.succeed("Compacted DB");
  } else {
    logger.debug("Skipping compaction");
  }

  dbLoader.succeed();
}
