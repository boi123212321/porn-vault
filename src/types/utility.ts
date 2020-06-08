import * as path from "path";

import { getConfig } from "../config/index";
import * as logger from "../logger";
const shaModule = require("js-sha512") as {
  sha512: (str: string) => string;
};
export const sha512 = shaModule.sha512;

export type Dictionary<T> = Record<string, T>;

export function extensionFromUrl(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  return path.extname(clean);
}

export function validRating(val: unknown): boolean {
  return typeof val === "number" && val >= 0 && val <= 10 && Number.isInteger(val);
}

export function removeExtension(file: string): string {
  return file.replace(/\.[^/.]+$/, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createObjectSet<T extends Record<string, any>>(
  objs: T[],
  key: keyof T & string
): T[] {
  const dict = {} as { [key: string]: T };
  for (const obj of objs) {
    dict[obj[key]] = obj;
  }
  const set = [] as T[];
  for (const key in dict) {
    set.push(dict[key]);
  }
  return set;
}

export function isNumber(i: unknown): i is number {
  return typeof i === "number";
}

export function isBoolean(i: unknown): i is boolean {
  return typeof i === "boolean";
}

export function isValidUrl(str: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(str);
    return true;
  } catch (err) {
    logger.error(err);
    return false;
  }
}

export function libraryPath(str: string): string {
  return path.join(getConfig().LIBRARY_PATH, "library", str);
}

export function mapAsync<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => U | Promise<U>
): Promise<U[]> {
  return Promise.all(array.map(callbackfn));
}

export async function filterAsync<T>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => boolean | Promise<boolean>
): Promise<T[]> {
  const filterMap = await mapAsync(array, callbackfn);
  return array.filter((_value, index) => filterMap[index]);
}

export function isRegExp(regStr: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new RegExp(regStr);
    return true;
  } catch (e) {
    return false;
  }
}
