import { basename, extname } from "path";

import { getConfig } from "../../config";
import { fileIsExcluded } from "../../types/utility";
import { SUPPORTED_VIDEO_EXTENSIONS } from "../constants";

export function isImportableVideo(path) {
  const config = getConfig();

  return (
    SUPPORTED_VIDEO_EXTENSIONS.includes(extname(path)) &&
    !basename(path).startsWith(".") &&
    !fileIsExcluded(config.EXCLUDE_FILES, path)
  );
}
