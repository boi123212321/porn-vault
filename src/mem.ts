import v8 from "v8";

import * as logger from "./logger";

export function printMaxMemory(): void {
  logger.message(
    `Max. memory: ${Math.round(v8.getHeapStatistics().total_available_size / 1024 / 1024)} MB`
  );
}

export function memorySizeOf(obj: any): string {
  let bytes = 0;

  function sizeOf(obj: any) {
    if (obj !== null && obj !== undefined) {
      switch (typeof obj) {
        case "number":
          bytes += 8;
          break;
        case "string":
          bytes += obj.length * 2;
          break;
        case "boolean":
          bytes += 4;
          break;
        case "object":
          const objClass = Object.prototype.toString.call(obj).slice(8, -1);
          if (objClass === "Object" || objClass === "Array") {
            for (const key in obj) {
              if (!Object.hasOwnProperty.call(obj, key)) continue;
              sizeOf(obj[key]);
            }
          } else bytes += obj.toString().length * 2;
          break;
      }
    }
    return bytes;
  }

  function formatByteSize(bytes) {
    if (bytes < 1000) return `${bytes} bytes`;
    else if (bytes < 1000000) return (bytes / 1000).toFixed(3) + " KB";
    else if (bytes < 1000000000) return (bytes / 1000000).toFixed(3) + " MB";
    else return (bytes / 1000000000).toFixed(3) + " GB";
  }

  return formatByteSize(sizeOf(obj));
}
