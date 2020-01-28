import yargs from "yargs";
import * as logger from "./logger/index";

const argv = yargs.boolean("commit-import").argv;
logger.log(argv);
export default argv;
