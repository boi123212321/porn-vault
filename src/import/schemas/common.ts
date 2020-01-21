import { Dictionary } from "../../types/utility";

export const isString = (i: any) => typeof i === "string";

export function validCustomFields(obj?: Dictionary<any> | null) {
  if (!obj) return true;
  return Object.values(obj).every(isString);
}

export function stringArray(required: boolean) {
  return {
    required,
    type: Array,
    each: { type: String }
  };
}

export function limitRating(i?: number | null) {
  if (!i) return true;
  return i >= 0 && i <= 10;
}

export const isValidDate = (i?: number | null) => {
  if (!i) return true;
  if (i < 0) return false;
  const d = new Date(i);
  return d instanceof Date && !isNaN(<any>d);
};
