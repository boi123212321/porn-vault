import Marker from "../../types/marker";
import * as database from "../../database";
import CrossReference from "../../types/cross_references";

export default {
  async createMarker(
    _: any,
    { scene, name, time }: { scene: string; name: string; time: number }
  ) {
    const marker = new Marker(name, scene, time);
    await database.insert(database.store.markers, marker);

    const crossReference = new CrossReference(scene, marker._id);
    await database.insert(database.store.crossReferences, crossReference);

    return marker;
  },
  async removeMarkers(_: any, { ids }: { ids: string[] }) {
    for (const id of ids) {
      await Marker.remove(id);
    }
    return true;
  }
};
