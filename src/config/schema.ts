import * as zod from "zod";

const pluginSchema = zod.object({
  path: zod.string(),
  args: zod.record(zod.any()).optional(),
});

const configSchema = zod
  .object({
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
      giannaPort: zod.number().min(1).max(65535),
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
      applyActorLabels: zod.boolean(),
      applyStudioLabels: zod.boolean(),
    }),
    plugins: zod.object({
      register: zod.record(pluginSchema),
      events: zod.record(zod.array(zod.string()) /* TODO: plugin call with arg */),

      allowSceneThumbnailOverwrite: zod.boolean(),
      allowActorThumbnailOverwrite: zod.boolean(),
      allowMovieThumbnailOverwrite: zod.boolean(),

      createMissingActors: zod.boolean(),
      createMissingStudios: zod.boolean(),
      createMissingLabels: zod.boolean(),
      createMissingMovies: zod.boolean(),
    }),
    log: zod.object({
      maxSize: zod.number().min(0),
    }),
  })
  .nonstrict();

export type IPlugin = zod.TypeOf<typeof pluginSchema>;
export type IConfig = zod.TypeOf<typeof configSchema>;

export function isValidConfig(val: unknown): true | Error {
  try {
    configSchema.parse(val);
    return true;
  } catch (error) {
    return error as Error;
  }
}
