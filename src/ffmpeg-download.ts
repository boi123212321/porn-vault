import * as os from "os";
import ProgressBar from "cli-progress";
import axios from "axios";
import { createWriteStream } from "fs";
import * as logger from "./logger";
import { existsAsync } from "./fs/async";

const FFMpegVersions = {
  Linux: {
    ia32:
      "https://github.com/kribblo/node-ffmpeg-installer/raw/master/platforms/linux-ia32/ffmpeg",
    x64:
      "https://github.com/kribblo/node-ffmpeg-installer/raw/master/platforms/linux-x64/ffmpeg"
  },
  Windows_NT: {
    ia32:
      "https://github.com/kribblo/node-ffmpeg-installer/raw/master/platforms/win32-ia32/ffmpeg.exe",
    x64:
      "https://github.com/kribblo/node-ffmpeg-installer/raw/master/platforms/win32-x64/ffmpeg.exe"
  },
  Darwin: {
    x64:
      "https://github.com/kribblo/node-ffmpeg-installer/raw/master/platforms/darwin-x64/ffmpeg"
  }
};

const FFProbeVersions = {
  Linux: {
    ia32:
      "https://github.com/SavageCore/node-ffprobe-installer/raw/master/platforms/linux-ia32/ffprobe",
    x64:
      "https://github.com/SavageCore/node-ffprobe-installer/raw/master/platforms/linux-x64/ffprobe"
  },
  Windows_NT: {
    ia32:
      "https://github.com/SavageCore/node-ffprobe-installer/raw/master/platforms/win32-ia32/ffprobe.exe",
    x64:
      "https://github.com/SavageCore/node-ffprobe-installer/raw/master/platforms/win32-x64/ffprobe.exe"
  },
  Darwin: {
    x64:
      "https://github.com/SavageCore/node-ffprobe-installer/raw/master/platforms/darwin-x64/ffprobe"
  }
};

export function getFFMpegURL() {
  const sys = os.type();
  const arch = os.arch();

  return FFMpegVersions[sys][arch];
}

export function getFFProbeURL() {
  const sys = os.type();
  const arch = os.arch();

  return FFProbeVersions[sys][arch];
}

export async function downloadFile(url: string, file: string) {
  try {
    if (await existsAsync(file)) return;

    logger.message(`Downloading ${url}...`);

    const downloadBar = new ProgressBar.SingleBar(
      {},
      ProgressBar.Presets.legacy
    );
    downloadBar.start(100, 0);

    const response = await axios({
      url: url,
      method: "GET",
      responseType: "stream"
    });

    const writer = createWriteStream(file);

    const totalSize = response.headers["content-length"];
    let loaded = 0;

    response.data.on("data", data => {
      loaded += Buffer.byteLength(data);
      const percent = ((loaded / totalSize) * 100).toFixed(0);
      downloadBar.update(+percent);
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", () => {
        logger.error(`Error while downloading ${url}`);
        process.exit(1);
      });
    });

    downloadBar.stop();
  } catch (error) {
    logger.error(error);
    throw error;
  }
}
