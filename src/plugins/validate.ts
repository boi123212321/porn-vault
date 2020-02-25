import { IConfig } from "../config/index";
import { existsSync } from "fs";
import { isDirectory } from "../fs/index";
import * as logger from "../logger";

export function checkUnusedPlugins(config: IConfig) {
  for (const pluginName of Object.keys(config.PLUGINS)) {
    let pluginUsed = false;
    for (const event of Object.values(config.PLUGIN_EVENTS)) {
      if (event.some(name => name == pluginName)) pluginUsed = true;
    }
    if (!pluginUsed) logger.warn(`Unused plugin '${pluginName}'.`);
  }
}

export function validatePlugins(config: IConfig) {
  for (const name in config.PLUGINS) {
    const plugin = config.PLUGINS[name];
    const path = plugin.path;

    if (!path) {
      logger.error(`Missing plugin path for '${name}'.`);
      process.exit(1);
    }

    if (!existsSync(path) || isDirectory(path)) {
      logger.error(`Plugin definition for '${name}' not found (missing file).`);
      process.exit(1);
    }

    if (plugin.args) {
      if (plugin.args === null || typeof plugin.args != "object") {
        logger.error(`Invalid arguments for ${name}.`);
        process.exit(1);
      }
    }
  }

  for (const eventName in config.PLUGIN_EVENTS) {
    const event = config.PLUGIN_EVENTS[eventName];
    for (const pluginItem of event) {
      if (typeof pluginItem == "string") {
        const pluginName = pluginItem;
        if (config.PLUGINS[pluginName] === undefined) {
          logger.error(
            `Undefined plugin '${pluginName}' in use in event '${eventName}'.`
          );
          process.exit(1);
        }
      } else if (Array.isArray(pluginItem) && pluginItem.length == 2) {
        const pluginName = pluginItem[0];
        const pluginArgs = pluginItem[1];

        if (config.PLUGINS[pluginName] === undefined) {
          logger.error(
            `Undefined plugin '${pluginName}' in use in event '${eventName}'.`
          );
          process.exit(1);
        }

        if (!pluginArgs) {
          logger.error(`Invalid arguments for '${pluginName}'.`);
          process.exit(1);
        }

        if (typeof pluginArgs != "object") {
          logger.error(`Invalid arguments for '${pluginName}'.`);
          process.exit(1);
        }
      } else {
        logger.error(`Invalid plugin use in event '${eventName}'`);
        process.exit(1);
      }
    }
  }
}
