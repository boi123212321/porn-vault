import { copyFile, readdir, readFile, stat, unlink, writeFile } from "fs";
import { extname, join, resolve } from "path";
import rimraf from "rimraf";
import { promisify } from "util";

import * as logger from "../logger";

export const statAsync = promisify(stat);
export const unlinkAsync = promisify(unlink);
export const readdirAsync = promisify(readdir);
export const readFileAsync = promisify(readFile);
export const writeFileAsync = promisify(writeFile);
export const copyFileAsync = promisify(copyFile);
export const rimrafAsync = promisify(rimraf);

const pathIsExcluded = (exclude: string[], path: string) =>
  exclude.some((regStr) => new RegExp(regStr, "i").test(path.toLowerCase()));

const validExtension = (exts: string[], path: string) => exts.includes(extname(path).toLowerCase());

export interface IWalkOptions {
  dir: string;
  extensions: string[];
  cb: (file: string) => void | Promise<void>;
  exclude: string[];
}

export async function walk(options: IWalkOptions): Promise<void> {
  const root = resolve(options.dir);

  const folderStack = [] as string[];
  folderStack.push(root);

  while (folderStack.length) {
    const top = folderStack.pop();
    if (!top) break;

    logger.log(`Walking folder ${top}`);
    let filesInDir: string[] = [];

    try {
      filesInDir = await readdirAsync(top);
    } catch (err) {
      logger.error(`Error reading contents of directory "${top}", skipping`);
      logger.error(err);
      continue;
    }

    for (const file of filesInDir) {
      const path = join(top, file);

      if (pathIsExcluded(options.exclude, path)) {
        logger.log(`"${path}" is excluded, skipping`);
        continue;
      }

      try {
        const stat = await statAsync(path);
        if (stat.isDirectory()) {
          logger.log(`Pushed folder ${path}`);
          folderStack.push(path);
        } else if (validExtension(options.extensions, file)) {
          logger.log(`Found file ${file}`);
          await options.cb(resolve(path));
        }
      } catch (err) {
        // Check if error was an fs permission error
        if (err.code && (err.code === "EACCES" || err.code === "EPERM")) {
          logger.error(`"${path}" requires elevated permissions, skipping`);
        } else {
          logger.error(`Error walking or in callback for "${path}", skipping`);
          logger.error(err);
        }
      }
    }
  }
}
