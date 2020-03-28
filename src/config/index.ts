import * as logger from "../logger";
import setupFunction from "../setup";
import { exists, writeFile, readFile } from "fs";
import { promisify } from "util";
import { Dictionary } from "../types/utility";
import YAML from "yaml";
import inquirer from "inquirer";
import chokidar from "chokidar";
import { onConfigLoad } from "../index";

const existsAsync = promisify(exists);
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

function stringifyFormatted(obj: any) {
  return JSON.stringify(obj, null, 1);
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
  SCAN_INTERVAL: number;

  LIBRARY_PATH: string;

  FFMPEG_PATH: string;
  FFPROBE_PATH: string;

  GENERATE_SCREENSHOTS: boolean;
  GENERATE_PREVIEWS: boolean;
  SCREENSHOT_INTERVAL: number;

  PASSWORD: string | null;

  PORT: number;

  APPLY_SCENE_LABELS: boolean;
  APPLY_ACTOR_LABELS: boolean;
  APPLY_STUDIO_LABELS: boolean;

  /* USE_FUZZY_SEARCH: boolean;
  FUZZINESS: number; */

  READ_IMAGES_ON_IMPORT: boolean;
  REMOVE_DANGLING_FILE_REFERENCES: boolean;

  BACKUP_ON_STARTUP: boolean;
  MAX_BACKUP_AMOUNT: number;

  EXCLUDE_FILES: string[];

  CALCULATE_FILE_CHECKSUM: boolean;

  PLUGINS: Dictionary<IPlugin>;
  PLUGIN_EVENTS: Dictionary<(string | PluginCallWithArgument)[]>;

  CREATE_MISSING_ACTORS: boolean;
  CREATE_MISSING_STUDIOS: boolean;
  CREATE_MISSING_LABELS: boolean;

  MAX_LOG_SIZE: number;

  COMPRESS_IMAGE_SIZE: number;
}

export const defaultConfig: IConfig = {
  VIDEO_PATHS: [],
  IMAGE_PATHS: [],

  BULK_IMPORT_PATHS: [],

  SCAN_ON_STARTUP: false,
  SCAN_INTERVAL: 10800000,
  LIBRARY_PATH: process.cwd(),
  FFMPEG_PATH: "",
  FFPROBE_PATH: "",
  GENERATE_SCREENSHOTS: true,
  GENERATE_PREVIEWS: true,
  SCREENSHOT_INTERVAL: 120,
  PASSWORD: null,
  PORT: 3000,
  APPLY_SCENE_LABELS: true,
  APPLY_ACTOR_LABELS: true,
  APPLY_STUDIO_LABELS: true,
  /* USE_FUZZY_SEARCH: true,
  FUZZINESS: 0.25, */
  READ_IMAGES_ON_IMPORT: false,
  REMOVE_DANGLING_FILE_REFERENCES: false,
  BACKUP_ON_STARTUP: true,
  MAX_BACKUP_AMOUNT: 10,
  EXCLUDE_FILES: [],
  CALCULATE_FILE_CHECKSUM: false,
  PLUGINS: {},
  PLUGIN_EVENTS: {
    actorCreated: [],
    sceneCreated: [],
    actorCustom: [],
    sceneCustom: [],
    movieCreated: []
  },
  CREATE_MISSING_ACTORS: false,
  CREATE_MISSING_STUDIOS: false,
  CREATE_MISSING_LABELS: false,
  MAX_LOG_SIZE: 2500,

  COMPRESS_IMAGE_SIZE: 540
};

let loadedConfig;
export let configFile;

export async function checkConfig() {
  const hasReadFile = await loadConfig();

  if (hasReadFile) {
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
        stringifyFormatted(loadedConfig),
        "utf-8"
      );
    }
    return;
  }

  const { yaml } = await inquirer.prompt([
    {
      type: "confirm",
      name: "yaml",
      message: "Use YAML (instead of JSON) for config file?",
      default: false
    }
  ]);

  loadedConfig = await setupFunction();

  if (yaml) {
    await writeFileAsync("config.yaml", YAML.stringify(loadedConfig), "utf-8");
    logger.warn("Created config.yaml. Please edit and restart.");
  } else {
    await writeFileAsync(
      "config.json",
      stringifyFormatted(loadedConfig),
      "utf-8"
    );
    logger.warn("Created config.json. Please edit and restart.");
  }

  return process.exit(0);
}

export async function loadConfig() {
  if (await existsAsync("config.json")) {
    logger.message("Loading config.json...");
    try {
      loadedConfig = JSON.parse(await readFileAsync("config.json", "utf-8"));
    } catch (error) {
      logger.error(error.message);
      process.exit(1);
    }
    configFile = "config.json";
    return true;
  } else if (await existsAsync("config.yaml")) {
    logger.message("Loading config.yaml...");
    try {
      loadedConfig = YAML.parse(await readFileAsync("config.yaml", "utf-8"));
    } catch (error) {
      logger.error(error.message);
      process.exit(1);
    }
    configFile = "config.yaml";
    return true;
  }

  return false;
}

export function getConfig() {
  return loadedConfig as IConfig;
}

export function watchConfig() {
  chokidar.watch(configFile).on("change", async () => {
    logger.message(`${configFile} changed, reloading...`);

    let newConfig = null as IConfig | null;

    if (configFile.endsWith(".json")) {
      try {
        newConfig = JSON.parse(await readFileAsync("config.json", "utf-8"));
      } catch (error) {
        logger.error(error.message);
        logger.error("ERROR when loading new config, please fix it.");
      }
    } else if (configFile.endsWith(".yaml")) {
      try {
        newConfig = YAML.parse(await readFileAsync("config.yaml", "utf-8"));
      } catch (error) {
        logger.error(error.message);
        logger.error("ERROR when loading new config, please fix it.");
      }
    }

    if (newConfig) {
      loadedConfig = newConfig;
      await onConfigLoad(loadedConfig);
    } else {
      logger.warn("Couldn't load config, try again");
    }
  });
}
