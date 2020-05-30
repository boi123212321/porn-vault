// export interface IMissingSceneItem {
//   _id: string;
//   path: string;
// }

export default class MissingScene {
  _id: string;
  path: string;
  constructor(_id: string, path: string) {
    this._id = _id;
    this.path = path;
  }
}

import { sceneCollection, missingSceneCollection } from "../database/index";
import * as logger from "../logger";
export async function purgeMissingScenes() {
  const items = await missingSceneCollection.getAll();
  items.forEach(async item => {
    await sceneCollection
      .remove(item._id)
      .catch(err =>
        logger.error(
          `Failed to remove ${item._id} at path ${item.path} from the db. Error: ${err}`
        )
      );
    await missingSceneCollection.remove(item._id);
  });
}
export async function resetMissingScenes() {
  const items = await missingSceneCollection.getAll();
  items.forEach(async item => {
    await missingSceneCollection.remove(item._id);
  });
}
