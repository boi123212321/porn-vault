import { IConfig } from "../config/index";
import { existsAsync } from "../fs/async";
import axios from "axios";
import cheerio from "cheerio";
import debug from "debug";
import ora from "ora";
import { Dictionary, libraryPath } from "../types/utility";
import * as logger from "../logger";
import moment from "moment";
import * as fs from "fs";
import * as nodepath from "path";
import ffmpeg from "fluent-ffmpeg";
import jimp from "jimp";
import YAML from "yaml";
import inquirer from "inquirer";
import readline from "readline";
import * as os from "os";

function requireUncached(module: string) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

export async function runPluginsSerial(
  config: IConfig,
  event: string,
  inject?: Dictionary<any>
) {
  const result = {} as Dictionary<any>;
  if (!config.PLUGIN_EVENTS[event]) {
    logger.warn(`No plugins defined for event ${event}.`);
    return result;
  }

  let numErrors = 0;

  for (const pluginItem of config.PLUGIN_EVENTS[event]) {
    let pluginName;
    let pluginArgs;

    if (typeof pluginItem == "string") pluginName = pluginItem;
    else {
      pluginName = pluginItem[0];
      pluginArgs = pluginItem[1];
    }

    logger.message(`Running plugin ${pluginName}:`);
    try {
      const pluginResult = await runPlugin(config, pluginName, {
        data: JSON.parse(JSON.stringify(result)),
        event,
        ...inject,
        pluginArgs,
      });
      Object.assign(result, pluginResult);
    } catch (error) {
      logger.log(error);
      logger.error(error.message);
      numErrors++;
    }
  }
  logger.log(`Plugin run over...`);
  if (!numErrors)
    logger.success(
      `Ran successfully ${config.PLUGIN_EVENTS[event].length} plugins.`
    );
  else
    logger.warn(
      `Ran ${config.PLUGIN_EVENTS[event].length} plugins with ${numErrors} errors.`
    );
  return result;
}

export async function runPlugin(
  config: IConfig,
  pluginName: string,
  inject?: Dictionary<any>,
  args?: Dictionary<any>
) {
  const plugin = config.PLUGINS[pluginName];

  if (!plugin) throw new Error(`${pluginName}: plugin not found.`);

  const path = nodepath.resolve(plugin.path);

  if (path) {
    if (!(await existsAsync(path)))
      throw new Error(`${pluginName}: definition not found (missing file).`);

    const func = requireUncached(path);

    if (typeof func != "function")
      throw new Error(`${pluginName}: not a valid plugin.`);

    logger.log(plugin);

    try {
      const result = await func({
        $pluginPath: path,
        $cwd: process.cwd(),
        $library: libraryPath(""),
        /* $modules: {
          ...
          fs: fs,
          path: nodepath,
          axios: axios,
          cheerio: cheerio,
          moment: moment
        }, */
        // TODO: deprecate at some point, replace with ^
        $require: (partial: string) => {
          if (typeof partial != "string")
            throw new TypeError("$require: String required");
          return requireUncached(nodepath.resolve(path, partial));
        },
        $os: os,
        $readline: readline,
        $inquirer: inquirer,
        $yaml: YAML,
        $jimp: jimp,
        $ffmpeg: ffmpeg,
        $fs: fs,
        $path: nodepath,
        $axios: axios,
        $cheerio: cheerio,
        $moment: moment,
        $log: debug("vault:plugin"),
        $loader: ora,
        $throw: (str: string) => {
          throw new Error(str);
        },
        args: args || plugin.args || {},
        ...inject,
      });

      if (typeof result !== "object")
        throw new Error(`${pluginName}: malformed output.`);

      return result || {};
    } catch (error) {
      throw new Error(error);
    }
  } else {
    throw new Error(`${pluginName}: path not defined.`);
  }
}
