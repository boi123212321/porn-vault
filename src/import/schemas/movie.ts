import Schema from "validate";
import {
  stringArray,
  limitRating,
  isValidDate,
  validCustomFields
} from "./common";

export const movieSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  frontCover: {
    type: String,
    required: false
  },
  backCover: {
    type: String,
    required: false
  },
  studio: {
    type: String,
    required: false
  },
  releaseDate: {
    type: Number,
    required: false,
    use: { isValidDate }
  },
  rating: {
    type: Number,
    required: false,
    use: { limitRating }
  },
  scenes: stringArray(false),
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
