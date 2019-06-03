import ffmpeg from "fluent-ffmpeg";
import asyncPool from "tiny-async-pool";

export type ScreenShotOptions = {
  file: string;
  pattern: string;
  count: number;
  thumbnailPath: string;
}

export function takeScreenshots(options: ScreenShotOptions) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamps = [] as string[];
      const startPositionPercent = 5;
      const endPositionPercent = 100;
      const addPercent = (endPositionPercent - startPositionPercent) / (options.count - 1);

      let i = 0;
      while (i < options.count) {
        timestamps.push(`${startPositionPercent + addPercent * i}%`);
        i++;
      }

      await asyncPool(4, timestamps, timestamp => {
        return new Promise((resolve, reject) => {
          ffmpeg(options.file)
            .on("end", async () => {
              resolve();
            })
            .on("error", (err: Error) => {
              reject(err);
            })
            .screenshots({
              count: 1,
              timemarks: [timestamp],
              filename: options.pattern,
              folder: options.thumbnailPath
            });
        })
      });

      resolve();
    }
    catch (err) {
      reject(err);
    }
  })
}