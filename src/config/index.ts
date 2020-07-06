import chokidar from "chokidar";
import inquirer from "inquirer";
import path from "path";
import YAML from "yaml";

import { onConfigLoad } from "..";
import { existsAsync, readFileAsync, writeFileAsync } from "../fs/async";
import * as logger from "../logger";
import setupFunction from "../setup";
import { Dictionary } from "../types/utility";

enum ConfigFileFormat {
  JSON = "JSON",
  YAML = "YAML",
}

function stringifyFormatted(obj: any, format: ConfigFileFormat) {
  switch (format) {
    case ConfigFileFormat.JSON:
      return JSON.stringify(obj, null, 2);
    case ConfigFileFormat.YAML:
      return YAML.stringify(obj);
    default:
      return "";
  }
}

interface IPlugin {
  path: string;
  args?: Dictionary<any>;
}

type PluginCallWithArgument = [string, Dictionary<any>];

export interface IConfig {
  VIDEO_PATHS: string[];
  IMAGE_PATHS: string[];

  BULK_IMPORT_PATHS: string[];

  SCAN_ON_STARTUP: boolean;
  DO_PROCESSING: boolean;
  SCAN_INTERVAL: number;

  LIBRARY_PATH: string;

  FFMPEG_PATH: string;
  FFPROBE_PATH: string;

  GENERATE_SCREENSHOTS: boolean;
  GENERATE_PREVIEWS: boolean;
  SCREENSHOT_INTERVAL: number;

  PASSWORD: string | null;

  PORT: number;
  IZZY_PORT: number;
  GIANNA_PORT: number;
  ENABLE_HTTPS: boolean;
  HTTPS_KEY: string;
  HTTPS_CERT: string;

  APPLY_SCENE_LABELS: boolean;
  APPLY_ACTOR_LABELS: boolean;
  APPLY_STUDIO_LABELS: boolean;

  /* USE_FUZZY_SEARCH: boolean;
  FUZZINESS: number; */

  READ_IMAGES_ON_IMPORT: boolean;

  BACKUP_ON_STARTUP: boolean;
  MAX_BACKUP_AMOUNT: number;

  EXCLUDE_FILES: string[];

  PLUGINS: Dictionary<IPlugin>;
  PLUGIN_EVENTS: Dictionary<(string | PluginCallWithArgument)[]>;

  CREATE_MISSING_ACTORS: boolean;
  CREATE_MISSING_STUDIOS: boolean;
  CREATE_MISSING_LABELS: boolean;
  CREATE_MISSING_MOVIES: boolean;

  ALLOW_PLUGINS_OVERWRITE_SCENE_THUMBNAILS: boolean;
  ALLOW_PLUGINS_OVERWRITE_ACTOR_THUMBNAILS: boolean;
  ALLOW_PLUGINS_OVERWRITE_MOVIE_THUMBNAILS: boolean;

  MAX_LOG_SIZE: number;

  COMPRESS_IMAGE_SIZE: number;

  CACHE_TIME: number;
}

export const defaultConfig: IConfig = {
  VIDEO_PATHS: [],
  IMAGE_PATHS: [],

  BULK_IMPORT_PATHS: [],

  SCAN_ON_STARTUP: false,
  DO_PROCESSING: true,
  SCAN_INTERVAL: 10800000,
  LIBRARY_PATH: process.cwd(),
  FFMPEG_PATH: "",
  FFPROBE_PATH: "",
  GENERATE_SCREENSHOTS: false,
  GENERATE_PREVIEWS: true,
  SCREENSHOT_INTERVAL: 120,
  PASSWORD: null,
  PORT: 3000,
  IZZY_PORT: 8000,
  GIANNA_PORT: 8001,
  ENABLE_HTTPS: false,
  HTTPS_KEY: "",
  HTTPS_CERT: "",
  APPLY_SCENE_LABELS: true,
  APPLY_ACTOR_LABELS: true,
  APPLY_STUDIO_LABELS: true,
  /* USE_FUZZY_SEARCH: true,
  FUZZINESS: 0.25, */
  READ_IMAGES_ON_IMPORT: false,
  BACKUP_ON_STARTUP: true,
  MAX_BACKUP_AMOUNT: 10,
  EXCLUDE_FILES: [],
  PLUGINS: {},
  PLUGIN_EVENTS: {
    actorCreated: [],
    sceneCreated: [],
    actorCustom: [],
    sceneCustom: [],
    movieCreated: [],
  },
  CREATE_MISSING_ACTORS: false,
  CREATE_MISSING_STUDIOS: false,
  CREATE_MISSING_LABELS: false,
  CREATE_MISSING_MOVIES: false,

  ALLOW_PLUGINS_OVERWRITE_SCENE_THUMBNAILS: false,
  ALLOW_PLUGINS_OVERWRITE_ACTOR_THUMBNAILS: false,
  ALLOW_PLUGINS_OVERWRITE_MOVIE_THUMBNAILS: false,

  MAX_LOG_SIZE: 2500,

  COMPRESS_IMAGE_SIZE: 720,

  CACHE_TIME: 0,
};

