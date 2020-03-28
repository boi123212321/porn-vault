import yargs from "yargs";
import * as logger from "./logger";

const argv = yargs
  .boolean("process-queue")
  .boolean("commit-import")
  .number("index-slice-size").argv;
logger.log(argv);
export default argv;
