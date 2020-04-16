import DataStore, { EnsureIndexOptions } from "nedb";
import mkdirp from "mkdirp";
import { libraryPath } from "../types/utility";
import * as logger from "../logger";
import Scene from "../types/scene";
import Actor from "../types/actor";
import Label from "../types/label";
import Image from "../types/image";
import ora from "ora";
import Movie from "../types/movie";
import Studio from "../types/studio";
import Marker from "../types/marker";
import { bookmarksToTimestamp } from "../integrity";
import { Izzy } from "./internal/index";
import args from "../args";
import LabelledItem from "../types/labelled_item";
import MovieScene from "../types/movie_scene";
import ActorReference from "../types/actor_reference";
import MarkerReference from "../types/marker_reference";
import { existsAsync, unlinkAsync } from "../fs/async";
import { convertCrossReferences } from "../compat";

mkdirp.sync("backups/");
mkdirp.sync("tmp/");

export let sceneCollection!: Izzy.Collection<Scene>;
export let imageCollection!: Izzy.Collection<Image>;
export let actorCollection!: Izzy.Collection<Actor>;
export let movieCollection!: Izzy.Collection<Movie>;
export let labelledItemCollection!: Izzy.Collection<LabelledItem>;
export let movieSceneCollection!: Izzy.Collection<MovieScene>;
export let actorReferenceCollection!: Izzy.Collection<ActorReference>;
export let markerReferenceCollection!: Izzy.Collection<MarkerReference>;

let store = {} as {
  labels: DataStore;
  studios: DataStore;
  processing: DataStore;
  markers: DataStore;
  customFields: DataStore;
};

function buildIndex(store: DataStore, opts: EnsureIndexOptions) {
  return new Promise((resolve, reject) => {
    store.ensureIndex(opts, (err) => {
      if (err) reject(err);
      else {
        logger.log("Built DB index " + JSON.stringify(opts));
        resolve(store);
      }
    });
  });
}

function loadStore(path: string): Promise<DataStore> {
  return new Promise((resolve, reject) => {
    const store = new DataStore({
      autoload: true,
      filename: path,
      onload: (err) => {
        if (err) reject(err);
        else {
          logger.log("Loaded store " + path);
          resolve(store);
        }
      },
    });
  });
}

