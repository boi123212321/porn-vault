import path from "path";

import { getConfig } from "../config";

export function libraryPath(str: string): string {
  return path.join(getConfig().persistence.libraryPath, "library", str);
}

const configFolder = process.env.PV_CONFIG_FOLDER ? process.env.PV_CONFIG_FOLDER : process.cwd();

export function configPath(...paths: string[]): string {
  return path.resolve(path.join(configFolder, ...paths));
}
