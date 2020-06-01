export default class MissingScene {
  _id: string;
  path: string;
  constructor(_id: string, path: string) {
    this._id = _id;
    this.path = path;
  }
}

import { sceneCollection, missingSceneCollection } from "../database/index";
import Marker from "../types/marker";
import { removeSceneFromQueue } from "../queue/processing";
import LabelledItem from "../types/labelled_item";
import ActorReference from "../types/actor_reference";
import MovieScene from "../types/movie_scene";
import Image from "../types/image";
import { index as sceneIndex } from "../search/scene";
import * as logger from "../logger";
export async function purgeMissingScenes() {
  const items = await missingSceneCollection.getAll();
  for (const [key, item] of items.entries()) {
    logger.log(`Deleting missing scene ${item.path}`);

    await sceneCollection
      .remove(item._id)
      .catch(err =>
        logger.error(
          `Failed to remove ${item._id} at path ${item.path} from the sceneCollection. Error: ${err}`
        )
      );
    await sceneIndex.remove([item._id]);
    await Image.filterScene(item._id);

    // deletes associated images when user wishes.
    // No user option exists yet, enable this once user options are passed.
    if (false) {
      for (const image of await Image.getByScene(item._id)) {
        await Image.remove(image);
        await LabelledItem.removeByItem(image._id);
      }
      logger.success("Deleted images of scene " + item._id);
    }
    await Marker.removeByScene(item._id);
    await LabelledItem.removeByItem(item._id);
    await ActorReference.removeByItem(item._id);
    await MovieScene.removeByScene(item._id);

    logger.log("Deleting scene from queue (if needed)");
    try {
      await removeSceneFromQueue(item._id);
    } catch (err) {}

    await missingSceneCollection.remove(item._id);

    logger.success("Deleted scene " + item._id);
  }
}
export async function resetMissingScenes() {
  const items = await missingSceneCollection.getAll();
  logger.log(`Clearing Recycle Bin`);
  for (const [key, item] of items.entries()) {
    await missingSceneCollection
      .remove(item._id)
      .catch(err =>
        logger.error(
          `Failed to remove ${item._id} at path ${item.path} from the db. Error: ${err}`
        )
      );
  }
}
