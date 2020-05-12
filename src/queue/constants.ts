export const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".webm"];

export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"];

export const SUPPORTED_LIBRARY_EXTENSIONS = [
  ...SUPPORTED_VIDEO_EXTENSIONS,
  ...SUPPORTED_IMAGE_EXTENSIONS,
];

export enum LibraryTypes {
  VIDEOS = "videos",
  IMAGES = "images",
}

export const LibraryTypesConfigPathsMapping = {
  [LibraryTypes.VIDEOS]: "VIDEO_PATHS",
  [LibraryTypes.IMAGES]: "IMAGE_PATHS",
};

export const LibraryTypesExtensionMapping = {
  [LibraryTypes.VIDEOS]: SUPPORTED_VIDEO_EXTENSIONS,
  [LibraryTypes.IMAGES]: SUPPORTED_IMAGE_EXTENSIONS,
};

export interface LibraryTypeQueueManager {
  /**
   * Attaches a callback function for when the import
   * queue is emptied
   */
  attachOnQueueEmptiedListener: (cb: () => void) => void;
  addPathsToQueue: (...paths: string[]) => void;
  /**
   * How many paths are left in the queue (those not currently being imported)
   */
  getQueueLength: () => number;
  /**
   * Resumes import queue execution
   */
  resumeQueue: () => void;
  /**
   * Pauses import queue execution
   */
  pauseQueue: () => void;
  /**
   * @returns how many imports are currently running (not those in the queue)
   */
  getRunningCount: () => number;
  /**
   * @returns if the import queue is running
   */
  isQueueRunning: () => boolean;
}
