import ffmpeg from "fluent-ffmpeg";
import path from "path";

export function takeScreenshots(file: string, pattern: string, count: number, thumbnailPath: string, index: number) {
  return new Promise((resolve, reject) => {

    const timestamps = [] as any[];
    const startPositionPercent = 5;
    const endPositionPercent = 100;
    const addPercent = (endPositionPercent - startPositionPercent) / (count - 1);

    if (!timestamps.length) {
      let i = 0;
      while (i < count) {
        timestamps.push(`${startPositionPercent + addPercent * i}%`);
        i++;
      }
    }

    if (count > 0) {
      ffmpeg(file)
        .on("end", async () => {
          index++;

          if (index < count) {
            await takeScreenshots(file, pattern, count, thumbnailPath, index);
          }
          resolve();
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .screenshots({
          count: 1,
          timemarks: [timestamps[index]],
          filename: pattern,
          folder: thumbnailPath
        });
    }
    else {
      resolve();
    }
  })
}