export async function loadStores() {
  const crossReferencePath = libraryPath("cross_references.db");
  if (await existsAsync(crossReferencePath)) {
    logger.message("Making DB compatible...");
    await convertCrossReferences();
    await unlinkAsync(crossReferencePath);
  }

  try {
    mkdirp.sync(libraryPath("images/"));
    mkdirp.sync(libraryPath("thumbnails/")); // generated screenshots
    mkdirp.sync(libraryPath("previews/"));
  } catch (err) {}

  if (!args["ignore-integrity"]) {
    const compatLoader = ora("Making .db files compatible (if needed)").start();

    await bookmarksToTimestamp(libraryPath("scenes.db"));
    await bookmarksToTimestamp(libraryPath("actors.db"));
    await bookmarksToTimestamp(libraryPath("images.db"));
    await bookmarksToTimestamp(libraryPath("movies.db"));
    await bookmarksToTimestamp(libraryPath("studios.db"));
    await bookmarksToTimestamp(libraryPath("markers.db"));

    compatLoader.succeed();
  } else {
    logger.message("Skipping bookmark integrity");
  }

  const dbLoader = ora("Loading DB...").start();

  markerReferenceCollection = await Izzy.createCollection(
    "marker-references",
    libraryPath("marker_references.db"),
    [
      {
        name: "marker-index",
        key: "marker",
      },
      {
        name: "scene-index",
        key: "scene",
      },
    ]
  );
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
  imageCollection = await Izzy.createCollection(
    "images",
    libraryPath("images.db"),
    [
      {
        name: "scene-index",
        key: "scene",
      },
      {
        name: "studio-index",
        key: "studio",
      },
      {
        name: "path-index",
        key: "path",
      },
    ]
  );
  sceneCollection = await Izzy.createCollection(
    "scenes",
    libraryPath("scenes.db"),
    [
      {
        name: "studio-index",
        key: "studio",
      },
      {
        name: "path-index",
        key: "path",
      },
      {
        name: "preview-index",
        key: "preview",
      },
    ]
  );
  actorCollection = await Izzy.createCollection(
    "actors",
    libraryPath("actors.db")
  );
  movieCollection = await Izzy.createCollection(
    "movies",
    libraryPath("movies.db"),
    [
      {
        name: "studio-index",
        key: "studio",
      },
    ]
  );

  logger.log("Created Izzy collections");

  if (!args["skip-compaction"]) {
    const compactLoader = ora("Compacting DB...").start();
    await sceneCollection.compact();
    await imageCollection.compact();
    await labelledItemCollection.compact();
    await movieSceneCollection.compact();
    await actorReferenceCollection.compact();
    await markerReferenceCollection.compact();
    await actorCollection.compact();
    await movieCollection.compact();
    compactLoader.succeed("Compacted DB");
  } else {
    logger.message("Skipping compaction");
  }

  logger.log("Loading remaining NeDB stores");

  store = {
    labels: await loadStore(libraryPath("labels.db")),
    studios: await loadStore(libraryPath("studios.db")),
    processing: await loadStore(libraryPath("processing.db")),
    markers: await loadStore(libraryPath("markers.db")),
    customFields: await loadStore(libraryPath("custom_fields.db")),
  };

  dbLoader.succeed();

  const indexLoader = ora("Building DB indices...").start();

  await buildIndex(store.studios, {
    fieldName: "parent",
  });
  await buildIndex(store.markers, {
    fieldName: "scene",
  });

  indexLoader.succeed();

  if (!args["ignore-integrity"]) {
    const integrityLoader = ora(
      "Checking database integrity. This might take a minute..."
    ).start();

    await Scene.checkIntegrity();
    await Actor.checkIntegrity();
    await Label.checkIntegrity();
    await Image.checkIntegrity();
    await Studio.checkIntegrity();
    await Movie.checkIntegrity();
    await Marker.checkIntegrity();
    integrityLoader.succeed("Integrity check done.");
  } else {
    logger.message("Skipping integrity checks");
  }
}

export function count(store: DataStore, query: any): Promise<number> {
  return new Promise((resolve, reject) => {
    store.count(query, (err, num) => {
      if (err) return reject(err);
      resolve(num);
    });
  });
}

export function insert<T>(store: DataStore, doc: T | T[]) {
  return new Promise((resolve, reject) => {
    store.insert(doc, (err, doc) => {
      if (err) return reject(err);
      resolve(doc);
    });
  });
}

export function getOne(store: DataStore, skip = 0) {
  return new Promise((resolve, reject) => {
    store
      .find({})
      .skip(skip)
      .limit(1)
      .exec(function (err, docs) {
        if (err) return reject(err);
        resolve(docs[0]);
      });
  });
}

export function getAllIterative<T>(
  store: DataStore,
  cb: (doc: T) => Promise<void>
) {
  return new Promise(async (resolve, reject) => {
    try {
      let skip = 0;
      let doc = await getOne(store, skip++);
      while (doc) {
        await cb(<T>doc);
        doc = await getOne(store, skip++);
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getAll(store: DataStore) {
  return new Promise((resolve, reject) => {
    store.find({}, (err, docs) => {
      if (err) return reject(err);
      resolve(docs);
    });
  });
}

export function update(store: DataStore, query: any, update: any) {
  return new Promise((resolve, reject) => {
    store.update(query, update, { multi: true }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function remove(store: DataStore, query: any) {
  return new Promise((resolve, reject) => {
    store.remove(query, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function find(store: DataStore, query: any) {
  return new Promise((resolve, reject) => {
    store.find(query, (err, doc) => {
      if (err) return reject(err);
      resolve(doc);
    });
  });
}

export function findOne(store: DataStore, query: any) {
  return new Promise((resolve, reject) => {
    store.findOne(query, (err, doc) => {
      if (err) return reject(err);
      resolve(doc);
    });
  });
}

export { store };
