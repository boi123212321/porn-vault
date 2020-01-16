import { IConfig } from "./config/index";
import { readFileAsync, existsAsync } from "./fs/async";
import axios from "axios";
import cheerio from "cheerio";
import { resolve } from "path";
import debug from "debug";
import ora from "ora";
import { Dictionary } from "./types/utility";
import * as logger from "./logger/index";
import moment from "moment";
import { mapAsync, filterAsync } from "./types/utility";

export async function runScrapersSerial(
  config: IConfig,
  event: string,
  inject?: Dictionary<any>
) {
  const result = {} as Dictionary<any>;
  if (!config.SCRAPE_EVENTS[event]) return result;

  for (const scraperName of config.SCRAPE_EVENTS[event]) {
    const scraperResult = await runScraper(config, scraperName, inject);
    Object.assign(result, scraperResult);
  }
  return result;
}

export async function runScraper(
  config: IConfig,
  scraperName: string,
  inject?: Dictionary<any>
) {
  const scraper = config.SCRAPERS[scraperName];
  const path = resolve(scraper.path);

  if (path) {
    if (!(await existsAsync(path)))
      throw new Error(`${scraperName}: definition not found (missing file).`);

    const fileContent = await readFileAsync(path, "utf-8");
    const func = eval(fileContent);
    try {
      const result = await func({
        axios,
        cheerio,
        moment,
        log: debug("porn:scraper"),
        ora,
        args: scraper.args,
        mapAsync,
        filterAsync,
        ...inject
      });

      if (typeof result !== "object")
        throw new Error(`${scraperName}: malformed output.`);

      return result || {};
    } catch (error) {
      logger.error(error);
      throw new Error("Scraper error");
    }
  } else {
    throw new Error(`${scraperName}: path not defined.`);
  }
}
