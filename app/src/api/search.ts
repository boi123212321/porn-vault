import ApolloClient from "../apollo";
import gql from "graphql-tag";

interface IDupCheckResult {
  name?: string;
  aliases?: string[];
}

export interface IDupCheckResults {
  nameDup?: IDupCheckResult;
  aliasesDup?: IDupCheckResult[];
}

export async function checkActorExist(name: string): Promise<IDupCheckResults> {
  const searchName = name.trim();
  if (searchName.length < 3) return {};

  const result = await ApolloClient.query({
    query: gql`
      query($query: ActorSearchQuery!) {
        getActors(query: $query) {
          items {
            name
            aliases
          }
          numItems
        }
      }
    `,
    variables: {
      query: {
        query: searchName,
        sortBy: "relevance",
      },
    },
  });
  if (!result.data.getActors.items.length) return {};

  // Exist if result contains a name match or one or more alias matches (case insensitive and ignoring accents)
  return {
    nameDup: result.data.getActors.items.find(
      ({ name }) => name.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
    ),
    aliasesDup: result.data.getActors.items.filter(({ aliases }) =>
      aliases?.find(
        (alias) => alias.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
      )
    ),
  };
}

export async function checkMovieExist(name: string): Promise<boolean>  {
  const searchName = name.trim();
  if (searchName.length < 3) return false;

  const result = await ApolloClient.query({
    query: gql`
      query($query: MovieSearchQuery!) {
        getMovies(query: $query) {
          items {
            name
          }
          numItems
        }
      }
    `,
    variables: {
      query: {
        query: searchName,
        sortBy: "relevance",
      },
    },
  });
  if (!result.data.getMovies.items.length) return false;

  // Exist if result contains a name match (case insensitive and ignoring accents)
  return result.data.getMovies.items.find(
    ({ name }) => name.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
  );
}

export async function checkStudioExist(name: string): Promise<IDupCheckResults>  {
  const searchName = name.trim();
  if (searchName.length < 3) return {};

  const result = await ApolloClient.query({
    query: gql`
      query($query: StudioSearchQuery!) {
        getStudios(query: $query) {
          items {
            name
            aliases
          }
          numItems
        }
      }
    `,
    variables: {
      query: {
        query: searchName,
        sortBy: "relevance",
      },
    },
  });
  if (!result.data.getStudios.items.length) return {};

  // Exist if result contains a name match or one or more alias matches (case insensitive and ignoring accents)
  return {
    nameDup: result.data.getStudios.items.find(
      ({ name }) => name.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
    ),
    aliasesDup: result.data.getStudios.items.filter(({ aliases }) =>
      aliases?.find(
        (alias) => alias.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
      )
    ),
  };
}
