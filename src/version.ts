import axios from "axios";
import * as logger from "./logger/index";

const LOCAL_VERSION = "0.2.2";

export async function newerVersionAvailable() {
  const originVersion = await getOriginVersion();

  return (
    LOCAL_VERSION.localeCompare(originVersion, undefined) < 0
  );
}

export async function getOriginVersion() {
  const res = await axios.get(
    "https://api.github.com/repos/boi123212321/porn-manager/releases"
  );
  return res.data[0].tag_name;
}

newerVersionAvailable()
  .then(yes => {
    if (yes)
      logger.warn(
        "Newer version available, check out https://github.com/boi123212321/porn-manager"
      );
  })
  .catch(err => {});

export default LOCAL_VERSION;
