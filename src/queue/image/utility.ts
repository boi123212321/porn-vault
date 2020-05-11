import Jimp from "jimp";
import { basename, extname } from "path";

import { getConfig } from "../../config";
import { imageCollection } from "../../database";
import { extractActors, extractLabels, extractScenes } from "../../extractor";
import * as logger from "../../logger";
import { indexImages } from "../../search/image";
import Image from "../../types/image";
import { fileIsExcluded } from "../../types/utility";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../constants";

export function isImportableImage(path) {
  const config = getConfig();

  return (
    SUPPORTED_IMAGE_EXTENSIONS.includes(extname(path)) &&
    !basename(path).startsWith(".") &&
    !fileIsExcluded(config.EXCLUDE_FILES, path)
  );
}
export async function imageWithPathExists(path: string) {
  const image = await Image.getImageByPath(path);
  return !!image;
}

export async function processImage(imagePath: string, readImage = true) {
  try {
    const imageName = basename(imagePath);
    const image = new Image(imageName);
    image.path = imagePath;

    if (readImage) {
      const jimpImage = await Jimp.read(imagePath);
      image.meta.dimensions.width = jimpImage.bitmap.width;
      image.meta.dimensions.height = jimpImage.bitmap.height;
      image.hash = jimpImage.hash();
    }

    // Extract scene
    const extractedScenes = await extractScenes(imagePath);
    logger.log(`Found ${extractedScenes.length} scenes in image path.`);
    image.scene = extractedScenes[0] || null;

    // Extract actors
    const extractedActors = await extractActors(imagePath);
    logger.log(`Found ${extractedActors.length} actors in image path.`);
    await Image.setActors(image, [...new Set(extractedActors)]);

    // Extract labels
    const extractedLabels = await extractLabels(imagePath);
    logger.log(`Found ${extractedLabels.length} labels in image path.`);
    await Image.setLabels(image, [...new Set(extractedLabels)]);

    // await database.insert(database.store.images, image);
    await imageCollection.upsert(image._id, image);
    await indexImages([image]);
    logger.success(`Image '${imageName}' done.`);
  } catch (error) {
    logger.error(error);
    logger.error(`Failed to add image '${imagePath}'.`);
  }
}
