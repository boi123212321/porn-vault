import { runFFprobe } from "../types/scene";
import ffmpeg from "fluent-ffmpeg";
import * as logger from "../logger";
import path, { basename } from "path";
import { existsSync, renameSync, statSync, utimesSync } from "fs";
import { generateHash } from "../hash";
import ProgressBar from "cli-progress";

// compatible codecs for html5 video element (mp4/webm)
const vcodecs = ['h264','vp8','vp9','av1', 'theora'];
const acodecs = ['aac','ogg','opus','vorbis'];

export const transcode = async (scenePath:string, sceneName:string, transcodeOptions:string[], preserveDates:boolean):Promise<string|null>=>{
    return new Promise(async (resolve, reject)=>{
        if (!scenePath) {
          logger.warn("No scene path, aborting transcoding.");
          return resolve(scenePath);
        }

        if(!(await canPlayInputVideo(scenePath))){
          // transcode the file
          logger.message(`Transcoding file ${scenePath}`);
          const folderPath = path.dirname(scenePath);
          let outputFilename = `${sceneName}.mp4`;
          if(outputFileExists(path.join(folderPath, outputFilename))) {
            // ensure we have a unique output filename
            outputFilename = `${sceneName}_${generateHash()}.mp4`;
          }
          const outfile = path.join(folderPath, outputFilename);

          resolve(await transcodeFile(scenePath, outfile, sceneName, transcodeOptions, preserveDates));             
        }else{
          logger.success(`Skipping transcoding of compatible file: ${scenePath}`);
          resolve(scenePath);
        }
      });
};

export const canPlayInputVideo = async (path:string):Promise<boolean>=>{
    const streams = (await runFFprobe(path)).streams;
    let isVCompat = false;
    let isACompat = false;
    let vcodec = '';
    let acodec = '';
    for(const stream of streams){
        if(vcodecs.indexOf(stream.codec_name!) !== -1) {
            isVCompat = true;
            vcodec = stream.codec_name!;
        }
        if(acodecs.indexOf(stream.codec_name!) !== -1) {
            isACompat = true;
            acodec = stream.codec_name!;
        }
    }
    // a video without an audio stream can still be compatible
    return (isVCompat && isACompat) || (isVCompat && !isACompat && vcodec !== '' && acodec === '');
};

const outputFileExists = (path:string):boolean => {
    if(existsSync(path)) return true;
    return false;
};

const onTranscodeStart = async (cmd:string, sceneName:string, transcodeOptions:string[]) => {
    logger.message(`Starting transcoding of ${sceneName}`);
    logger.message(`Using transcoding options: ${transcodeOptions}`);
};

export const transcodeFile = (input:string, output:string, sceneName:string, transcodeOptions:string[], preserveDates:boolean):Promise<string>=>{
  return new Promise(async(resolve, reject)=>{
    const downloadBar = new ProgressBar.SingleBar({},ProgressBar.Presets.legacy);
    ffmpeg(input)
    .on('end', async ()=>{
      downloadBar.update(100);  // fix for ffmpeg progress percentage 'slop'
      downloadBar.stop();
      logger.success(`Transcoded file ${input} to ${output}`);            
      const oldPath = input;
      if(preserveDates){
        // update the modified/accessed date of our new copy
        const fsStats =  statSync(oldPath);
        utimesSync(output, fsStats.atime, fsStats.mtime);
      }
      // rename the old file with a leading '$_' so we ignore it on the next scan
      // also so we can easily search for and remove it later
      renameSync(oldPath, path.join(path.dirname(oldPath), `$_${basename(oldPath)}`));         
      resolve(output);
    })
    .on('error', (err)=>{
      logger.error(err.message);
      resolve(input);
    })
    .on('start', async  (cmd)=>{
      onTranscodeStart(cmd, sceneName, transcodeOptions)
      downloadBar.start(100, 0);
    })
    .on('progress', async (args)=>{
      const percent = Math.round(args.percent);
      downloadBar.update(percent);
    })
    .addOptions(transcodeOptions)
    .save(output);
  });  
};
