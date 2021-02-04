import { getMatcher, MatchSource } from "./matching/matcher";
import { DEFAULT_STRING_MATCHER, StringMatcher } from "./matching/stringMatcher";
import Actor from "./types/actor";
import CustomField from "./types/custom_field";
import Label from "./types/label";
import Movie from "./types/movie";
import Scene from "./types/scene";
import Studio from "./types/studio";

export type Extractor = (str: string) => string[];

/**
 * Builds an extractor for the given items
 *
 * @param getAll - retrieves all the items of that type
 * @param getItemInputs - retrieves the inputs to match an item with
 * @param sortByLongestMatch - if items should be sorted by the
 * longest matched string
 * @param extraItems - extra items not returned by getAll that
 * should be included in the comparison
 */
export async function buildExtractor<T extends MatchSource>(
  getAll: () => Promise<T[]>,
  getItemInputs: (item: T) => string[],
  sortByLongestMatch: boolean,
  extraItems?: T[]
): Promise<Extractor> {
  const allItems = (await getAll()).concat(extraItems || []);

  return (str: string) => {
    return getMatcher()
      .filterMatchingItems(allItems, str, getItemInputs, sortByLongestMatch)
      .map((s) => s._id);
  };
}

export async function buildFieldExtractor(extraFields?: CustomField[]): Promise<Extractor> {
  const allItems = (await CustomField.getAll()).concat(extraFields || []);

  return (str: string) => {
    return new StringMatcher({
      ignoreSingleNames: false,
      stripString: DEFAULT_STRING_MATCHER.options.stripString,
    })
      .filterMatchingItems(allItems, str, (field) => [field.name], false)
      .map((s) => s._id);
  };
}

// Returns IDs of extracted custom fields
export async function extractFields(str: string, extraFields?: CustomField[]): Promise<string[]> {
  return (await buildFieldExtractor(extraFields))(str);
}

export async function buildLabelExtractor(extraLabels?: Label[]): Promise<Extractor> {
  return buildExtractor(
    Label.getAll,
    (label) => [label.name, ...label.aliases],
    false,
    extraLabels
  );
}

// Returns IDs of extracted labels
export async function extractLabels(str: string, extraLabels?: Label[]): Promise<string[]> {
  return (await buildLabelExtractor(extraLabels))(str);
}

export async function buildActorExtractor(extraActors?: Actor[]): Promise<Extractor> {
  return buildExtractor(
    Actor.getAll,
    (actor) => [actor.name, ...actor.aliases],
    false,
    extraActors
  );
}

// Returns IDs of extracted actors
export async function extractActors(str: string, extraActors?: Actor[]): Promise<string[]> {
  return (await buildActorExtractor(extraActors))(str);
}

export async function buildStudioExtractor(extraStudios?: Studio[]): Promise<Extractor> {
  return await buildExtractor(
    Studio.getAll,
    (studio) => [studio.name, ...(studio.aliases || [])],
    true,
    extraStudios
  );
}

// Returns IDs of extracted studios
export async function extractStudios(str: string, extraStudios?: Studio[]): Promise<string[]> {
  return (await buildStudioExtractor(extraStudios))(str);
}

export async function buildSceneExtractor(extraScenes?: Scene[]): Promise<Extractor> {
  return await buildExtractor(Scene.getAll, (scene) => [scene.name], true, extraScenes);
}

// Returns IDs of extracted scenes
export async function extractScenes(str: string, extraScenes?: Scene[]): Promise<string[]> {
  return (await buildSceneExtractor(extraScenes))(str);
}

export async function buildMovieExtractor(extraMovies?: Movie[]): Promise<Extractor> {
  return buildExtractor(Movie.getAll, (movie) => [movie.name], true, extraMovies);
}

// Returns IDs of extracted movies
export async function extractMovies(str: string, extraMovies?: Movie[]): Promise<string[]> {
  return (await buildMovieExtractor(extraMovies))(str);
}
