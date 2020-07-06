import { resolve } from "path";
import { mkdir } from "fs";
import { promisify } from "util";

// Assume these work perfectly
import { rimrafAsync, existsAsync } from "../src/fs/async";

export const mkdirAsync = promisify(mkdir);

export const TEST_TEMP_DIR = resolve(process.cwd(), "temp");

export async function createTempTestingDir() {
  if (!(await existsAsync(TEST_TEMP_DIR))) {
    await mkdirAsync(TEST_TEMP_DIR);
  }
}

export async function unlinkTempTestingDir() {
  if (await existsAsync(TEST_TEMP_DIR)) {
    await rimrafAsync(TEST_TEMP_DIR);
  }
}
