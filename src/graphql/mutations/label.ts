import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { Dictionary } from "../../types/utility";
import { isMatchingItem } from "../../extractor";
import * as logger from "../../logger";
import { isBlacklisted, updateImages } from "../../search/image";
import LabelledItem from "../../types/labelled_item";
import { labelCollection } from "../../database";
import { updateScenes } from "../../search/scene";

type ILabelUpdateOpts = Partial<{
  name: string;
  aliases: string[];
  thumbnail: string;
}>;

export default {
  async removeLabels(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const label = await Label.getById(id);

      if (label) {
        await Label.remove(label._id);
        await LabelledItem.removeByLabel(id);
      }
    }
    return true;
  },

  async addLabel(_, args: Dictionary<any>) {
    const label = new Label(args.name, args.aliases);

    for (const scene of await Scene.getAll()) {
      if (isMatchingItem(scene.path || scene.name, label, false)) {
        const labels = (await Scene.getLabels(scene)).map((l) => l._id);
        labels.push(label._id);
        await Scene.setLabels(scene, labels);
        await updateScenes([scene]);
        logger.log(`Updated labels of ${scene._id}.`);
      }
    }

    /* for (const image of await Image.getAll()) {
      if (isBlacklisted(image.name)) continue;

      if (isMatchingItem(image.path || image.name, label, false)) {
        const labels = (await Image.getLabels(image)).map((l) => l._id);
        labels.push(label._id);
        await Image.setLabels(image, labels);
        await updateImages([image]);
        logger.log(`Updated labels of ${image._id}.`);
      }
    } */

    await labelCollection.upsert(label._id, label);
    return label;
  },

  async updateLabels(
    _,
    { ids, opts }: { ids: string[]; opts: ILabelUpdateOpts }
  ) {
    const updatedLabels = [] as Label[];

    for (const id of ids) {
      const label = await Label.getById(id);

      if (label) {
        if (Array.isArray(opts.aliases))
          label.aliases = [...new Set(opts.aliases)];

        if (typeof opts.name == "string") label.name = opts.name.trim();

        if (typeof opts.thumbnail == "string") label.thumbnail = opts.thumbnail;

        await labelCollection.upsert(label._id, label);
        updatedLabels.push(label);
      } else {
        throw new Error(`Label ${id} not found`);
      }
    }

    return updatedLabels;
  },
};
