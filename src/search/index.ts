import { actorIndex } from "./actor";
import { studioIndex } from "./studio";
import { movieIndex } from "./movie";

import { buildImageIndex } from "./image";
import { buildSceneIndex } from "./scene";
import { buildActorIndex } from "./actor";
import { buildStudioIndex } from "./studio";
import { buildMovieIndex } from "./movie";

export interface ISearchResults {
  num_hits: number;
  items: string[];
  time: {
    sec: number;
    milli: number;
    micro: number;
  };
}

export const indices = {
  actors: actorIndex,
  studios: studioIndex,
  movies: movieIndex
};

export async function buildIndices() {
  await buildImageIndex();
  await buildActorIndex();
  await buildSceneIndex();
  await buildStudioIndex();
  await buildMovieIndex();
}
