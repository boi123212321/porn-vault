import { labelCollection, labelledItemCollection } from "../database";
import { generateHash } from "../hash";
import * as logger from "../logger";
import LabelledItem from "./labelled_item";
import { mapAsync } from "./utility";

export default class Label {
  _id: string;
  name: string;
  aliases: string[] = [];
  addedOn = +new Date();
  thumbnail: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  static async checkIntegrity(): Promise<void> {}

  static async remove(_id: string): Promise<void> {
    await labelCollection.remove(_id);
  }

  static async setForItem(itemId: string, labelIds: string[], type: string): Promise<void> {
    const references = await LabelledItem.getByItem(itemId);

    const oldLabelReferences = references.map((r) => r._id);

    for (const id of oldLabelReferences) {
      await labelledItemCollection.remove(id);
    }

    for (const id of [...new Set(labelIds)]) {
      const labelledItem = new LabelledItem(itemId, id, type);
      logger.log("Adding label: " + JSON.stringify(labelledItem));
      await labelledItemCollection.upsert(labelledItem._id, labelledItem);
    }
  }

  static async getForItem(id: string): Promise<Label[]> {
    const references = await LabelledItem.getByItem(id);
    return (await mapAsync(references, (r) => Label.getById(r.label))).filter(Boolean) as Label[];
  }

  static async getById(_id: string): Promise<Label | null> {
    return await labelCollection.get(_id);
  }

  static async getAll(): Promise<Label[]> {
    return await labelCollection.getAll();
  }

  static async find(name: string): Promise<Label | undefined> {
    name = name.toLowerCase().trim();
    const allLabels = await Label.getAll();
    return allLabels.find((label) => label.name === name);
  }

  constructor(name: string, aliases: string[] = []) {
    this._id = "la_" + generateHash();
    this.name = name.trim();
    this.aliases = [...new Set(aliases.map((alias) => alias.toLowerCase().trim()))];
  }
}
