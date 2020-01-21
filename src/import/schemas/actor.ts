import Schema from "validate";
import {
  stringArray,
  limitRating,
  isValidDate,
  validCustomFields
} from "./common";

export const actorSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  aliases: stringArray(false),
  bornOn: {
    type: Number,
    required: false,
    use: { isValidDate }
  },
  thumbnail: {
    type: String,
    required: false
  },
  rating: {
    type: Number,
    required: false,
    use: { limitRating }
  },
  labels: stringArray(false),
  customFields: {
    required: false,
    type: Object,
    use: { validCustomFields }
  },
  bookmark: {
    required: false,
    type: Boolean
  },
  favorite: {
    required: false,
    type: Boolean
  }
});
