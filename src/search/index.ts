import { actorIndex } from "./actor";
import { studioIndex } from "./studio";
import { movieIndex } from "./movie";

import { buildImageIndex } from "./image";
import { buildSceneIndex } from "./scene";
import { buildActorIndex } from "./actor";
import { buildStudioIndex } from "./studio";
import { buildMovieIndex } from "./movie";
import Axios from "axios";

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
  await buildSceneIndex();
  await buildActorIndex();
  await buildMovieIndex();
  await buildStudioIndex();
  await buildImageIndex();
}

export async function twigsVersion() {
  try {
    const res = await Axios.get(`http://localhost:8000/`);
    return res.data.version as string;
  } catch (error) {
    return null;
  }
}
