import { markerCollection } from "../../../database";
import { IMarkerSearchQuery, searchMarkers } from "../../../search/marker";
import Marker from "../../../types/marker";
import { logger } from "../../../utils/logger";

export async function getMarkers(
  _: unknown,
  { query, seed }: { query: Partial<IMarkerSearchQuery>; seed?: string }
): Promise<
  | {
      numItems: number;
      numPages: number;
      items: (Marker | null)[];
    }
  | undefined
> {
  const timeNow = +new Date();

  const result = await searchMarkers(query, seed);
  logger.verbose(`Search results: ${result.total} hits found in ${(Date.now() - timeNow) / 1000}s`);

  const scenes = await markerCollection.getBulk(result.items);
  logger.verbose(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

  return {
    numItems: result.total,
    numPages: result.numPages,
    items: scenes,
  };
}
