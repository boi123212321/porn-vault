import Label from "./types/label";
import Actor from "./types/actor";
import Studio from "./types/studio";

export function stripStr(str: string) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9']/g, "");
}

// Returns IDs of extracted labels
export async function extractLabels(str: string): Promise<string[]> {
  const foundLabels = [] as string[];
  const allLabels = await Label.getAll();

  allLabels.forEach(label => {
    if (
      stripStr(str).includes(stripStr(label.name)) ||
      label.aliases.some(alias => stripStr(str).includes(stripStr(alias)))
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

  allActors.forEach(actor => {
    if (
      stripStr(str).includes(stripStr(actor.name)) ||
      actor.aliases.some(alias => stripStr(str).includes(stripStr(alias)))
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
    .filter(studio => stripStr(str).includes(stripStr(studio.name)))
    .sort((a, b) => b.name.length - a.name.length)
    .map(s => s._id);
}
