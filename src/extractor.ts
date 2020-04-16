import Label from "./types/label";
import Actor from "./types/actor";
import Studio from "./types/studio";
import Scene from "./types/scene";
import CustomField from "./types/custom_field";
import Movie from "./types/movie";

function ignoreSingleNames(arr: string[]) {
  return arr.filter((str) => str.split(" ").length > 1);
}

export function stripStr(str: string) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9'/\\,()[\]{}]/g, "");
}

// Returns IDs of extracted custom fields
export async function extractFields(str: string): Promise<string[]> {
  const foundFields = [] as string[];
  const allFields = await CustomField.getAll();

  allFields.forEach((field) => {
    if (stripStr(str).includes(stripStr(field.name))) {
      foundFields.push(field._id);
    }
  });
  return foundFields;
}

// Returns IDs of extracted labels
export async function extractLabels(str: string): Promise<string[]> {
  const foundLabels = [] as string[];
  const allLabels = await Label.getAll();

  allLabels.forEach((label) => {
    if (
      stripStr(str).includes(stripStr(label.name)) ||
      label.aliases.some((alias) => stripStr(str).includes(stripStr(alias)))
    ) {
      foundLabels.push(label._id);
    }
  });
  return foundLabels;
}

// Returns IDs of extracted actors
export async function extractActors(str: string): Promise<string[]> {
  const foundActors = [] as string[];
  const allActors = await Actor.getAll();

  allActors.forEach((actor) => {
    if (
      stripStr(str).includes(stripStr(actor.name)) ||
      ignoreSingleNames(actor.aliases).some((alias) =>
        stripStr(str).includes(stripStr(alias))
      )
    ) {
      foundActors.push(actor._id);
    }
  });
  return foundActors;
}

// Returns IDs of extracted studios
export async function extractStudios(str: string): Promise<string[]> {
  const allStudios = await Studio.getAll();
  return allStudios
    .filter(
      (studio) =>
        stripStr(str).includes(stripStr(studio.name)) ||
        (studio.aliases || []).some((alias) =>
          stripStr(str).includes(stripStr(alias))
        )
    )
    .sort((a, b) => b.name.length - a.name.length)
    .map((s) => s._id);
}

// Returns IDs of extracted scenes
export async function extractScenes(str: string): Promise<string[]> {
  const allScenes = await Scene.getAll();
  return allScenes
    .filter((scene) => stripStr(str).includes(stripStr(scene.name)))
    .sort((a, b) => b.name.length - a.name.length)
    .map((s) => s._id);
}

// Returns IDs of extracted movies
export async function extractMovies(str: string): Promise<string[]> {
  const allMovies = await Movie.getAll();
  return allMovies
    .filter((movie) => stripStr(str).includes(stripStr(movie.name)))
    .sort((a, b) => b.name.length - a.name.length)
    .map((s) => s._id);
}
