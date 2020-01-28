import Schema from "validate";
import {
  stringArray,
  limitRating,
  isValidDate,
  validCustomFields
} from "./common";

export const sceneSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  thumbnail: {
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
  actors: stringArray(false),
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
