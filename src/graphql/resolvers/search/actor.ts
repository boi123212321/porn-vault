import { actorCollection } from "../../../database";
import { IActorSearchQuery, searchActors } from "../../../search/actor";
import Actor from "../../../types/actor";
import { logger } from "../../../utils/logger";

export async function getUnwatchedActors(
  _: unknown,
  { take, skip, seed }: { skip?: number; take?: number; seed?: string }
): Promise<Actor[] | undefined> {
  const timeNow = +new Date();

  const result = await searchActors(
    {
      take,
      skip,
      sortBy: "addedOn",
      sortDir: "desc",
    },
    seed,
    [
      {
        term: {
          numViews: 0,
        },
      },
    ]
  );
  logger.verbose(`Search results: ${result.total} hits found in ${(Date.now() - timeNow) / 1000}s`);

  const actors = await actorCollection.getBulk(result.items);
  logger.verbose(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

  return actors;
}

export async function getActors(
  _: unknown,
  { query, seed }: { query: Partial<IActorSearchQuery>; seed?: string }
): Promise<
  | {
      numItems: number;
      numPages: number;
      items: Actor[];
    }
  | undefined
> {
  const timeNow = +new Date();

  const result = await searchActors(query, seed);
  logger.verbose(`Search results: ${result.total} hits found in ${(Date.now() - timeNow) / 1000}s`);

  const actors = await actorCollection.getBulk(result.items);
  logger.verbose(`Search done in ${(Date.now() - timeNow) / 1000}s.`);

  return {
    numItems: result.total,
    numPages: result.numPages,
    items: actors,
  };
}
