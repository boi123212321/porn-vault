import { getConfig } from "../config/index";
import * as path from "path";
import * as logger from "../logger";

export type Dictionary<T> = Record<string, T>;

export function removeExtension(file: string) {
  return file.replace(/\.[^/.]+$/, "");
}

export function createObjectSet<T extends Record<string, any>>(
  objs: T[],
  key: keyof T & string
) {
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

export function isNumber(i: any): i is number {
  return typeof i === "number";
}

export function isBoolean(i: any): i is boolean {
  return typeof i === "boolean";
}

export function isValidUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch (err) {
    logger.error(err);
    return false;
  }
}

export function libraryPath(str: string) {
  return path.join(getConfig().LIBRARY_PATH, "library", str);
}

export function mapAsync<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<U>
): Promise<U[]> {
  return Promise.all(array.map(callbackfn));
}

export async function filterAsync<T>(
  array: T[],
  callbackfn: (value: T, index: number, array: T[]) => Promise<boolean>
): Promise<T[]> {
  const filterMap = await mapAsync(array, callbackfn);
  return array.filter((_value, index) => filterMap[index]);
}

export function isRegExp(regStr: string) {
  try {
    new RegExp(regStr);
  } catch (e) {
    return false;
  }
  return true;
}
