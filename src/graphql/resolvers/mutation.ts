import { database } from "../../database";
import Actor from "../../types/actor";
import Label from "../../types/label";
import { ReadStream, createWriteStream, statSync } from "fs";
import path, { extname } from "path";
import Scene from "../../types/scene";
import ffmpeg from "fluent-ffmpeg";
import * as logger from "../../logger";
import Image from "../../types/image";

interface HashMap<T> {
  [key: string]: T;
}

type AnyMap = HashMap<any>;

export default {
  async uploadScene(parent, args: AnyMap) {
    const { filename, mimetype, createReadStream } = await args.file;
    const ext = extname(filename);
    const fileNameWithoutExtension = filename.split(".")[0];

    let sceneName = fileNameWithoutExtension;

    if (args.name)
      sceneName = args.name;

    // !TODO check mimetype
    // !TODO check if ffmpeg/ffprobe exist

    const scene = new Scene(sceneName);

    const sourcePath = path.resolve(
      process.cwd(),
      `./library/scenes/${scene.id}${ext}`
    );
    scene.path = sourcePath;

    const read = createReadStream() as ReadStream;
    const write = createWriteStream(sourcePath);

    const pipe = read.pipe(write);

    await new Promise((resolve, reject) => {
      pipe.on("close", () => resolve());
    });

    // File written, now process
    logger.SUCCESS(`SUCCESS: File written to ${sourcePath}.`);

    await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(sourcePath, (err, data) => {
        const meta = data.streams[0];
        const { size } = statSync(sourcePath);

        if (meta) {
          scene.meta.dimensions = {
            width: meta.width,
            height: meta.height,
          }
          scene.meta.duration = parseInt(meta.duration);
        }
        else {
          logger.WARN("WARN: Could not get video meta data.");
        }

        scene.meta.size = size;
        resolve();
      })
    })

    if (args.actors) {
      scene.actors = args.actors;
    }

    /* if (args.labels) {
      scene.labels = args.labels;
    } */

    const thumbnailFiles = await scene.generateThumbnails();

    for (let i = 0; i < thumbnailFiles.length; i++) {
      const file = thumbnailFiles[i];
      const image = new Image(`${sceneName} ${i}`, file.path, scene.id);
      image.meta.size = file.size;
      image.actors = scene.actors;
      /* image.labels = scene.labels; */
      database
        .get('images')
        .push(image)
        .write();

      scene.images.push(image.id);
    }

    logger.SUCCESS(`SUCCESS: Created ${thumbnailFiles.length} images.`);

    database
      .get('scenes')
      .push(scene)
      .write();

    // Done

    logger.SUCCESS(`SUCCESS: Scene '${sceneName}' done.`);

    return scene;
  },
  addActor(parent, args: AnyMap) {
    const actor = new Actor(args.name, args.aliases)

    database
      .get('actors')
      .push(actor)
      .write();

    return actor;
  },
  addLabel(parent, args: AnyMap) {
    const label = new Label(args.name, args.aliases);

    database
      .get("labels")
      .push(label)
      .write();

    return label;
  },
}