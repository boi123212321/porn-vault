import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import Movie from "../../types/movie";
import extractQueryOptions, { SortTarget } from "../../query_extractor";
import Fuse from "fuse.js";
import * as logger from "../../logger/index";
import { Dictionary } from "../../types/utility";
import ProcessingQueue from "../../queue/index";

const PAGE_SIZE = 20;

export default {
  async getQueueInfo() {
    return {
      length: await ProcessingQueue.getLength()
    };
  },

  async getMovies(_, { query }: { query: string | undefined }) {
    const timeNow = +new Date();
    logger.log("Searching...");

    const options = extractQueryOptions(query);

    const allMovies = await Movie.getAll();

    let searchDocs = await Promise.all(
      allMovies.map(async movie => ({
        _id: movie._id,
        name: movie.name,
        favorite: movie.favorite,
        bookmark: movie.bookmark,
        rating: movie.rating,
        actors: await Movie.getActors(movie),
        labels: await Movie.getLabels(movie),
        addedOn: movie.addedOn,
        releaseDate: movie.releaseDate
      }))
    );

    if (options.favorite === true)
      searchDocs = searchDocs.filter(movie => movie.favorite);

    if (options.bookmark === true)
      searchDocs = searchDocs.filter(movie => movie.bookmark);

    if (options.rating > 0)
      searchDocs = searchDocs.filter(movie => movie.rating >= options.rating);

    if (options.include.length) {
      searchDocs = searchDocs.filter(movie =>
        options.include.every(id => movie.labels.map(l => l._id).includes(id))
      );
    }

    if (options.exclude.length) {
      searchDocs = searchDocs.filter(movie =>
        options.exclude.every(id => !movie.labels.map(l => l._id).includes(id))
      );
    }

    if (options.query) {
      const searcher = new Fuse(searchDocs, {
        shouldSort: options.sortBy == SortTarget.RELEVANCE,
        tokenize: true,
        threshold: 0,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          "name",
          "labels.name",
          "labels.aliases",
          "actors.name",
          "actors.aliases"
        ]
      });

      searchDocs = searcher.search(options.query);
    }

    switch (options.sortBy) {
      case SortTarget.ADDED_ON:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.addedOn - b.addedOn);
        else searchDocs.sort((a, b) => b.addedOn - a.addedOn);
        break;
      case SortTarget.RATING:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.rating - b.rating);
        else searchDocs.sort((a, b) => b.rating - a.rating);
        break;
      case SortTarget.DATE:
        if (options.sortDir == "asc")
          searchDocs.sort(
            (a, b) => (a.releaseDate || 0) - (b.releaseDate || 0)
          );
        else
          searchDocs.sort(
            (a, b) => (b.releaseDate || 0) - (a.releaseDate || 0)
          );
        break;
    }

    const slice = await Promise.all(
      searchDocs
        .slice(options.page * PAGE_SIZE, options.page * PAGE_SIZE + PAGE_SIZE)
        .map(movie => Movie.getById(movie._id))
    );

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return slice;
  },

  async getActors(_, { query }: { query: string | undefined }) {
    const timeNow = +new Date();
    logger.log("Searching...");

    const options = extractQueryOptions(query);

    const allActors = await Actor.getAll();

    let searchDocs = await Promise.all(
      allActors.map(async actor => ({
        _id: actor._id,
        name: actor.name,
        bornOn: actor.bornOn,
        favorite: actor.favorite,
        bookmark: actor.bookmark,
        rating: actor.rating,
        labels: await Actor.getLabels(actor),
        addedOn: actor.addedOn,
        watches: await Actor.getWatches(actor)
      }))
    );

    if (options.favorite === true)
      searchDocs = searchDocs.filter(actor => actor.favorite);

    if (options.bookmark === true)
      searchDocs = searchDocs.filter(actor => actor.bookmark);

    if (options.rating > 0)
      searchDocs = searchDocs.filter(actor => actor.rating >= options.rating);

    if (options.include.length) {
      searchDocs = searchDocs.filter(actor =>
        options.include.every(id => actor.labels.map(l => l._id).includes(id))
      );
    }

    if (options.exclude.length) {
      searchDocs = searchDocs.filter(actor =>
        options.exclude.every(id => !actor.labels.map(l => l._id).includes(id))
      );
    }

    if (options.query) {
      const searcher = new Fuse(searchDocs, {
        shouldSort: options.sortBy == SortTarget.RELEVANCE,
        tokenize: true,
        threshold: 0,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ["name", "labels.name", "labels.aliases"]
      });

      searchDocs = searcher.search(options.query);
    }

    switch (options.sortBy) {
      case SortTarget.ADDED_ON:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.addedOn - b.addedOn);
        else searchDocs.sort((a, b) => b.addedOn - a.addedOn);
        break;
      case SortTarget.RATING:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.rating - b.rating);
        else searchDocs.sort((a, b) => b.rating - a.rating);
        break;
      case SortTarget.VIEWS:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.watches.length - b.watches.length);
        else searchDocs.sort((a, b) => b.watches.length - a.watches.length);
        break;
      case SortTarget.DATE:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => (a.bornOn || 0) - (b.bornOn || 0));
        else searchDocs.sort((a, b) => (b.bornOn || 0) - (a.bornOn || 0));
        break;
    }

    const slice = await Promise.all(
      searchDocs
        .slice(options.page * PAGE_SIZE, options.page * PAGE_SIZE + PAGE_SIZE)
        .map(actor => Actor.getById(actor._id))
    );

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return slice;
  },

  async getScenes(_, { query }: { query: string | undefined }) {
    const timeNow = +new Date();
    logger.log("Searching...");

    const options = extractQueryOptions(query);

    const allScenes = await Scene.getAll();

    let searchDocs = await Promise.all(
      allScenes.map(async scene => ({
        _id: scene._id,
        name: scene.name,
        releaseDate: scene.releaseDate,
        favorite: scene.favorite,
        bookmark: scene.bookmark,
        rating: scene.rating,
        labels: await Scene.getLabels(scene),
        actors: await Scene.getActors(scene),
        addedOn: scene.addedOn,
        watches: scene.watches
      }))
    );

    if (options.favorite === true)
      searchDocs = searchDocs.filter(scene => scene.favorite);

    if (options.bookmark === true)
      searchDocs = searchDocs.filter(scene => scene.bookmark);

    if (options.rating > 0)
      searchDocs = searchDocs.filter(scene => scene.rating >= options.rating);

    if (options.include.length) {
      searchDocs = searchDocs.filter(scene =>
        options.include.every(id => scene.labels.map(l => l._id).includes(id))
      );
    }

    if (options.exclude.length) {
      searchDocs = searchDocs.filter(scene =>
        options.exclude.every(id => !scene.labels.map(l => l._id).includes(id))
      );
    }

    if (options.actors.length) {
      searchDocs = searchDocs.filter(scene =>
        options.actors.every(id => scene.actors.map(a => a._id).includes(id))
      );
    }

    if (options.query) {
      const searcher = new Fuse(searchDocs, {
        shouldSort: options.sortBy == SortTarget.RELEVANCE,
        tokenize: true,
        threshold: 0,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          "name",
          "labels.name",
          "labels.aliases",
          "actors.name",
          "actors.aliases"
        ]
      });

      searchDocs = searcher.search(options.query);
    }

    switch (options.sortBy) {
      case SortTarget.ADDED_ON:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.addedOn - b.addedOn);
        else searchDocs.sort((a, b) => b.addedOn - a.addedOn);
        break;
      case SortTarget.RATING:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.rating - b.rating);
        else searchDocs.sort((a, b) => b.rating - a.rating);
        break;
      case SortTarget.VIEWS:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.watches.length - b.watches.length);
        else searchDocs.sort((a, b) => b.watches.length - a.watches.length);
        break;
      case SortTarget.DATE:
        if (options.sortDir == "asc")
          searchDocs.sort(
            (a, b) => (a.releaseDate || 0) - (b.releaseDate || 0)
          );
        else
          searchDocs.sort(
            (a, b) => (b.releaseDate || 0) - (a.releaseDate || 0)
          );
        break;
    }

    const slice = Promise.all(
      searchDocs
        .slice(options.page * PAGE_SIZE, options.page * PAGE_SIZE + PAGE_SIZE)
        .map(image => Scene.getById(image._id))
    );

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return slice;
  },

  async getImages(_, { query }: { query: string | undefined }) {
    const timeNow = +new Date();
    logger.log("Searching...");

    const options = extractQueryOptions(query);

    const allImages = await Image.getAll();

    let searchDocs = await Promise.all(
      allImages.map(async image => ({
        _id: image._id,
        name: image.name,
        favorite: image.favorite,
        bookmark: image.bookmark,
        rating: image.rating,
        labels: await Image.getLabels(image),
        actors: await Image.getActors(image),
        addedOn: image.addedOn,
        scene: image.scene
      }))
    );

    if (options.favorite === true)
      searchDocs = searchDocs.filter(image => image.favorite);

    if (options.bookmark === true)
      searchDocs = searchDocs.filter(image => image.bookmark);

    if (options.rating > 0)
      searchDocs = searchDocs.filter(image => image.rating >= options.rating);

    if (options.include.length) {
      searchDocs = searchDocs.filter(image =>
        options.include.every(id => image.labels.map(l => l._id).includes(id))
      );
    }

    if (options.exclude.length) {
      searchDocs = searchDocs.filter(image =>
        options.exclude.every(id => !image.labels.map(l => l._id).includes(id))
      );
    }

    if (options.actors.length) {
      searchDocs = searchDocs.filter(image =>
        options.actors.every(id => image.actors.map(a => a._id).includes(id))
      );
    }

    if (options.scene.length) {
      searchDocs = searchDocs.filter(image =>
        options.scene.includes(image.scene || "none")
      );
    }

    if (options.query) {
      const searcher = new Fuse(searchDocs, {
        shouldSort: options.sortBy == SortTarget.RELEVANCE,
        tokenize: true,
        threshold: 0,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          "name",
          "labels.name",
          "labels.aliases",
          "actors.name",
          "actors.aliases"
        ]
      });

      searchDocs = searcher.search(options.query);
    }

    switch (options.sortBy) {
      case SortTarget.ADDED_ON:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.addedOn - b.addedOn);
        else searchDocs.sort((a, b) => b.addedOn - a.addedOn);
        break;
      case SortTarget.RATING:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.rating - b.rating);
        else searchDocs.sort((a, b) => b.rating - a.rating);
        break;
    }

    const slice = await Promise.all(
      searchDocs
        .slice(options.page * PAGE_SIZE, options.page * PAGE_SIZE + PAGE_SIZE)
        .map(image => Image.getById(image._id))
    );

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return slice;
  },

  async getSceneById(_, args: Dictionary<any>) {
    return await Scene.getById(args.id);
  },

  async getActorById(_, args: Dictionary<any>) {
    return await Actor.getById(args.id);
  },
  async findActors(_, args: Dictionary<any>) {
    return await Actor.find(args.name);
  },

  async getMovieById(_, args: Dictionary<any>) {
    return await Movie.getById(args.id);
  },

  async getLabelById(_, args: Dictionary<any>) {
    return await Label.getById(args.id);
  },
  async getLabels() {
    const labels = await Label.getAll();
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  },
  async findLabel(_, args: Dictionary<any>) {
    return await Label.find(args.name);
  }
};
