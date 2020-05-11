import CustomField, {
  CustomFieldType,
  CustomFieldTarget,
} from "../../types/custom_field";
import { customFieldCollection } from "../../database";

export default {
  async updateCustomField(
    _,
    {
      id,
      name,
      values,
      unit,
    }: {
      id: string;
      name?: string | null;
      values?: string[] | null;
      unit?: string | null;
    }
  ) {
    const field = await CustomField.getById(id);

    if (field) {
      if (name) field.name = name;

      if (values && field.type.includes("SELECT")) {
        field.values = values;
      }

      if (field.unit !== undefined) field.unit = unit || null;

      await customFieldCollection.upsert(field._id, field);

      return field;
    } else throw new Error("Custom field not found");
  },
  async removeCustomField(_, { id }: { id: string }) {
    await CustomField.remove(id);

    return true;
  },
  async createCustomField(
    _,
    {
      name,
      target,
      type,
      values,
      unit,
    }: {
      name: string;
      target: CustomFieldTarget;
      type: CustomFieldType;
      values?: string[] | null;
      unit: string | null;
    }
  ) {
    const field = new CustomField(name, target, type);

    if (unit) field.unit = unit;

    if (
      type == CustomFieldType.SINGLE_SELECT ||
      type == CustomFieldType.MULTI_SELECT
    ) {
      if (values) field.values = values;
      else {
        throw new Error("Values have to be defined for select fields");
      }
    }

    await customFieldCollection.upsert(field._id, field);
    return field;
  },
};
