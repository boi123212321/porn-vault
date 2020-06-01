import Movie from "../../types/movie";
import * as logger from "../../logger";
import { purgeMissingItems } from "../../types/missing_item";

export default {
  async emptyRecycleBin() {
    await purgeMissingItems();
    return true;
  },
};
