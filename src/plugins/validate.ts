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

  for (const event of Object.values(config.PLUGIN_EVENTS)) {
    for (const pluginName of event) {
      if (config.PLUGINS[pluginName] === undefined) {
        logger.error(`Undefined plugin '${pluginName}' in use.`);
        process.exit(1);
      }
    }
  }
}
