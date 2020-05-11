import Marker from "../../types/marker";
import * as database from "../../database";
// import MarkerReference from "../../types/marker_reference";
// import { markerReferenceCollection } from "../../database";
import LabelledItem from "../../types/labelled_item";
import { markerCollection } from "../../database";

interface ICreateMarkerArgs {
  scene: string;
  name: string;
  time: number;
  rating?: number | null;
  favorite?: boolean | null;
  bookmark?: number | null;
  labels?: string[] | null;
}

export default {
  async createMarker(
    _: any,
    { scene, name, time, rating, favorite, bookmark, labels }: ICreateMarkerArgs
  ) {
    const marker = new Marker(name, scene, time);

    if (Array.isArray(labels)) await Marker.setLabels(marker, labels);

    if (typeof rating == "number") {
      if (rating < 0 || rating > 10) throw new Error("BAD_REQUEST");
      marker.rating = rating;
    }

    if (typeof favorite == "boolean") marker.favorite = favorite;

    if (typeof bookmark == "number") marker.bookmark = bookmark;

    // await database.insert(database.store.markers, marker);
    await markerCollection.upsert(marker._id, marker);

    /* const reference = new MarkerReference(scene, marker._id, "marker");
    await markerReferenceCollection.upsert(reference._id, reference); */

    await Marker.createMarkerThumbnail(marker);

    return marker;
  },
  async removeMarkers(_: any, { ids }: { ids: string[] }) {
    for (const id of ids) {
      await Marker.remove(id);
      // await MarkerReference.removeByMarker(id);
      await LabelledItem.removeByItem(id);
    }
    return true;
  },
};
