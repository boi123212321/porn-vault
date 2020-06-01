export default class MissingScene {
  _id: string;
  path: string;
  constructor(_id: string, path: string) {
    this._id = _id;
    this.path = path;
  }
}

import { sceneCollection, missingSceneCollection } from "../database/index";
import Marker from "./marker";
import { removeSceneFromQueue } from "../queue/processing";
import LabelledItem from "./labelled_item";
import ActorReference from "./actor_reference";
import MovieScene from "./movie_scene";
import Image from "./image";
import { index as sceneIndex } from "../search/scene";
import * as logger from "../logger";
export async function purgeMissingItems() {
  const missingScenes = await missingSceneCollection.getAll();
  for (const missingScene of missingScenes) {
    logger.log(`Deleting missing scene ${missingScene.path}`);

    await sceneCollection
      .remove(missingScene._id)
      .catch(err =>
        logger.error(
          `Failed to remove ${missingScene._id} at path ${missingScene.path} from the sceneCollection. Error: ${err}`
        )
      );
    await sceneIndex.remove([missingScene._id]);
    await Image.filterScene(missingScene._id);

    // deletes associated images when user wishes.
    // No user option exists yet, enable this once user options are passed.
    if (false) {
      // code does NOT currently reach here ever
      for (const image of await Image.getByScene(missingScene._id)) {
        await Image.remove(image);
        await LabelledItem.removeByItem(image._id);
      }
      logger.success("Deleted images of scene " + missingScene._id);
    }
    await Marker.removeByScene(missingScene._id);
    await LabelledItem.removeByItem(missingScene._id);
    await ActorReference.removeByItem(missingScene._id);
    await MovieScene.removeByScene(missingScene._id);

    logger.log("Deleting scene from queue (if needed)");
    try {
      await removeSceneFromQueue(missingScene._id);
    } catch (err) {
      // Do nothing, does not matter if this fails
    }

    await missingSceneCollection.remove(missingScene._id);

    logger.success("Deleted scene " + missingScene._id);
  }
}
export async function resetMissingItems() {
  const missingScenes = await missingSceneCollection.getAll();
  logger.log(`Clearing Recycle Bin`);
  for (const missingScene of missingScenes) {
    await missingSceneCollection
      .remove(missingScene._id)
      .catch(err =>
        logger.error(
          `Failed to remove ${missingScene._id} at path ${missingScene.path} from the db. Error: ${err}`
        )
      );
  }
}
