import { movieCollection } from "../../../database";
import { IMovieSearchQuery, searchMovies } from "../../../search/movie";
import Movie from "../../../types/movie";
import { logger } from "../../../utils/logger";

export async function getMovies(
  _: unknown,
  { query, seed }: { query: Partial<IMovieSearchQuery>; seed?: string }
): Promise<
  | {
      numItems: number;
      numPages: number;
      items: Movie[];
    }
  | undefined
> {
  const timeNow = +new Date();

  const result = await searchMovies(query, seed);
  logger.verbose(`Search results: ${result.total} hits found in ${(Date.now() - timeNow) / 1000}s`);

  const scenes = await movieCollection.getBulk(result.items);
  logger.verbose(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

  return {
    numItems: result.total,
    numPages: result.numPages,
    items: scenes,
  };
}
