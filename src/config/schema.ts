import * as zod from "zod";

import { StringMatcherOptionsSchema, StringMatcherSchema } from "../matching/stringMatcher";
import { WordMatcherOptionsSchema, WordMatcherSchema } from "../matching/wordMatcher";
import { DeepPartial } from "../utils/types";

const pluginSchema = zod.object({
  path: zod.string(),
  args: zod.record(zod.any()).optional(),
});

export const ApplyActorLabelsEnum = zod.enum([
  "event:actor:create",
  "event:actor:update",
  "event:actor:find-unmatched-scenes",
  "plugin:actor:create",
  "plugin:actor:custom",
  "event:scene:create",
  "event:scene:update",
  "plugin:scene:create",
  "plugin:scene:custom",
  "event:image:create",
  "event:image:update",
]);

export const ApplyStudioLabelsEnum = zod.enum([
  "event:studio:create",
  "event:studio:update",
  "event:studio:find-unmatched-scenes",
  "plugin:studio:create",
  "plugin:studio:custom",
  "event:scene:create",
  "event:scene:update",
  "plugin:scene:create",
  "plugin:scene:custom",
]);

const logLevelType = zod.enum(["error", "warn", "info", "http", "verbose", "debug", "silly"]);

const configSchema = zod
  .object({
    search: zod.object({
      host: zod.string(),
      version: zod.string(),
      log: zod.boolean(),
      auth: zod.string().optional().nullable(),
    }),
    import: zod.object({
      videos: zod.array(zod.string()),
      images: zod.array(zod.string()),
    }),
    scan: zod.object({
      scanOnStartup: zod.boolean(),
      interval: zod.number().min(0),
      excludeFiles: zod.array(zod.string()),
    }),
    processing: zod.object({
      doProcessing: zod.boolean(),
      generateScreenshots: zod.boolean(),
      generatePreviews: zod.boolean(),
      screenshotInterval: zod.number().min(0),
      readImagesOnImport: zod.boolean(),
      imageCompressionSize: zod.number().min(60),
      generateImageThumbnails: zod.boolean(),
    }),
    persistence: zod.object({
      libraryPath: zod.string(),
      backup: zod.object({
        enable: zod.boolean(),
        maxAmount: zod.number().min(0),
      }),
    }),
    binaries: zod.object({
      ffmpeg: zod.string(),
      ffprobe: zod.string(),
      izzyPort: zod.number().min(1).max(65535),
    }),
    auth: zod.object({
      password: zod.string().nullable(),
    }),
    server: zod.object({
      port: zod.number().min(1).max(65535),
      https: zod.object({
        enable: zod.boolean(),
        key: zod.string().nullable(),
        certificate: zod.string().nullable(),
      }),
    }),
    matching: zod.object({
      applySceneLabels: zod.boolean(),
      applyActorLabels: zod.array(ApplyActorLabelsEnum),
      applyStudioLabels: zod.array(ApplyStudioLabelsEnum),
      extractSceneActorsFromFilepath: zod.boolean(),
      extractSceneLabelsFromFilepath: zod.boolean(),
      extractSceneMoviesFromFilepath: zod.boolean(),
      extractSceneStudiosFromFilepath: zod.boolean(),
      matcher: zod.union([StringMatcherSchema, WordMatcherSchema]),
      matchCreatedActors: zod.boolean(),
      matchCreatedStudios: zod.boolean(),
      matchCreatedLabels: zod.boolean(),
    }),
    plugins: zod.object({
      register: zod.record(pluginSchema),
      events: zod.record(zod.array(zod.string()) /* TODO: plugin call with arg */),

      allowSceneThumbnailOverwrite: zod.boolean(),
      allowActorThumbnailOverwrite: zod.boolean(),
      allowMovieThumbnailOverwrite: zod.boolean(),
      allowStudioThumbnailOverwrite: zod.boolean(),

      createMissingActors: zod.boolean(),
      createMissingStudios: zod.boolean(),
      createMissingLabels: zod.boolean(),
      createMissingMovies: zod.boolean(),
    }),
    log: zod.object({
      level: logLevelType,
      maxSize: zod.union([zod.number().min(0), zod.string()]),
      maxFiles: zod.union([zod.number().min(0), zod.string()]),
      writeFile: zod.array(
        zod.object({
          level: logLevelType,
          prefix: zod.string(),
          silent: zod.boolean(),
        })
      ),
    }),
  })
  .nonstrict();

export type IPlugin = zod.TypeOf<typeof pluginSchema>;
export type IConfig = zod.TypeOf<typeof configSchema>;

export function isValidConfig(val: unknown): true | { location: string; error: Error } {
  let generalError: Error | null = null;

  try {
    configSchema.parse(val);
  } catch (err) {
    generalError = err as Error;
  }

  try {
    const config = val as DeepPartial<IConfig>;
    if (!config?.matching?.matcher?.type) {
      throw new Error('Missing matcher type: "matching.matcher.type"');
    }
    if (!config?.matching?.matcher?.options) {
      throw new Error('Missing matcher options: "matching.matcher.options"');
    }
    if (config?.matching?.matcher?.type === "legacy") {
      StringMatcherOptionsSchema.parse(config?.matching?.matcher?.options);
    } else if (config?.matching?.matcher?.type === "word") {
      WordMatcherOptionsSchema.parse(config?.matching?.matcher?.options);
    } else {
      throw new Error('Invalid matcher type: "matching.matcher.type"');
    }
  } catch (err) {
    return {
      location: "matching.matcher",
      error: err as Error,
    };
  }

  return generalError ? { location: "root", error: generalError } : true;
}
