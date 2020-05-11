import * as logger from "./logger";
import fs from "fs";
import readline from "readline";

export function bookmarksToTimestamp(file: string) {
  if (!fs.existsSync(file)) return;

  let lines = [] as string[];
  let modified = false;

  logger.log("Replacing bookmarks with timestamps in " + file);

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: readStream,
      output: process.stdout,
      terminal: false,
    });

    rl.on("line", (line) => {
      const item = JSON.parse(line);
      if (item.bookmark !== undefined) {
        if (typeof item.bookmark == "boolean") {
          if (item.bookmark) item.bookmark = item.addedOn;
          else item.bookmark = null;
          modified = true;
        }
      }
      /* else {
        logger.log("Bookmarks already timestamp... aborting");
        rl.removeAllListeners();
        return rl.close();
      }*/
      lines.push(JSON.stringify(item));
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
