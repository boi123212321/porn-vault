import Schema from "validate";
import { stringArray } from "./common";

export const labelSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  aliases: stringArray(false)
});
