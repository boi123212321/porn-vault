import Schema from "validate";
import { stringArray } from "./common";
import { CustomFieldType } from "../../types/custom_field";

export const customFieldSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: Object.keys(CustomFieldType)
  },
  values: {
    ...stringArray(false)
  }
});
