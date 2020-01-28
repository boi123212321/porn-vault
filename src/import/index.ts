import { getConfig } from "../config";
import { walk, existsAsync, readFileAsync } from "../fs/async";
import { basename, extname } from "path";
import * as logger from "../logger/index";
import { libraryPath } from "../types/utility";
import YAML from "yaml";
import { verifyFileData } from "./verify";
import { createFromFileData } from "./create";
import { validateImportFile } from "./validate";
import { appendFileSync } from "fs";
import args from "../args";

// Previously imported files
let imported: string[] = [];

async function processFile(file: string) {
  let parsed = null as any;
  let fileContent = await readFileAsync(file, "utf-8");

  if (extname(file) == ".json") {
    try {
      parsed = JSON.parse(fileContent);
    } catch (error) {
      logger.error(`Broken import file: ${file}`);
      process.exit(1);
    }
  } else if (extname(file) == ".yaml" || extname(file) == ".yml") {
    try {
      parsed = YAML.parse(fileContent);
    } catch (error) {
      logger.error(`Broken import file: ${file}`);
      process.exit(1);
    }
  } else throw new Error(`Unsupported file type '${extname(file)}'.`);

  if (typeof parsed !== "object" || parsed === null)
    throw new Error(`${file}: Invalid import format.`);

  const errors = validateImportFile(JSON.parse(JSON.stringify(parsed)));
  if (errors.length) {
    logger.error(`Invalid structure of file: ${file}`);
    logger.error(errors);
    process.exit(1);
  }

  try {
    await verifyFileData(parsed);
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
  await createFromFileData(parsed);
}

export async function checkImportFolders() {
  logger.log("Checking imports...");

  const config = getConfig();
  const importedFile = libraryPath("imported.txt");

  try {
    if (await existsAsync(importedFile))
      imported = (await readFileAsync(importedFile, "utf-8")).split("\n");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }

  // Files to process
  const newFiles = [] as string[];

  logger.log(`Will ignore files: ${config.EXCLUDE_FILES}`);

  for (const folder of config.BULK_IMPORT_PATHS) {
    logger.log(`Checking import folder: ${folder}...`);
    await walk(folder, [".json", ".yaml"], async path => {
      if (basename(path).startsWith(".")) return;
      if (imported.includes(path)) return;
      newFiles.push(path);
      imported.push(path);
    });
  }

  logger.message(`Importing ${newFiles.length} new import files...`);

  for (const file of newFiles) {
    logger.log(`Reading import file: ${file}...`);
    try {
      await processFile(file);
      logger.message("Imported " + file);
      if (args["commit-import"]) appendFileSync(importedFile, file + "\n");
    } catch (err) {
      logger.error(`${file}: could not read file.`);
      logger.error(err.message);
      process.exit(1);
    }
  }
}
