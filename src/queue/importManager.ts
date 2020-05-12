import { LibraryTypeQueueManager, LibraryTypes } from "./constants";
import { ImageImportQueueManager } from "./image/imageQueue";
import { VideoImportQueueManager } from "./video/videoQueue";

const LibraryQueueManagerMapping: {
  [key in LibraryTypes]: LibraryTypeQueueManager;
} = {
  [LibraryTypes.VIDEOS]: VideoImportQueueManager,
  [LibraryTypes.IMAGES]: ImageImportQueueManager,
};

export function attachOnQueueEmptiedListenerForLibraryType(
  libraryType: keyof typeof LibraryTypes,
  callback: () => void
) {
  LibraryQueueManagerMapping[
    LibraryTypes[libraryType]
  ].attachOnQueueEmptiedListener(callback);
}

const LibraryTypeImporterMapping: {
  [key in LibraryTypes]: (...paths: string[]) => void;
} = {
  [LibraryTypes.VIDEOS]: importVideoPaths,
  [LibraryTypes.IMAGES]: importImagePaths,
};

export function importPathsForLibraryType(
  libraryType: keyof typeof LibraryTypes,
  ...paths: string[]
) {
  // Use our custom importers
  const importer = LibraryTypeImporterMapping[LibraryTypes[libraryType]];
  importer(...paths);
}

function importVideoPaths(...addedPaths: string[]) {
  incrementFoundCountForLibraryType("VIDEOS", addedPaths.length);
  LibraryQueueManagerMapping[LibraryTypes.VIDEOS].addPathsToQueue(
    ...addedPaths
  );
}

function importImagePaths(...addedPaths: string[]) {
  incrementFoundCountForLibraryType("IMAGES", addedPaths.length);
  LibraryQueueManagerMapping[LibraryTypes.IMAGES].addPathsToQueue(
    ...addedPaths
  );
}

export function getQueueLengthForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  return LibraryQueueManagerMapping[LibraryTypes[libraryType]].getQueueLength();
}

export function resumeQueueForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  LibraryQueueManagerMapping[LibraryTypes[libraryType]].resumeQueue();
}

export function pauseQueueForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  LibraryQueueManagerMapping[LibraryTypes[libraryType]].pauseQueue();
}

export function getRunningCountForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  return LibraryQueueManagerMapping[
    LibraryTypes[libraryType]
  ].getRunningCount();
}

export function isQueueRunningForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  return LibraryQueueManagerMapping[LibraryTypes[libraryType]].isQueueRunning();
}

// COUNTS

const foundItemsCounts: {
  [key in LibraryTypes]: { oldCount: number; count: number };
} = {
  [LibraryTypes.VIDEOS]: {
    oldCount: 0,
    count: 0,
  },
  [LibraryTypes.IMAGES]: {
    oldCount: 0,
    count: 0,
  },
};

/**
 * Saves the current count to the "old" count, and then resets the
 * current count
 *
 * @param libraryType the library type to query
 */
export function resetFoundCountForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  const typeCounts = foundItemsCounts[LibraryTypes[libraryType]];
  typeCounts.oldCount = typeCounts.count;
  typeCounts.count = 0;
}

/**
 *
 * @param libraryType the library type to query
 * @returns the current found count
 */
export function getFoundCountForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  return foundItemsCounts[LibraryTypes[libraryType]].count;
}

function incrementFoundCountForLibraryType(
  libraryType: keyof typeof LibraryTypes,
  addedCount = 1
) {
  foundItemsCounts[LibraryTypes[libraryType]].count += addedCount;
}

/**
 *
 * @param libraryType the library type to query
 * @returns the "old" found count
 */
export function getOldFoundCountForLibraryType(
  libraryType: keyof typeof LibraryTypes
) {
  return foundItemsCounts[LibraryTypes[libraryType]].oldCount;
}
