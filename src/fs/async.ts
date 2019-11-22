import { exists, stat, unlink, readdir, readFile, writeFile } from "fs";
import { promisify } from "util";
import { join, extname } from "path";

export const existsAsync = promisify(exists);
export const statAsync = promisify(stat);
export const unlinkAsync = promisify(unlink);
export const readdirAsync = promisify(readdir);
export const readFileAsync = promisify(readFile);
export const writeFileAsync = promisify(writeFile);

export async function walk(dir: string, exts = [] as string[]) {
  const files = [] as string[];

  const filesInDir = await readdirAsync(dir);

  for (const file of filesInDir) {
    const path = join(dir, file);
    const stat = await statAsync(path);

    if (stat.isDirectory()) {
      files.push(...(await walk(path, exts)));
    } else files.push(path);
  }

  return files.filter(file => exts.includes(extname(file)));
}
