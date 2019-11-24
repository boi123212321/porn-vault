export enum SortTarget {
  RELEVANCE = "relevance",
  RATING = "rating",
  DATE = "date",
  ADDED_ON = "addedOn",
  VIEWS = "views"
}

interface IQueryOptions {
  query?: string;
  include: string[];
  exclude: string[];
  actors: string[];
  rating: number;
  favorite?: boolean;
  bookmark?: boolean;
  sortBy: SortTarget;
  sortDir: "asc" | "desc";
  page: number;
  scene: string[];
}

export default (query?: string) => {
  const options: IQueryOptions = {
    include: [],
    exclude: [],
    actors: [],
    rating: 0,
    sortBy: SortTarget.ADDED_ON,
    sortDir: "desc",
    page: 0,
    scene: []
  };

  if (!query) return options;

  options.sortBy = SortTarget.RELEVANCE;

  for (const part of query.split(" ")) {
    const [operation, value] = part.split(":");

    switch (operation) {
      case "page":
        options[operation] = parseInt(value);
        break;
      case "query":
        options[operation] = value.slice(1, -1);
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
      case "scene":
        options[operation] = value.split(",");
        break;
      case "rating":
        options[operation] = parseInt(value);
        break;
      case "favorite":
        options[operation] = value == "true";
        break;
      case "bookmark":
        options[operation] = value == "true";
        break;
      case "sortBy":
        if (Object.values(SortTarget).includes(<SortTarget>value))
          options[operation] = <SortTarget>value;
        else throw `Query error: Unsupported sort target '${value}'`;
        break;
      case "sortDir":
        if (["asc", "desc"].includes(value))
          options[operation] = <"asc" | "desc">value;
        else throw `Query error: Unsupported sort direct '${value}'`;
        break;
    }
  }

  if (!options.query && options.sortBy == SortTarget.RELEVANCE) {
    options.sortBy = SortTarget.ADDED_ON;
  }

  return options;
};
