import fs from "fs";
import * as nodepath from "path";
import readline from "readline";

import * as logger from "./logger";

export function transformFile(file: string, cb: (str: string) => string | false): Promise<void> {
  return new Promise((resolve) => {
    if (!fs.existsSync(file)) return resolve();

    const lines = [] as string[];
    let modified = false;

    const readStream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: readStream,
      output: process.stdout,
      terminal: false,
    });

    rl.on("line", (line: string) => {
      const result = cb(line);
      if (typeof result === "string") {
        modified = true;
        lines.push(result);
      } else {
        lines.push(line);
      }
    });

    rl.on("close", () => {
      readStream.removeAllListeners();
      readStream.close();
      if (modified) {
        fs.unlinkSync(file);
        for (const line of lines) {
          fs.appendFileSync(file, line + "\n");
        }
      }
      resolve();
    });
  });
}

export async function absolutifyPaths(file: string): Promise<void> {
  logger.log("Absolutifying paths in " + file);
  await transformFile(file, (line) => {
    const item = JSON.parse(line) as { path?: string | null };
    if (item.path && !nodepath.isAbsolute(item.path)) {
      item.path = nodepath.resolve(item.path);
      return JSON.stringify(item);
    }
    return false;
  });
}

export async function bookmarksToTimestamp(file: string): Promise<void> {
  logger.log("Replacing bookmarks with timestamps in " + file);
  await transformFile(file, (line) => {
    const item = JSON.parse(line) as {
      bookmark?: number | boolean | null;
      addedOn: number;
    };
    if (item.bookmark !== undefined) {
      if (typeof item.bookmark === "boolean") {
        if (item.bookmark) item.bookmark = item.addedOn;
        else item.bookmark = null;
        return JSON.stringify(item);
      }
    }
    return false;
  });
}
