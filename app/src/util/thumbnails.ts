import ffmpeg from "fluent-ffmpeg";
import path from "path";
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

      console.log(new Date());

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

      console.log(new Date());

      resolve();
    }
    catch (err) {
      reject(err);
    }
  })
}

// export function takeScreenshots(file: string, pattern: string, count: number, thumbnailPath: string, index: number) {
//   return new Promise((resolve, reject) => {

//     const timestamps = [] as any[];
//     const startPositionPercent = 5;
//     const endPositionPercent = 100;
//     const addPercent = (endPositionPercent - startPositionPercent) / (count - 1);

//     if (!timestamps.length) {
//       let i = 0;
//       while (i < count) {
//         timestamps.push(`${startPositionPercent + addPercent * i}%`);
//         i++;
//       }
//     }

//     if (count > 0) {
//       ffmpeg(file)
//         .on("end", async () => {
//           index++;

//           if (index < count) {
//             await takeScreenshots(file, pattern, count, thumbnailPath, index);
//           }
//           resolve();
//         })
//         .on("error", (err: Error) => {
//           reject(err);
//         })
//         .screenshots({
//           count: 1,
//           timemarks: [timestamps[index]],
//           filename: pattern,
//           folder: thumbnailPath
//         });
//     }
//     else {
//       resolve();
//     }
//   })
// }