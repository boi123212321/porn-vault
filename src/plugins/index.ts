import axios from "axios";
import boxen from "boxen";
import cheerio from "cheerio";
import debug from "debug";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import { existsSync } from "fs";
import inquirer from "inquirer";
import jimp from "jimp";
import moment from "moment";
import ora from "ora";
import * as os from "os";
import * as nodepath from "path";
import readline from "readline";
import YAML from "yaml";

import { IConfig } from "../config/index";
import * as logger from "../logger";
import { Dictionary, libraryPath } from "../types/utility";

function requireUncached(module: string): unknown {
  delete require.cache[require.resolve(module)];
  return <unknown>require(module);
}

export async function runPluginsSerial(
  config: IConfig,
  event: string,
  inject?: Dictionary<unknown>
): Promise<Record<string, unknown>> {
  const result = {} as Dictionary<unknown>;
  if (!config.PLUGIN_EVENTS[event]) {
    logger.warn(`No plugins defined for event ${event}.`);
    return result;
  }

  let numErrors = 0;

  for (const pluginItem of config.PLUGIN_EVENTS[event]) {
    let pluginName: string;
    let pluginArgs: Record<string, unknown> | undefined;

    if (typeof pluginItem === "string") pluginName = pluginItem;
    else {
      pluginName = pluginItem[0];
      pluginArgs = pluginItem[1];
    }

    logger.message(`Running plugin ${pluginName}:`);
    try {
      const pluginResult = await runPlugin(config, pluginName, {
        data: <typeof result>JSON.parse(JSON.stringify(result)),
        event,
        ...inject,
        pluginArgs,
      });
      Object.assign(result, pluginResult);
    } catch (error) {
      const _err = <Error>error;
      logger.log(_err);
      logger.error(_err.message);
      numErrors++;
    }
  }
  logger.log(`Plugin run over...`);
  if (!numErrors) logger.success(`Ran successfully ${config.PLUGIN_EVENTS[event].length} plugins.`);
  else logger.warn(`Ran ${config.PLUGIN_EVENTS[event].length} plugins with ${numErrors} errors.`);
  return result;
}

export async function runPlugin(
  config: IConfig,
  pluginName: string,
  inject?: Dictionary<unknown>,
  args?: Dictionary<unknown>
): Promise<unknown> {
  const plugin = config.PLUGINS[pluginName];

  if (!plugin) throw new Error(`${pluginName}: plugin not found.`);

  const path = nodepath.resolve(plugin.path);

  if (path) {
    if (!existsSync(path)) throw new Error(`${pluginName}: definition not found (missing file).`);

    const func = requireUncached(path);

    if (typeof func !== "function") throw new Error(`${pluginName}: not a valid plugin.`);

    logger.log(plugin);

    try {
      const result = (await func({
        $pluginName: pluginName,
        $pluginPath: path,
        $cwd: process.cwd(),
        $library: libraryPath(""),
        $require: (partial: string) => {
          if (typeof partial != "string")
            throw new TypeError("$require: String required");
          return requireUncached(nodepath.resolve(path, partial));
        },
        /* $modules: {
          ...
          fs: fs,
          path: nodepath,
          axios: axios,
          cheerio: cheerio,
          moment: moment
        }, */
        // TODO: deprecate at some point, replace with ^
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
        $boxen: boxen,
        $throw: (str: string) => {
          throw new Error(str);
        },
        args: args || plugin.args || {},
        ...inject,
      })) as unknown;

      if (typeof result !== "object") throw new Error(`${pluginName}: malformed output.`);

      return result || {};
    } catch (error) {
      throw new Error(error);
    }
  } else {
    throw new Error(`${pluginName}: path not defined.`);
  }
}
