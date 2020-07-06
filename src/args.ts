import yargs from "yargs";

import * as logger from "./logger";

const argv = yargs
  .boolean("process-queue")
  .boolean("commit-import")
  .boolean("ignore-integrity")
  .boolean("skip-compaction")
  .boolean("update-izzy")
  .boolean("update-gianna")
  .number("index-slice-size").argv;
logger.log(argv);
export default argv;
