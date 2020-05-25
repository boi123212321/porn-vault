import * as logger from "./logger";

export interface IQueryOptions {
  query?: string;
  include: string[];
  exclude: string[];
  actors: string[];
  rating: number;
  favorite?: boolean;
  bookmark?: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  page: number;
  scenes: string[];
  studios: string[];
  durationMin: number | null;
  durationMax: number | null;
  skip: number | null;
  take: number | null;
}

const parseWords = (str = "") =>
  //@ts-ignore
  str
    .match(/\\?.|^$/g)
    .reduce(
      (p, c) => {
        if (c === "'") {
          //@ts-ignore
          p.quote ^= 1;
          //@ts-ignore
        } else if (!p.quote && c === " ") {
          p.a.push("");
        } else {
          p.a[p.a.length - 1] += c.replace(/\\(.)/, "$1");
        }
        return p;
      },
      { a: [""] }
    )
    .a.filter(Boolean);

export default (query?: string) => {
  const options: IQueryOptions = {
    include: [],
    exclude: [],
    actors: [],
    rating: 0,
    sortBy: "addedOn",
    sortDir: "desc",
    page: 0,
    scenes: [],
    studios: [],
    durationMin: null,
    durationMax: null,
    skip: null,
    take: null,
  };

  if (!query) return options;

  options.sortBy = "relevance";

  for (const part of parseWords(query)) {
    const [operation, value] = part.split(":");

    switch (operation) {
      case "skip":
        options[operation] = parseInt(value);
        break;
      case "take":
        options[operation] = parseInt(value);
        break;
      case "page":
        options[operation] = parseInt(value);
        break;
      case "query":
        options[operation] = value;
        break;
      case "include":
        options[operation] = value.split(",");
        break;
      case "exclude":
        options[operation] = value.split(",");
        break;
      case "actors":
        options[operation] = value.split(",");
        break;
      case "scenes":
        options[operation] = value.split(",");
        break;
      case "studios":
        options[operation] = value.split(",");
        break;
      case "rating":
        options[operation] = parseInt(value);
        break;
      case "duration.min":
        options.durationMin = parseInt(value) || null;
        break;
      case "duration.max":
        options.durationMax = parseInt(value) || null;
        break;
      case "favorite":
        options[operation] = value == "true";
        break;
      case "bookmark":
        options[operation] = value == "true";
        break;
      case "sortBy":
        options[operation] = value;
        break;
      case "sortDir":
        if (["asc", "desc"].includes(value))
          options[operation] = <"asc" | "desc">value;
        else throw `Query error: Unsupported sort direction '${value}'`;
        break;
    }
  }

  if (!options.query && options.sortBy == "relevance") {
    logger.log("No search query, defaulting to addedOn");
    options.sortBy = "addedOn";
    options.sortDir = "desc";
  }

  return options;
};
