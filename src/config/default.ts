import { platform } from "os";

import { DEFAULT_WORD_MATCHER } from "../matching/wordMatcher";
import { ApplyActorLabelsEnum, ApplyStudioLabelsEnum, IConfig } from "./schema";

function isWindows(): boolean {
  return platform() === "win32";
}

function exeName(str: string): string {
  return `${str}${isWindows() ? ".exe" : ""}`;
}

const defaultConfig: IConfig = {
  search: {
    host: "http://localhost:9200",
    log: false,
    version: "7.x",
    auth: null,
  },
  auth: {
    password: null,
  },
  binaries: {
    ffmpeg: exeName("ffmpeg"),
    ffprobe: exeName("ffprobe"),
    izzyPort: 8000,
  },
  import: {
    images: [],
    videos: [],
  },
  log: {
    level: "info",
    maxSize: "20m",
    maxFiles: "5",
    writeFile: [
      {
        level: "error",
        prefix: "errors-",
        silent: false,
      },
      {
        level: "silly",
        prefix: "full-",
        silent: true,
      },
    ],
  },
  matching: {
    applyActorLabels: [
      ApplyActorLabelsEnum.enum["event:actor:create"],
      ApplyActorLabelsEnum.enum["event:actor:find-unmatched-scenes"],
      ApplyActorLabelsEnum.enum["plugin:actor:create"],
      ApplyActorLabelsEnum.enum["event:scene:create"],
      ApplyActorLabelsEnum.enum["plugin:scene:create"],
      ApplyActorLabelsEnum.enum["event:image:create"],
    ],
    applySceneLabels: true,
    applyStudioLabels: [
      ApplyStudioLabelsEnum.enum["event:studio:create"],
      ApplyStudioLabelsEnum.enum["event:studio:find-unmatched-scenes"],
      ApplyStudioLabelsEnum.enum["plugin:studio:create"],
      ApplyStudioLabelsEnum.enum["event:scene:create"],
      ApplyStudioLabelsEnum.enum["plugin:scene:create"],
    ],
    extractSceneActorsFromFilepath: true,
    extractSceneLabelsFromFilepath: true,
    extractSceneMoviesFromFilepath: true,
    extractSceneStudiosFromFilepath: true,
    matcher: DEFAULT_WORD_MATCHER,
    matchCreatedActors: true,
    matchCreatedStudios: true,
    matchCreatedLabels: true,
  },
  persistence: {
    backup: {
      enable: true,
      maxAmount: 10,
    },
    libraryPath: process.cwd(),
  },
  plugins: {
    allowActorThumbnailOverwrite: false,
    allowMovieThumbnailOverwrite: false,
    allowSceneThumbnailOverwrite: false,
    allowStudioThumbnailOverwrite: false,
    createMissingActors: false,
    createMissingLabels: false,
    createMissingMovies: false,
    createMissingStudios: false,
    events: {
      actorCreated: [],
      actorCustom: [],
      sceneCreated: [],
      sceneCustom: [],
      movieCustom: [],
      studioCreated: [],
      studioCustom: [],
    },
    register: {},
  },
  processing: {
    doProcessing: true,
    generatePreviews: true,
    generateScreenshots: false,
    imageCompressionSize: 720,
    readImagesOnImport: false,
    screenshotInterval: 120,
    generateImageThumbnails: true,
  },
  scan: {
    excludeFiles: [],
    interval: 10800000,
    scanOnStartup: true,
  },
  server: {
    https: {
      certificate: "",
      enable: false,
      key: "",
    },
    port: 3000,
  },
};

export default defaultConfig;
