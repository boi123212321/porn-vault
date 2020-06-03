import { buildActorIndex } from "./actor";
import { buildImageIndex } from "./image";
import { buildMovieIndex } from "./movie";
import { buildSceneIndex } from "./scene";
import { buildStudioIndex } from "./studio";

export async function buildIndices(): Promise<void> {
  await buildSceneIndex();
  await buildActorIndex();
  await buildMovieIndex();
  await buildStudioIndex();
  await buildImageIndex();
}
