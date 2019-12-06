import Label from "./types/label";
import Actor from "./types/actor";
import Studio from "./types/studio";

// Calculate token permutation in string
// "a test string"
// -> ["a", "test", "string", "a test", "test string", "a test string"]
export function tokenPerms(str: string) {
  const tokens = str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9']/g, " ")
    .split(" ")
    .filter(Boolean);
  const perms = [...tokens];

  if (tokens.length <= 1) return perms;

  for (let len = 2; len <= tokens.length; len++) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const cat = [] as string[];
      for (let j = 0; j < len; j++) {
        cat.push(tokens[i + j]);
      }
      perms.push(cat.join(" "));
    }
  }

  return perms;
}

// Returns IDs of extracted labels
export async function extractLabels(str: string) {
  const perms = tokenPerms(str);

  const foundLabels = [] as string[];
  const allLabels = await Label.getAll();

  allLabels.forEach(label => {
    if (
      perms.includes(label.name.toLowerCase()) ||
      label.aliases.some(alias => perms.includes(alias.toLowerCase()))
    ) {
      foundLabels.push(label._id);
    }
  });
  return foundLabels;
}

// Returns IDs of extracted actors
export async function extractActors(str: string) {
  const perms = tokenPerms(str);

  const foundActors = [] as string[];
  const allActors = await Actor.getAll();

  allActors.forEach(actor => {
    if (
      perms.includes(actor.name.toLowerCase()) ||
      actor.aliases.some(alias => perms.includes(alias.toLowerCase()))
    ) {
      foundActors.push(actor._id);
    }
  });
  return foundActors;
}

// Returns IDs of extracted studios
export async function extractStudios(str: string) {
  const perms = tokenPerms(str);

  const foundStudios = [] as string[];
  const allStudios = await Studio.getAll();

  allStudios.forEach(studio => {
    if (perms.includes(studio.name.toLowerCase())) {
      foundStudios.push(studio._id);
    }
  });
  return foundStudios;
}
