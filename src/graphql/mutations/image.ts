import * as database from "../../database";
import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { ReadStream, createWriteStream } from "fs";
import { extname } from "path";
import * as logger from "../../logger";
import { extractLabels, extractActors } from "../../extractor";
import { Dictionary, libraryPath, mapAsync } from "../../types/utility";
import Movie from "../../types/movie";
import Jimp from "jimp";
import { statAsync, unlinkAsync } from "../../fs/async";
import { getConfig } from "../../config";
import Studio from "../../types/studio";
import { indices } from "../../search/index";
import { createImageSearchDoc } from "../../search/image";

type IImageUpdateOpts = Partial<{
  name: string;
  rating: number;
  labels: string[];
  actors: string[];
  favorite: boolean;
  bookmark: boolean;
  studio: string | null;
  scene: string | null;
  customFields: Dictionary<string[] | boolean | string | null>;
  color: string | null;
}>;

const COLOR_HEX_STRING = /^#[a-f0-9]{6}$/;

function isHexColorString(str: string) {
  return COLOR_HEX_STRING.test(str);
}

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

    const config = getConfig();

    const { filename, mimetype, createReadStream } = await args.file;
    const ext = extname(filename);
    const fileNameWithoutExtension = filename.split(".")[0];

    let imageName = fileNameWithoutExtension;

    if (args.name) imageName = args.name;

    if (!mimetype.includes("image/")) throw new Error("Invalid file");

    const image = new Image(imageName);

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

    let processedExt = ".jpg";
    if (args.lossless === true) {
      processedExt = ".png";
    }

    const sourcePath = libraryPath(`images/${image._id}${processedExt}`);
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

    let actors = [] as string[];
    if (args.actors) {
      actors = args.actors;
    }

    let labels = [] as string[];
    if (args.labels) {
      labels = args.labels;
    }

    if (args.scene) {
      const scene = await Scene.getById(args.scene);

      if (scene) {
        image.scene = args.scene;

        const sceneActors = (await Scene.getActors(scene)).map(a => a._id);
        actors.push(...sceneActors);
        const sceneLabels = (await Scene.getLabels(scene)).map(a => a._id);
        labels.push(...sceneLabels);
      }
    }

    if (args.studio) {
      const studio = await Studio.getById(args.studio);
      if (studio) image.studio = args.studio;
    }

    // Extract actors
    const extractedActors = await extractActors(image.path);
    logger.log(`Found ${extractedActors.length} actors in image path.`);
    actors.push(...extractedActors);
    await Image.setActors(image, actors);

    // Extract labels
    const extractedLabels = await extractLabels(image.path);
    logger.log(`Found ${extractedLabels.length} labels in image path.`);
    labels.push(...extractedLabels);

    if (config.APPLY_ACTOR_LABELS === true) {
      logger.log("Applying actor labels to image");
      labels.push(
        ...(
          await Promise.all(
            extractedActors.map(async id => {
              const actor = await Actor.getById(id);
              if (!actor) return [];
              return (await Actor.getLabels(actor)).map(l => l._id);
            })
          )
        ).flat()
      );
    }

    await Image.setLabels(image, labels);

    // Done

    await database.insert(database.store.images, image);
    indices.images.add(await createImageSearchDoc(image));
    await unlinkAsync(outPath);
    logger.success(`Image '${imageName}' done.`);
    return image;
  },

  async updateImages(
    _,
    { ids, opts }: { ids: string[]; opts: IImageUpdateOpts }
  ) {
    const config = getConfig();
    const updatedImages = [] as Image[];

    for (const id of ids) {
      const image = await Image.getById(id);

      if (image) {
        if (Array.isArray(opts.actors)) {
          const actorIds = [...new Set(opts.actors)];
          await Image.setActors(image, actorIds);

          const existingLabels = (await Image.getLabels(image)).map(l => l._id);

          if (config.APPLY_ACTOR_LABELS === true) {
            const actors = (await mapAsync(actorIds, Actor.getById)).filter(
              Boolean
            ) as Actor[];
            const labelIds = actors.map(ac => ac.labels).flat();

            logger.log("Applying actor labels to image");
            await Image.setLabels(image, existingLabels.concat(labelIds));
          }
        } else {
          if (Array.isArray(opts.labels))
            await Image.setLabels(image, opts.labels);
        }

        if (typeof opts.bookmark == "boolean") image.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") image.favorite = opts.favorite;

        if (typeof opts.name == "string") image.name = opts.name.trim();

        if (typeof opts.rating == "number") image.rating = opts.rating;

        if (opts.studio !== undefined) image.studio = opts.studio;

        if (opts.scene !== undefined) image.scene = opts.scene;

        if (opts.color && isHexColorString(opts.color))
          image.color = opts.color;

        if (opts.customFields) {
          for (const key in opts.customFields) {
            const value =
              opts.customFields[key] !== undefined
                ? opts.customFields[key]
                : null;
            logger.log(`Set scene custom.${key} to ${value}`);
            opts.customFields[key] = value;
          }
          image.customFields = opts.customFields;
        }

        await database.update(database.store.images, { _id: image._id }, image);
        updatedImages.push(image);
        indices.images.update(image._id, await createImageSearchDoc(image));
      } else {
        throw new Error(`Image ${id} not found`);
      }
    }

    return updatedImages;
  },

  async removeImages(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const image = await Image.getById(id);

      if (image) {
        await Image.remove(image);
        indices.images.remove(image._id);
        await Actor.filterImage(image._id);
        await Scene.filterImage(image._id);
        await Label.filterImage(image._id);
        await Movie.filterImage(image._id);
        await database.remove(database.store.crossReferences, {
          from: image._id
        });
        await database.remove(database.store.crossReferences, {
          to: image._id
        });
      }
    }
    return true;
  }
};
