import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import Movie from "../../types/movie";
import extractQueryOptions, { SortTarget } from "../../query_extractor";
import Fuse from "fuse.js";
import * as logger from "../../logger/index";
import { Dictionary, filterAsync, mapAsync } from "../../types/utility";
import ProcessingQueue from "../../queue/index";
import Studio from "../../types/studio";
import { getConfig } from "../../config";
import * as database from "../../database/index";

const PAGE_SIZE = 24;
const FALLBACK_FUZZINESS = 0.25;

export default {
  async getScenesWithoutLabels(_, { num }: { num: number }) {
    return (
      await mapAsync(await Scene.getAll(), async scene => ({
        scene,
        numLabels: (await Scene.getLabels(scene)).length
      }))
    )
      .filter(i => i.numLabels == 0)
      .map(i => i.scene)
      .slice(0, num || 12);
  },

  async getActorsWithoutLabels(_, { num }: { num: number }) {
    return (
      await mapAsync(await Actor.getAll(), async actor => ({
        actor,
        numLabels: (await Actor.getLabels(actor)).length
      }))
    )
      .filter(i => i.numLabels == 0)
      .map(i => i.actor)
      .slice(0, num || 12);
  },

  async getScenesWithoutActors(_, { num }: { num: number }) {
    return (
      await mapAsync(await Scene.getAll(), async scene => ({
        scene,
        numActors: (await Scene.getActors(scene)).length
      }))
    )
      .filter(i => i.numActors == 0)
      .map(i => i.scene)
      .slice(0, num || 12);
  },

  async getActorsWithoutScenes(_, { num }: { num: number }) {
    return (
      await mapAsync(await Actor.getAll(), async actor => ({
        actor,
        numScenes: (await Scene.getByActor(actor._id)).length
      }))
    )
      .filter(i => i.numScenes == 0)
      .map(i => i.actor)
      .slice(0, num || 12);
  },

  async topActors(_, { num }: { num: number }) {
    return (await Actor.getTopActors()).slice(0, num || 12);
  },

  async getQueueInfo() {
    return {
      length: await ProcessingQueue.getLength()
    };
  },

  async getStudios(_, { query }: { query: string | undefined }) {
    const timeNow = +new Date();
    logger.log("Searching...");

    const options = extractQueryOptions(query);

    const allStudios = await Studio.getAll();

    let searchDocs = await Promise.all(
      allStudios.map(async studio => ({
        _id: studio._id,
        name: studio.name,
        favorite: studio.favorite,
        bookmark: studio.bookmark,
        //rating: await Mrating, // TODO:
        actors: await Studio.getActors(studio),
        labels: await Studio.getLabels(studio),
        addedOn: studio.addedOn
      }))
    );

    if (options.favorite === true)
      searchDocs = searchDocs.filter(movie => movie.favorite);

    if (options.bookmark === true)
      searchDocs = searchDocs.filter(movie => movie.bookmark);

    /* if (options.rating > 0)
    searchDocs = searchDocs.filter(movie => movie.rating >= options.rating); */

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

    const config = await getConfig();

    if (options.query) {
      if (config.USE_FUZZY_SEARCH) {
        logger.log("Using fuzzy search...");
        const searcher = new Fuse(searchDocs, {
          shouldSort: options.sortBy == SortTarget.RELEVANCE,
          tokenize: true,
          threshold: config.FUZZINESS || FALLBACK_FUZZINESS,
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
      } else {
        logger.log("Using simple search...");
        const tokens = options.query.toLowerCase().split(" ");
        searchDocs = searchDocs
          .map(doc => {
            let score = 0;
            for (const token of tokens) {
              if (doc.name.toLowerCase().includes(token)) score++;
              for (const actor of doc.actors) {
                if (actor.name.toLowerCase().includes(token)) score++;
                for (const alias of actor.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
              for (const label of doc.labels) {
                if (label.name.toLowerCase().includes(token)) score++;
                for (const alias of label.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
            }
            return {
              doc,
              score
            };
          })
          .filter(doc => doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(doc => doc.doc);
      }
    }

    switch (options.sortBy) {
      case SortTarget.ADDED_ON:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.addedOn - b.addedOn);
        else searchDocs.sort((a, b) => b.addedOn - a.addedOn);
        break;
      case SortTarget.ALPHABETIC:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.name.localeCompare(b.name));
        else searchDocs.sort((a, b) => b.name.localeCompare(a.name));
        break;
      /*  case SortTarget.RATING:
      if (options.sortDir == "asc")
        searchDocs.sort((a, b) => a.rating - b.rating);
      else searchDocs.sort((a, b) => b.rating - a.rating);
      break; */
    }

    const slice = await Promise.all(
      searchDocs
        .slice(options.page * PAGE_SIZE, options.page * PAGE_SIZE + PAGE_SIZE)
        .map(studio => Studio.getById(studio._id))
    );

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return slice;
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
        actors: await Movie.getActors(movie),
        labels: await Movie.getLabels(movie),
        addedOn: movie.addedOn,
        releaseDate: movie.releaseDate,
        duration: (await Movie.calculateDuration(movie)) || 0,
        studio: movie.studio,
        rating: await Movie.getRating(movie)
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

    if (options.studios.length) {
      searchDocs = searchDocs.filter(movie =>
        options.studios.includes(movie.studio || "none")
      );
    }

    const config = await getConfig();

    if (options.query) {
      if (config.USE_FUZZY_SEARCH) {
        logger.log("Using fuzzy search...");
        const searcher = new Fuse(searchDocs, {
          shouldSort: options.sortBy == SortTarget.RELEVANCE,
          tokenize: true,
          threshold: config.FUZZINESS || FALLBACK_FUZZINESS,
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
      } else {
        logger.log("Using simple search...");
        const tokens = options.query.toLowerCase().split(" ");
        searchDocs = searchDocs
          .map(doc => {
            let score = 0;
            for (const token of tokens) {
              if (doc.name.toLowerCase().includes(token)) score++;
              for (const actor of doc.actors) {
                if (actor.name.toLowerCase().includes(token)) score++;
                for (const alias of actor.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
              for (const label of doc.labels) {
                if (label.name.toLowerCase().includes(token)) score++;
                for (const alias of label.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
            }
            return {
              doc,
              score
            };
          })
          .filter(doc => doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(doc => doc.doc);
      }
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
      case SortTarget.DURATION:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.duration - b.duration);
        else searchDocs.sort((a, b) => b.duration - a.duration);
        break;
      case SortTarget.ALPHABETIC:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.name.localeCompare(b.name));
        else searchDocs.sort((a, b) => b.name.localeCompare(a.name));
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
        watches: await Actor.getWatches(actor),
        aliases: actor.aliases
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

    const config = await getConfig();

    if (options.query) {
      if (config.USE_FUZZY_SEARCH) {
        logger.log("Using fuzzy search...");
        const searcher = new Fuse(searchDocs, {
          shouldSort: options.sortBy == SortTarget.RELEVANCE,
          tokenize: true,
          threshold: config.FUZZINESS || FALLBACK_FUZZINESS,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1,
          keys: ["name", "aliases", "labels.name", "labels.aliases"]
        });

        searchDocs = searcher.search(options.query);
      } else {
        logger.log("Using simple search...");
        const tokens = options.query.toLowerCase().split(" ");
        searchDocs = searchDocs
          .map(doc => {
            let score = 0;
            for (const token of tokens) {
              if (doc.name.toLowerCase().includes(token)) score++;
              for (const alias of doc.aliases) {
                if (alias.toLowerCase().includes(token)) score++;
              }

              for (const label of doc.labels) {
                if (label.name.toLowerCase().includes(token)) score++;
                for (const alias of label.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
            }
            return {
              doc,
              score
            };
          })
          .filter(doc => doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(doc => doc.doc);
      }
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
      case SortTarget.ALPHABETIC:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.name.localeCompare(b.name));
        else searchDocs.sort((a, b) => b.name.localeCompare(a.name));
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

    let allScenes = [] as Scene[];

    if (options.studios.length) {
      for (const studioId of options.studios) {
        allScenes.push(...(await Scene.getByStudio(studioId)));
      }
    } else if (options.actors.length) {
      if (options.actors.length) {
        for (const actorId of options.actors) {
          allScenes.push(...(await Scene.getByActor(actorId)));
        }
      } else {
        allScenes = await Scene.getAll();
      }
    } else {
      allScenes = await Scene.getAll();
    }

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
        watches: scene.watches,
        duration: scene.meta.duration || 0,
        studio: scene.studio,
        movies: await Movie.getByScene(scene._id),
        studioObj: scene.studio ? await Studio.getById(scene.studio) : null
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

    if (options.studios.length) {
      searchDocs = await filterAsync(searchDocs, async scene => {
        if (!scene.studio) return false;
        if (options.studios.includes(scene.studio)) return true;

        const studio = await Studio.getById(scene.studio);

        if (!studio) return false;

        if (!studio.parent) return false;

        const parentStudio = await Studio.getById(studio.parent);

        if (!parentStudio) return false;

        return options.studios.includes(parentStudio._id);
      });
    }

    const config = await getConfig();

    if (options.query) {
      if (config.USE_FUZZY_SEARCH) {
        logger.log("Using fuzzy search...");
        const searcher = new Fuse(searchDocs, {
          shouldSort: options.sortBy == SortTarget.RELEVANCE,
          tokenize: true,
          threshold: config.FUZZINESS || FALLBACK_FUZZINESS,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1,
          keys: [
            "name",
            "labels.name",
            "labels.aliases",
            "actors.name",
            "actors.aliases",
            "movies.name",
            "studioObj.name"
            // "studioObj.aliases"
          ]
        });

        searchDocs = searcher.search(options.query);
      } else {
        logger.log("Using simple search...");
        const tokens = options.query.toLowerCase().split(" ");
        searchDocs = searchDocs
          .map(doc => {
            let score = 0;
            for (const token of tokens) {
              if (doc.name.toLowerCase().includes(token)) score++;
              for (const actor of doc.actors) {
                if (actor.name.toLowerCase().includes(token)) score++;
                for (const alias of actor.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
              for (const label of doc.labels) {
                if (label.name.toLowerCase().includes(token)) score++;
                for (const alias of label.aliases) {
                  if (alias.toLowerCase().includes(token)) score++;
                }
              }
              for (const movie of doc.movies) {
                if (movie.name.toLowerCase().includes(token)) score++;
              }
            }
            return {
              doc,
              score
            };
          })
          .filter(doc => doc.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(doc => doc.doc);
      }
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
      case SortTarget.DURATION:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.duration - b.duration);
        else searchDocs.sort((a, b) => b.duration - a.duration);
        break;
      case SortTarget.ALPHABETIC:
        if (options.sortDir == "asc")
          searchDocs.sort((a, b) => a.name.localeCompare(b.name));
        else searchDocs.sort((a, b) => b.name.localeCompare(a.name));
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
        .map(image => Scene.getById(image._id))
    );

    logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

    return slice;
  },

  async getImages(
    _,
    { query, auto }: { query: string | undefined; auto?: boolean | null }
  ) {
    try {
      const timeNow = +new Date();
      logger.log("Searching...");

      const options = extractQueryOptions(query);

      let allImages = [] as Image[];

      if (options.scenes.length) {
        for (const sceneId of options.scenes) {
          allImages.push(...(await Image.getByScene(sceneId)));
        }
      } else if (options.actors.length) {
        if (options.actors.length) {
          for (const actorId of options.actors) {
            allImages.push(...(await Image.getByActor(actorId)));
          }
        } else {
          allImages = await Image.getAll();
        }
      } else {
        allImages = await Image.getAll();
      }

      // Filter thumbnails, screenshots, previews
      if (!auto)
        allImages = allImages.filter(i =>
          ["(thumbnail)", "(preview)", "(screenshot)"].every(
            ending => !i.name.endsWith(ending)
          )
        );

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
          scene: image.scene,
          studio: image.studio
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
          options.exclude.every(
            id => !image.labels.map(l => l._id).includes(id)
          )
        );
      }

      if (options.scenes.length) {
        searchDocs = searchDocs.filter(image =>
          options.scenes.includes(image.scene || "none")
        );
      }

      if (options.studios.length) {
        searchDocs = searchDocs.filter(image =>
          options.studios.includes(image.studio || "none")
        );
      }

      const config = await getConfig();

      if (options.query) {
        if (config.USE_FUZZY_SEARCH) {
          logger.log("Using fuzzy search...");
          const searcher = new Fuse(searchDocs, {
            shouldSort: options.sortBy == SortTarget.RELEVANCE,
            tokenize: true,
            threshold: config.FUZZINESS || FALLBACK_FUZZINESS,
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
        } else {
          logger.log("Using simple search...");
          const tokens = options.query.toLowerCase().split(" ");
          searchDocs = searchDocs
            .map(doc => {
              let score = 0;
              for (const token of tokens) {
                if (doc.name.toLowerCase().includes(token)) score++;
                for (const actor of doc.actors) {
                  if (actor.name.toLowerCase().includes(token)) score++;
                  for (const alias of actor.aliases) {
                    if (alias.toLowerCase().includes(token)) score++;
                  }
                }
                for (const label of doc.labels) {
                  if (label.name.toLowerCase().includes(token)) score++;
                  for (const alias of label.aliases) {
                    if (alias.toLowerCase().includes(token)) score++;
                  }
                }
              }
              return {
                doc,
                score
              };
            })
            .filter(doc => doc.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(doc => doc.doc);
        }
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
        case SortTarget.ALPHABETIC:
          if (options.sortDir == "asc")
            searchDocs.sort((a, b) => a.name.localeCompare(b.name));
          else searchDocs.sort((a, b) => b.name.localeCompare(a.name));
          break;
      }

      const slice = await Promise.all(
        searchDocs
          .slice(options.page * PAGE_SIZE, options.page * PAGE_SIZE + PAGE_SIZE)
          .map(image => Image.getById(image._id))
      );

      logger.log(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

      return slice;
    } catch (error) {
      logger.error(error);
    }
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

  async getStudioById(_, args: Dictionary<any>) {
    return await Studio.getById(args.id);
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
  },
  async numScenes() {
    return await database.count(database.store.scenes, {});
  },
  async numActors() {
    return await database.count(database.store.actors, {});
  },
  async numMovies() {
    return await database.count(database.store.movies, {});
  },
  async numLabels() {
    return await database.count(database.store.labels, {});
  },
  async numStudios() {
    return await database.count(database.store.studios, {});
  },
  async numImages() {
    return await database.count(database.store.images, {});
  }
};
