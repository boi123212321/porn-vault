import readline from "readline";
import * as fs from "fs";
import { libraryPath } from "../types/utility";

function getType(from) {
  if (from.startsWith("ac_")) return "actor";
  if (from.startsWith("sc_")) return "scene";
  if (from.startsWith("im_")) return "image";
  if (from.startsWith("st_")) return "studio";
  if (from.startsWith("mk_")) return "marker";
  return "unknown";
}

const files = [
  ["marker_references.db", "mr_"],
  ["actor_references.db", "ar_"],
  ["movie_scenes.db", "ms_"],
  ["labelled_items.db", "li_"],
];

/* function transferMarkerReferences(obj) {
  fs.appendFileSync(
    libraryPath("marker_references.db"),
    JSON.stringify({
      _id: obj._id.replace("cr_", "mr_"),
      scene: obj.from,
      marker: obj.to,
    }) + "\n"
  );
} */

function transferActorReferences(obj) {
  fs.appendFileSync(
    libraryPath("actor_references.db"),
    JSON.stringify({
      _id: obj._id.replace("cr_", "ar_"),
      item: obj.from,
      actor: obj.to,
      type: getType(obj.from),
    }) + "\n"
  );
}

function transferMovieScene(obj) {
  fs.appendFileSync(
    libraryPath("movie_scenes.db"),
    JSON.stringify({
      _id: obj._id.replace("cr_", "ms_"),
      movie: obj.from,
      scene: obj.to,
    }) + "\n"
  );
}

function transferLabel(obj) {
  fs.appendFileSync(
    libraryPath("labelled_items.db"),
    JSON.stringify({
      _id: obj._id.replace("cr_", "li_"),
      item: obj.from,
      label: obj.to,
      type: getType(obj.from),
    }) + "\n"
  );
}

export function convertCrossReferences() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(libraryPath("cross_references.db")),
    });

    let lineCount = 0;
    rl.on("line", (line) => {
      lineCount++;
      if (lineCount % 1000 == 0) {
        console.log(`Line ${lineCount}`);
      }
      if (line.length) {
        const obj = JSON.parse(line);
        if (obj.$$indexCreated) return;

        if (obj.$$deleted) {
          for (const file of files)
            fs.appendFileSync(
              libraryPath(file[0]),
              JSON.stringify({
                _id: obj._id.replace("cr_", file[1]),
                $$deleted: true,
              }) + "\n"
            );
          return;
        }

        try {
          if (obj.to.startsWith("la_")) return transferLabel(obj);
          if (obj.from.startsWith("mo_")) return transferMovieScene(obj);
          if (obj.to.startsWith("ac_")) return transferActorReferences(obj);
          // if (obj.to.startsWith("mk_")) return transferMarkerReferences(obj);
        } catch (error) {
          console.error(error.message, line);
          process.exit(1);
        }
      }
    });

    rl.on("close", resolve);
  });
}