let loadedConfig;
let loadedConfigFormat: ConfigFileFormat | null = null;
export let configFile;

const configFilename = process.env.NODE_ENV === "test" ? "config.test" : "config";

const configJSONFilename = path.resolve(process.cwd(), `${configFilename}.json`);
const configYAMLFilename = path.resolve(process.cwd(), `${configFilename}.yaml`);

export async function checkConfig(): Promise<undefined> {
  const hasReadFile = await loadConfig();

  if (hasReadFile && loadedConfigFormat) {
    let defaultOverride = false;
    for (const key in defaultConfig) {
      if (loadedConfig[key] === undefined) {
        loadedConfig[key] = defaultConfig[key];
        defaultOverride = true;
      }
    }

    if (defaultOverride) {
      await writeFileAsync(
        configFile,
        stringifyFormatted(loadedConfig, loadedConfigFormat),
        "utf-8"
      );
    }
    return;
  }

  const yaml =
    process.env.NODE_ENV === "test"
      ? false
      : (
          await inquirer.prompt<{ yaml: boolean }>([
            {
              type: "confirm",
              name: "yaml",
              message: "Use YAML (instead of JSON) for config file?",
              default: false,
            },
          ])
        ).yaml;

  loadedConfig = await setupFunction();

  if (yaml) {
    await writeFileAsync(
      configYAMLFilename,
      stringifyFormatted(loadedConfig, ConfigFileFormat.YAML),
      "utf-8"
    );
    logger.warn(`Created ${configYAMLFilename}. Please edit and restart.`);
  } else {
    await writeFileAsync(
      configJSONFilename,
      stringifyFormatted(loadedConfig, ConfigFileFormat.JSON),
      "utf-8"
    );
    logger.warn(`Created ${configJSONFilename}. Please edit and restart.`);
  }

  return process.exit(0);
}

export async function loadConfig(): Promise<boolean> {
  try {
    if (await existsAsync(configJSONFilename)) {
      logger.message(`Loading ${configJSONFilename}...`);
      loadedConfig = JSON.parse(await readFileAsync(configJSONFilename, "utf-8"));
      configFile = configJSONFilename;
      loadedConfigFormat = ConfigFileFormat.JSON;
      return true;
    } else if (await existsAsync(configYAMLFilename)) {
      logger.message(`Loading ${configYAMLFilename}...`);
      loadedConfig = YAML.parse(await readFileAsync(configYAMLFilename, "utf-8"));
      configFile = configYAMLFilename;
      loadedConfigFormat = ConfigFileFormat.YAML;
      return true;
    } else {
      logger.warn("Did not find any config file");
    }
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }

  return false;
}

export function getConfig(): IConfig {
  return loadedConfig as IConfig;
}

/**
 * @returns a function that will stop watching the config file
 */
export function watchConfig(): () => Promise<void> {
  const watcher = chokidar.watch(configFile).on("change", async () => {
    logger.message(`${configFile} changed, reloading...`);

    let newConfig = null as IConfig | null;

    try {
      if (configFile.endsWith(".json")) {
        newConfig = JSON.parse(await readFileAsync(configJSONFilename, "utf-8"));
        loadedConfigFormat = ConfigFileFormat.JSON;
      } else if (configFile.endsWith(".yaml")) {
        newConfig = YAML.parse(await readFileAsync(configYAMLFilename, "utf-8"));
        loadedConfigFormat = ConfigFileFormat.YAML;
      }
    } catch (error) {
      logger.error(error.message);
      logger.error("ERROR when loading new config, please fix it.");
    }

    if (newConfig) {
      loadedConfig = newConfig;
      await onConfigLoad(loadedConfig);
    } else {
      logger.warn("Couldn't load config, try again");
    }
  });

  return async () => watcher.close();
}

export function resetLoadedConfig() {
  loadedConfig = null;
}
