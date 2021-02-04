import chokidar from "chokidar";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import YAML from "yaml";

import { DEFAULT_STRING_MATCHER, StringMatcherType } from "../matching/stringMatcher";
import { DEFAULT_WORD_MATCHER, WordMatcherType } from "../matching/wordMatcher";
import { refreshClient } from "../search";
import { setupFunction } from "../setup";
import { readFileAsync, writeFileAsync } from "../utils/fs/async";
import { createVaultLogger, handleError, logger, setLogger } from "../utils/logger";
import { mergeMissingProperties, removeUnknownProperties } from "../utils/misc";
import { configPath } from "../utils/path";
import { DeepPartial } from "../utils/types";
import defaultConfig from "./default";
import { IConfig, isValidConfig } from "./schema";
import { validateConfigExtra } from "./validate";

enum ConfigFileFormat {
  JSON = "JSON",
  YAML = "YAML",
}

function stringifyFormatted<T>(obj: T, format: ConfigFileFormat): string {
  switch (format) {
    case ConfigFileFormat.JSON:
      return JSON.stringify(obj, null, 2);
    case ConfigFileFormat.YAML:
      return YAML.stringify(obj);
    default:
      return "";
  }
}

let loadedConfig: IConfig | null;
export let configFile: string;

const configFilename = process.env.NODE_ENV === "test" ? "config.test" : "config";

const configJSONFilename = configPath(`${configFilename}.json`);
const configYAMLFilename = configPath(`${configFilename}.yaml`);

export async function loadTestConfig(): Promise<void> {
  const file = "config.testenv.json";
  logger.info(`Loading ${file}...`);
  loadedConfig = JSON.parse(await readFileAsync(file, "utf-8")) as IConfig;
  configFile = file;
}

/**
 * @throws
 */
async function setupNewConfig(): Promise<void> {
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
    logger.warn(`Created "${configYAMLFilename}". Please edit and restart.`);
  } else {
    await writeFileAsync(
      configJSONFilename,
      stringifyFormatted(loadedConfig, ConfigFileFormat.JSON),
      "utf-8"
    );
    logger.warn(`Created "${configJSONFilename}". Please edit and restart.`);
  }
}

/**
 * @returns if the program should be restarted (to load new config)
 * @throws
 */
export async function findAndLoadConfig(): Promise<boolean> {
  let writeNewConfig = false;
  try {
    if (existsSync(configJSONFilename)) {
      logger.info(`Loading "${configJSONFilename}"...`);
      loadedConfig = JSON.parse(await readFileAsync(configJSONFilename, "utf-8")) as IConfig;
      configFile = configJSONFilename;
      return false;
    } else if (existsSync(configYAMLFilename)) {
      logger.info(`Loading "${configYAMLFilename}"...`);
      loadedConfig = YAML.parse(await readFileAsync(configYAMLFilename, "utf-8")) as IConfig;
      configFile = configYAMLFilename;
      return false;
    } else {
      writeNewConfig = true;
    }
  } catch (error) {
    handleError(
      "ERROR when loading config, please fix it. Run your file through a linter before trying again (search for 'JSON/YAML linter' online).",
      error
    );
    throw error;
  }

  if (writeNewConfig) {
    try {
      await setupNewConfig();
      return true;
    } catch (err) {
      handleError("ERROR when writing default config.", err);
    }
  }

  return false;
}

export function getConfig(): IConfig {
  return loadedConfig as IConfig;
}

/**
 * Strips unknown properties from the config, merges it with defaults
 * and then writes it to a file
 *
 * @param config - the config to strip & merge with defaults
 */
