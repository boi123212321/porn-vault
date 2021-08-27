import { getClient } from "../search/index";
import Actor from "../types/actor";
import { logger } from "../utils/logger";

export interface ISearchResults {
  items: string[];
  total: number;
  numPages: number;
}

export type CustomFieldFilter = {
  id: string;
  op: "gt" | "lt" | "term" | "match" | "wildcard";
  value: unknown;
};

export async function performSearch<
  T extends { id: string },
  Q extends Partial<{
    query: string;
    sortBy: string;
    sortDir: string;
    page: number;
    skip: number;
    take: number;
  }>
>({
  index,
  options,
  query,
}: {
  index: string;
  options: Q;
  query: unknown;
}): Promise<ISearchResults> {
  logger.verbose(`Searching "${index}" for "${options.query?.trim() || "<no query>"}"...`);

  const count = await getCount(index);
  if (count === 0) {
    logger.debug(`No items in ES, returning 0`);
    return {
      items: [],
      numPages: 0,
      total: 0,
    };
  }

  const result = await getClient().search<T>({
    index,
    ...getPage(options.page, options.skip, options.take),
    body: {
      ...sort(options.sortBy, options.sortDir, options.query),
      track_total_hits: true,
      query,
    },
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const total: number = result.hits.total.value;

  return {
    items: result.hits.hits.map((doc) => doc._source.id),
    total,
    numPages: Math.ceil(total / getPageSize(options.take)),
  };
}

export function buildCustomFilter(filters?: CustomFieldFilter[]): unknown[] {
  if (!filters) {
    return [];
  }

  return filters.map(({ op, id, value }) => {
    if (op === "lt" || op === "gt") {
      return {
        range: {
          [`custom.${id}`]: {
            [op]: value,
          },
        },
      };
    }

    if (op === "wildcard") {
      return {
        wildcard: {
          [`custom.${id}`]: `*${<string>value}*`,
        },
      };
    }

    return {
      [op]: {
        [`custom.${id}`]: value,
      },
    };
  });
}

export const DEFAULT_PAGE_SIZE = 24;

function typeahead(query: string | undefined | null): string {
  return query ? `${query}*` : "";
}

export function searchQuery(query: string | undefined | null, fields: string[]): unknown[] {
  if (query && query.length) {
    return [
      {
        multi_match: {
          query,
          fields,
          fuzziness: "AUTO",
        },
      },
      {
        query_string: {
          query: typeahead(query),
          fields,
          analyze_wildcard: true,
          boost: 0.25,
        },
      },
    ];
  }
  return [];
}

export async function getCount(index: string): Promise<number> {
  const { count } = await getClient().count({
    index,
  });
  return count;
}

export function getActorNames(actor: Actor): string[] {
  return [...new Set([actor.name, ...normalizeAliases(actor.aliases)])];
}

export function normalizeAliases(aliases: string[]): string[] {
  return aliases.filter((alias) => !alias.startsWith("regex:"));
}

export function durationFilter(min?: number, max?: number): unknown[] {
  if (min || max) {
    return [
      {
        range: {
          duration: {
            lte: max || 99999999,
            gte: min || 0,
          },
        },
      },
    ];
  }
  return [];
}

export function ratingFilter(rating?: number): unknown[] {
  if (rating && rating > 0) {
    return [
      {
        range: {
          rating: {
            gte: rating || 0,
          },
        },
      },
    ];
  }
  return [];
}

export function favorite(favorite?: boolean): unknown[] {
  if (favorite) {
    return [
      {
        term: { favorite: true },
      },
    ];
  }
  return [];
}

export function bookmark(bookmark?: boolean): unknown[] {
  if (bookmark) {
    return [
      {
        exists: {
          field: "bookmark",
        },
      },
    ];
  }
  return [];
}

export function unwatchedOnly(unwatchedOnly?: boolean): unknown[] {
  if (unwatchedOnly) {
    return [
      {
        bool: {
          should: [
            {
              bool: {
                must_not: {
                  exists: {
                    field: "numViews",
                  },
                },
              },
            },
            {
              term: { numViews: 0 },
            },
          ],
        },
      },
    ];
  }
  return [];
}

export function arrayFilter(ids: string[] | undefined, prop: string, op: "AND" | "OR"): unknown[] {
  if (ids && ids.length) {
    return [
      {
        query_string: {
          query: `(${ids.map((name) => `${prop}:${name}`).join(` ${op} `)})`,
        },
      },
    ];
  }
  return [];
}

export function includeFilter(include?: string[]): unknown[] {
  return arrayFilter(include, "labels", "AND");
}

export function excludeFilter(exclude?: string[]): unknown[] {
  return arrayFilter(exclude, "-labels", "AND");
}

export function emptyField(emptyField?: string): unknown[] {
  if (emptyField) {
    return [
      {
        "exists": {
          "field": emptyField,
        },
      },
    ]
  }
  return []
}

export function shuffleSwitch(query: unknown[], shuffle: unknown[]): Record<string, unknown> {
  if (shuffle.length) {
    return {
      must: shuffle,
    };
  }
  return {
    should: query,
  };
}

export function shuffle(seed: string, query: unknown[], sortBy?: string): unknown[] {
  if (sortBy === "$shuffle") {
    return [
      {
        function_score: {
          query: {
            bool: shuffleSwitch(query, []),
          },
          random_score: {
            seed,
          },
        },
      },
    ];
  }
  return [];
}

export function sort(sortBy?: string, sortDir?: string, query?: string): Record<string, unknown> {
  if (sortBy === "$shuffle") {
    return {};
  }
  if (sortBy === "relevance" && !query) {
    return {
      sort: { addedOn: "desc" },
    };
  }
  if (sortBy && sortBy !== "relevance") {
    return {
      sort: {
        [sortBy]: sortDir || "desc",
      },
    };
  }
  return {};
}

export function getPageSize(take?: number): number {
  return take || DEFAULT_PAGE_SIZE;
}

export function getPage(
  page?: number,
  skip?: number,
  take?: number
): { from: number; size: number } {
  const pageSize = getPageSize(take);
  return {
    from: skip || Math.max(0, +(page || 0) * pageSize),
    size: pageSize,
  };
}
