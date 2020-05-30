import Movie from "../../types/movie";
import * as logger from "../../logger";
import { purgeMissingScenes } from "../../types/missing_scene";

export default {
  async emptyRecycleBin() {
    await purgeMissingScenes();
    return true;
  },
};
