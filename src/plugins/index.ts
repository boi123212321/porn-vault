import { IConfig } from "../config/index";
import { readFileAsync, existsAsync } from "../fs/async";
import axios from "axios";
import cheerio from "cheerio";
import debug from "debug";
import ora from "ora";
import { Dictionary } from "../types/utility";
import * as logger from "../logger";
import moment from "moment";
import { mapAsync, filterAsync } from "../types/utility";
import * as fs from "fs";
import * as nodepath from "path";
import ffmpeg from "fluent-ffmpeg";

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
        event,
        ...inject,
        pluginArgs
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

    const fileContent = await readFileAsync(path, "utf-8");
    const func = eval(fileContent);

    logger.log(plugin);

    try {
      const result = await func({
        // TODO: cross plugin call?
        /* $plugin: async (name: string, args?: Dictionary<any>) => {
          logger.log(`Calling plugin ${name} from ${pluginName}`);
          return await runPlugin(config, name, inject, args || {});
        }, */
        /* $modules: {
          fs: fs,
          path: nodepath,
          axios: axios,
          cheerio: cheerio,
          moment: moment
        }, */
        // TODO: deprecate at some point, replace with ^
        $ffmpeg: ffmpeg,
        $fs: fs,
        $path: nodepath,
        $axios: axios,
        $cheerio: cheerio,
        $moment: moment,
        $log: debug("porn:plugin"),
        $loader: ora,
        $throw: (str: string) => {
          throw new Error(str);
        },
        // TODO: deprecate at some point, or move into util object
        $async: {
          map: mapAsync,
          filter: filterAsync
        },
        args: args || plugin.args || {},
        ...inject
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
