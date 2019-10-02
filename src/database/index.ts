const lowdb = require("lowdb");
import FileSync from "lowdb/adapters/FileSync";

const adapter = new FileSync('db.json');
const database = lowdb(adapter);

database
  .defaults({
    actors: [],
    labels: [],
    scenes: [],
    images: [],

    settings: {
      LIBRARY_PATH: "./"
    }
  })
  .write()

export { database };