export function writeMergedConfig(config: IConfig): void {
  try {
    let mergedConfig = removeUnknownProperties(config, defaultConfig, [
      "plugins.register",
      // Can't remove matcher options since they are dependant on the matcher type
      "matching.matcher.options",
    ]);
    mergedConfig = mergeMissingProperties(
      mergedConfig,
      [defaultConfig],
      [
        "plugins.register",
        // Can't merge matcher options since they are dependant on the matcher type
        "matching.matcher.options",
      ]
    );

    let mergedMatcher: DeepPartial<StringMatcherType | WordMatcherType> = {};
    const matchingConfig = (mergedConfig as DeepPartial<IConfig>)?.matching || {};
    const initialMatcher: DeepPartial<StringMatcherType | WordMatcherType> =
      matchingConfig?.matcher || {};

    if (matchingConfig) {
      if (initialMatcher?.type === "legacy") {
        mergedMatcher = removeUnknownProperties(initialMatcher, DEFAULT_STRING_MATCHER);
        mergedMatcher = mergeMissingProperties(mergedMatcher, [DEFAULT_STRING_MATCHER]);
      } else if (initialMatcher?.type === "word") {
        mergedMatcher = removeUnknownProperties(initialMatcher, DEFAULT_WORD_MATCHER);
        mergedMatcher = mergeMissingProperties(mergedMatcher, [DEFAULT_WORD_MATCHER]);
      } else {
        mergedMatcher = DEFAULT_WORD_MATCHER;
      }
      matchingConfig.matcher = mergedMatcher;
    }

    // Sync fs methods, since we will quit the program anyways

    if (configFile.endsWith(".json")) {
      const targetFile = configJSONFilename.replace(".json", ".merged.json");
      if (existsSync(targetFile)) {
        unlinkSync(targetFile);
      }
      writeFileSync(targetFile, stringifyFormatted(mergedConfig, ConfigFileFormat.JSON), "utf-8");
      logger.warn(
        `Your config file had an invalid schema. A clean version has been written to "${targetFile}".`
      );
      logger.warn(
        `Please verify you are ok with any changes, copy to "${configJSONFilename}" and restart.`
      );
    } else if (configFile.endsWith(".yaml")) {
      const targetFile = configYAMLFilename.replace(".yaml", ".merged.yaml");
      if (existsSync(targetFile)) {
        unlinkSync(targetFile);
      }
      writeFileSync(targetFile, stringifyFormatted(mergedConfig, ConfigFileFormat.YAML), "utf-8");
      logger.warn(
        `Your config file had an invalid schema. A clean version has been written to "${targetFile}".`
      );
      logger.warn(
        `Please verify you are ok with any changes, copy to "${configYAMLFilename}" and restart.`
      );
    }
  } catch (error) {
    handleError(
      "ERROR when writing a clean version of your config, you'll have to fix your config file manually",
      error
    );
  }
}

/**
 * @param config - the config to test
 * @returns if the config is all right to use
 * @throws
 */
export function checkConfig(config: IConfig): boolean {
  const validationError = isValidConfig(config);
  if (validationError !== true) {
    logger.warn(
      `Invalid config schema in "${validationError.location}". Double check your config has all the configurations listed in the guide (and remove old ones)`
    );
    logger.error(validationError.error.message);
    writeMergedConfig(config);
    throw validationError;
  }

  try {
    validateConfigExtra(config);
  } catch (err) {
    handleError(
      "Config schema is valid, but incorrectly used. Please check the config guide to make sure you are using correct values",
      err
    );
    throw err;
  }

  refreshClient(config);
  logger.debug("Refreshing logger");
  setLogger(createVaultLogger(config.log.level, config.log.writeFile));

  return true;
}

/**
 * @returns a function that will stop watching the config file
 */
export function watchConfig(): () => Promise<void> {
  const watcher = chokidar
    .watch(configFile, {
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    })
    .on("change", async () => {
      logger.info(`${configFile} changed, reloading...`);

      let newConfig = null as IConfig | null;

      try {
        if (configFile.endsWith(".json")) {
          newConfig = JSON.parse(await readFileAsync(configJSONFilename, "utf-8")) as IConfig;
        } else if (configFile.endsWith(".yaml")) {
          newConfig = YAML.parse(await readFileAsync(configYAMLFilename, "utf-8")) as IConfig;
        }
      } catch (error) {
        handleError(
          "Error loading new config, please fix it. Run your file through a linter before trying again (search for 'JSON/YAML linter' online).",
          error
        );
      }

      if (!newConfig) {
        logger.error("Couldn't load modified config, try again");
        return;
      }

      try {
        checkConfig(newConfig);
        loadedConfig = newConfig;
      } catch (err) {
        handleError("Couldn't load modified config, try again", err);
      }
    });

  return async (): Promise<void> => watcher.close();
}

export function resetLoadedConfig(): void {
  loadedConfig = null;
}
