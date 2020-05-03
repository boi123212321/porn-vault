import Schema from "validate";
import { stringArray, limitRating } from "./common";

export const markerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  scene: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: false,
    use: { limitRating },
  },
  bookmark: {
    required: false,
    type: Number,
  },
  favorite: {
    required: false,
    type: Boolean,
  },
  labels: stringArray(false),
});
