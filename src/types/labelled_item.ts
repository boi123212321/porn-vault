import { labelledItemCollection } from "../database/index";
import { generateHash } from "../hash";

export default class LabelledItem {
  _id: string;
  label: string;
  item: string;
  type: string;

  constructor(item: string, label: string, type: string) {
    this._id = "li_" + generateHash();
    this.item = item;
    this.label = label;
    this.type = type;
  }

  static async getAll() {
    return labelledItemCollection.getAll();
  }

  static async getByLabel(label: string) {
    return labelledItemCollection.query("label-index", label);
  }

  static async getByItem(item: string) {
    return labelledItemCollection.query("item-index", item);
  }

  static async getByType(type: string) {
    return labelledItemCollection.query("type-index", type);
  }

  static async get(from: string, to: string) {
    const fromReferences = await labelledItemCollection.query(
      "item-index",
      from
    );
    return fromReferences.find((r) => r.label == to);
  }

  static async removeByLabel(id: string) {
    for (const ref of await LabelledItem.getByLabel(id)) {
      await LabelledItem.removeById(ref._id);
    }
  }

  static async removeByItem(id: string) {
    for (const ref of await LabelledItem.getByItem(id)) {
      await LabelledItem.removeById(ref._id);
    }
  }

  static async removeById(_id: string) {
    await labelledItemCollection.remove(_id);
  }
}
