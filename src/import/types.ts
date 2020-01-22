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
  bookmark?: boolean | null;
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
  bookmark?: boolean | null;
  rating?: number | null;
  customFields?: Dictionary<string> | null;
  frontCover?: string | null;
  backCover?: string | null;
  studio?: string | null;
}

export interface IImportedActor {
  name: string;
  bornOn?: number | null;
  aliases?: string[];
  labels?: string[];
  customFields?: Dictionary<string>;
  favorite?: boolean;
  bookmark?: boolean;
  rating?: number | null;
  thumbnail?: string | null;
}

export interface IImportedLabel {
  name: string;
  aliases?: string[] | null;
}

export interface IImportedStudio {
  name: string;
  parent: string;
  aliases?: string[] | null;
  thumbnail?: string | null;
  labels?: string[];
  favorite?: boolean;
  bookmark?: boolean;
  rating?: number | null;
}

export interface IImportedCustomField {
  name: string;
  type: CustomFieldType;
  values?: string[] | null;
}
