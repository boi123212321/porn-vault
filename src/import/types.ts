import { Dictionary } from "../types/utility";
import { CustomFieldType } from "../types/custom_field";

export interface IImportedScene {
  name: string;
  path: string;
  releaseDate?: number | null;
  actors?: string[] | null;
  labels?: string[] | null;
  customFields?: Dictionary<string> | null;
  favorite?: boolean | null;
  bookmark?: number | null;
  rating?: number | null;
  description?: string | null;
  thumbnail?: string | null;
  studio?: string | null;
}

export interface IImportedMovie {
  name: string;
  description?: string | null;
  releaseDate?: number | null;
  scenes?: string[] | null;
  favorite?: boolean | null;
  bookmark?: number | null;
  rating?: number | null;
  customFields?: Dictionary<string> | null;
  frontCover?: string | null;
  backCover?: string | null;
  spineCover?: string | null;
  studio?: string | null;
}

export interface IImportedActor {
  name: string;
  description?: string | null;
  bornOn?: number | null;
  aliases?: string[];
  labels?: string[];
  customFields?: Dictionary<string>;
  favorite?: boolean;
  bookmark?: number | null;
  rating?: number | null;
  thumbnail?: string | null;
}

export interface IImportedLabel {
  name: string;
  aliases?: string[] | null;
}

export interface IImportedMarker {
  name: string;
  scene: string;
  rating?: number | null;
  bookmark?: number | null;
  favorite?: boolean | null;
  labels?: string[] | null;
  time: number;
}

export interface IImportedStudio {
  name: string;
  parent: string;
  aliases?: string[] | null;
  thumbnail?: string | null;
  labels?: string[];
  favorite?: boolean;
  bookmark?: number | null;
  rating?: number | null;
}

export interface IImportedCustomField {
  name: string;
  type: CustomFieldType;
  values?: string[] | null;
}
