import DataStore, { EnsureIndexOptions } from "nedb";
import mkdirp from "mkdirp";
import { libraryPath } from "../types/utility";
import * as logger from "../logger/index";
import Scene from "../types/scene";
import Actor from "../types/actor";
import Label from "../types/label";
import Image from "../types/image";
import ora from "ora";
import Movie from "../types/movie";
import Studio from "../types/studio";
import CrossReference from "../types/cross_references";

mkdirp.sync("backups/");
mkdirp.sync("tmp/");

let store = {} as {
  crossReferences: DataStore;
  scenes: DataStore;
  actors: DataStore;
  images: DataStore;
  labels: DataStore;
  movies: DataStore;
  studios: DataStore;
  queue: DataStore;
  markers: DataStore;
  customFields: DataStore;
};

function buildIndex(store: DataStore, opts: EnsureIndexOptions) {
  return new Promise((resolve, reject) => {
    store.ensureIndex(opts, err => {
      if (err) reject(err);
      else {
        logger.log("Built index " + JSON.stringify(opts));
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
      onload: err => {
        if (err) reject(err);
        else {
          logger.log("Loaded store " + path);
          resolve(store);
        }
      }
    });
  });
}

export async function loadStores() {
  try {
    mkdirp.sync(await libraryPath("scenes/"));
    mkdirp.sync(await libraryPath("images/"));
    mkdirp.sync(await libraryPath("thumbnails/"));
    mkdirp.sync(await libraryPath("previews/"));
  } catch (err) {}

  store = {
    crossReferences: await loadStore(await libraryPath("cross_references.db")),
    scenes: await loadStore(await libraryPath("scenes.db")),
    actors: await loadStore(await libraryPath("actors.db")),
    images: await loadStore(await libraryPath("images.db")),
    labels: await loadStore(await libraryPath("labels.db")),
    movies: await loadStore(await libraryPath("movies.db")),
    studios: await loadStore(await libraryPath("studios.db")),
    queue: await loadStore(await libraryPath("queue.db")),
    markers: await loadStore(await libraryPath("markers.db")),
    customFields: await loadStore(await libraryPath("custom_fields.db"))
  };

  await buildIndex(store.crossReferences, {
    fieldName: "from"
  });
  await buildIndex(store.crossReferences, {
    fieldName: "to"
  });
  await buildIndex(store.scenes, {
    fieldName: "studio"
  });
  await buildIndex(store.movies, {
    fieldName: "studio"
  });
  await buildIndex(store.images, {
    fieldName: "scene"
  });
  await buildIndex(store.images, {
    fieldName: "studio"
  });
  await buildIndex(store.studios, {
    fieldName: "parent"
  });
  await buildIndex(store.markers, {
    fieldName: "scene"
  });

  const loader = ora(
    "Checking database integrity. This might take a minute..."
  ).start();
  await Scene.checkIntegrity();
  await Actor.checkIntegrity();
  await Label.checkIntegrity();
  await Image.checkIntegrity();
  await Studio.checkIntegrity();
  await Movie.checkIntegrity();
  await CrossReference.checkIntegrity();
  loader.succeed("Integrity check done.");
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
    store.update(query, update, { multi: true }, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function remove(store: DataStore, query: any) {
  return new Promise((resolve, reject) => {
    store.remove(query, err => {
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
