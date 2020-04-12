import { markerReferenceCollection } from "../database/index";
import { generateHash } from "../hash";

export default class MarkerReference {
  _id: string;
  scene: string;
  marker: string;

  constructor(scene: string, marker: string, type: string) {
    this._id = "mr_" + generateHash();
    this.scene = scene;
    this.marker = marker;
  }

  static async getAll() {
    return markerReferenceCollection.getAll();
  }

  static async getByMarker(label: string) {
    return markerReferenceCollection.query("marker-index", label);
  }

  static async getByScene(item: string) {
    return markerReferenceCollection.query("scene-index", item);
  }

  static async get(from: string, to: string) {
    const fromReferences = await markerReferenceCollection.query(
      "item-index",
      from
    );
    return fromReferences.find((r) => r.marker == to);
  }

  static async removeByMarker(id: string) {
    for (const ref of await MarkerReference.getByMarker(id)) {
      await MarkerReference.removeById(ref._id);
    }
  }

  static async removeByScene(id: string) {
    for (const ref of await MarkerReference.getByScene(id)) {
      await MarkerReference.removeById(ref._id);
    }
  }

  static async removeById(_id: string) {
    await markerReferenceCollection.remove(_id);
  }
}
