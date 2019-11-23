import * as database from "../../database";
import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { ReadStream, createWriteStream } from "fs";
import { extname } from "path";
import * as logger from "../../logger";
import { extractLabels, extractActors } from "../../extractor";
import { Dictionary, libraryPath } from "../../types/utility";
import Movie from "../../types/movie";
import Jimp from "jimp";
import { statAsync, unlinkAsync } from "../../fs/async";

type IImageUpdateOpts = Partial<{
  name: string;
  rating: number;
  labels: string[];
  actors: string[];
  favorite: boolean;
  bookmark: boolean;
}>;

export default {
  async uploadImage(_, args: Dictionary<any>) {
    for (const actor of args.actors || []) {
      const actorInDb = await Actor.getById(actor);

      if (!actorInDb) throw new Error(`Actor ${actor} not found`);
    }

    for (const label of args.labels || []) {
      const labelInDb = await Label.getById(label);

      if (!labelInDb) throw new Error(`Label ${label} not found`);
    }

    if (args.scene) {
      const sceneInDb = await Scene.getById(args.scene);

      if (!sceneInDb) throw new Error(`Scene ${args.scene} not found`);
    }

    const { filename, mimetype, createReadStream } = await args.file;
    const ext = extname(filename);
    const fileNameWithoutExtension = filename.split(".")[0];

    let imageName = fileNameWithoutExtension;

    if (args.name) imageName = args.name;

    if (!mimetype.includes("image/")) throw new Error("Invalid file");

    const image = new Image(imageName);

    if (args.scene) image.scene = args.scene;

    const outPath = `tmp/${image._id}${ext}`;

    logger.log(`Getting file...`);

    const read = createReadStream() as ReadStream;
    const write = createWriteStream(outPath);

    const pipe = read.pipe(write);

    await new Promise((resolve, reject) => {
      pipe.on("close", () => resolve());
    });

    const { size } = await statAsync(outPath);
    image.meta.size = size;

    // File written, now process
    logger.success(`File written to ${outPath}.`);

    const sourcePath = await libraryPath(`images/${image._id}${ext}`);
    image.path = sourcePath;

    if (args.crop) {
      args.crop.left = Math.round(args.crop.left);
      args.crop.top = Math.round(args.crop.top);
      args.crop.width = Math.round(args.crop.width);
      args.crop.height = Math.round(args.crop.height);
    }

    // Process image
    {
      const _image = await Jimp.read(outPath);

      if (args.crop) {
        logger.log(`Cropping image...`);
        await _image
          .crop(
            args.crop.left,
            args.crop.top,
            args.crop.width,
            args.crop.height
          )
          .writeAsync(sourcePath);

        image.meta.dimensions.width = args.crop.width;
        image.meta.dimensions.height = args.crop.height;
      } else {
        image.meta.dimensions.width = _image.bitmap.width;
        image.meta.dimensions.height = _image.bitmap.height;
        await _image.writeAsync(sourcePath);
      }

      image.hash = _image.hash();

      logger.success(`Image processing done.`);
    }

    if (args.actors) {
      image.actors = args.actors;
    }

    // Extract actors
    const extractedActors = await extractActors(image.name);
    logger.log(`Found ${extractedActors.length} actors in image title.`);
    image.actors.push(...extractedActors);
    image.actors = [...new Set(image.actors)];

    if (args.labels) {
      image.labels = args.labels;
    }

    // Extract labels
    const extractedLabels = await extractLabels(image.name);
    logger.log(`Found ${extractedLabels.length} labels in image title.`);
    image.labels.push(...extractedLabels);
    image.labels = [...new Set(image.labels)];

    // Done

    await database.insert(database.store.images, image);
    await unlinkAsync(outPath);
    logger.success(`Image '${imageName}' done.`);
    return image;
  },

  async addActorsToImage(_, { id, actors }: { id: string; actors: string[] }) {
    const image = await Image.getById(id);

    if (image) {
      if (Array.isArray(actors)) image.actors.push(...actors);
      image.actors = [...new Set(image.actors)];
      await database.update(
        database.store.images,
        { _id: image._id },
        { $set: { actors: image.actors } }
      );
      return image;
    } else {
      throw new Error(`Image ${id} not found`);
    }
  },

  async updateImages(
    _,
    { ids, opts }: { ids: string[]; opts: IImageUpdateOpts }
  ) {
    const updatedImages = [] as Image[];

    for (const id of ids) {
      const image = await Image.getById(id);

      if (image) {
        if (Array.isArray(opts.actors)) image.actors = opts.actors;

        if (Array.isArray(opts.labels)) image.labels = opts.labels;

        if (typeof opts.bookmark == "boolean") image.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") image.favorite = opts.favorite;

        if (typeof opts.name == "string") image.name = opts.name;

        if (typeof opts.rating == "number") image.rating = opts.rating;

        await database.update(database.store.images, { _id: image._id }, image);
        updatedImages.push(image);
      } else {
        throw new Error(`Image ${id} not found`);
      }
    }

    return updatedImages;
  },

  async removeImages(
    _,
    { ids }: { ids: string[] }
  ) {
    for (const id of ids) {
      const image = await Image.getById(id);

      if (image) {
        await Image.remove(image);
        await Actor.filterImage(image._id);
        await Scene.filterImage(image._id);
        await Label.filterImage(image._id);
        await Movie.filterImage(image._id);
      }
    }
    return true;
  }
};
