import yargs from "yargs";

const argv = yargs.boolean("commit-import").argv;
console.log(argv);
export default argv;
