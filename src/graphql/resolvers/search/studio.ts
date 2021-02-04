import { studioCollection } from "../../../database";
import { IStudioSearchQuery, searchStudios } from "../../../search/studio";
import Studio from "../../../types/studio";
import { logger } from "../../../utils/logger";

export async function getStudios(
  _: unknown,
  { query, seed }: { query: Partial<IStudioSearchQuery>; seed?: string }
): Promise<
  | {
      numItems: number;
      numPages: number;
      items: Studio[];
    }
  | undefined
> {
  const timeNow = +new Date();

  const result = await searchStudios(query, seed);
  logger.verbose(`Search results: ${result.total} hits found in ${(Date.now() - timeNow) / 1000}s`);

  const scenes = await studioCollection.getBulk(result.items);
  logger.verbose(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

  return {
    numItems: result.total,
    numPages: result.numPages,
    items: scenes,
  };
}
