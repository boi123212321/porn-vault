/*
    inputs:
    small001.3gp, small002.flv, small003.mp4, small004.ogv, small005.webm
    
    expectations:
    small003.mp4, small004.ogv, small005.webm -> untouched
    small001.3gp, small002.flv -> transcoded, renamed
*/

import { transcode, canPlayInputVideo } from "../src/import/transcode";
import { expect } from "chai";
import path from "path";
import { existsSync, unlinkSync, renameSync, chmodSync, unlink } from "fs";
import { getFFMpegURL, getFFProbeURL, downloadFile } from "../src/ffmpeg-download";
import ffmpeg from "fluent-ffmpeg";

const basePath = 'test/fixtures/files'
const ffmpegURL = getFFMpegURL();
const ffprobeURL = getFFProbeURL();

const ffmpegPath = path.join(basePath, path.basename(ffmpegURL));
const ffprobePath = path.join(basePath, path.basename(ffprobeURL));

describe("Transcode videos", ()=>{
    before(async function(){
        this.timeout(20000);
        //setup the ffmpeg environment similar to the actual vault    
        try {
          await downloadFile(ffmpegURL, ffmpegPath);
          await downloadFile(ffprobeURL, ffprobePath);
        } catch (error) {
          console.log(error);
          process.exit(1);
        }
    
        try {
          console.log("CHMOD binaries...");
          chmodSync(ffmpegPath, "111");
          chmodSync(ffprobePath, "111");
        } catch (error) {
          console.error("Could not make FFMPEG binaries executable");
        }
    
        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpeg.setFfprobePath(ffprobePath);
    });
    after(()=>{
        //remove our downloaded files
        unlinkSync(ffmpegPath);
        unlinkSync(ffprobePath);
    });


    describe("Process 3GP video", function(){
        const baseName = 'small001';
        const file = path.join(basePath, `${baseName}.3gp`);
        const expected = path.join(basePath, `${baseName}.mp4`);
        const renamedOriginal = path.join(basePath, `$_${baseName}.3gp`);
        
        this.slow(500);
        
        after(()=>{
            //remove our expected output
            unlinkSync(expected);
            //rename 3gp file
            renameSync(renamedOriginal, file);
        });

        it("Should not match codec white-list", async ()=>{            
            const output = await canPlayInputVideo(file);
            expect(output).to.be.false;
        });
        it("Should transcode file", async ()=>{            
            const output = await transcode(file, baseName, [], false);            
            expect(output).to.eq(expected);            
        });
        it("Should create transcoded file", async ()=>{
            expect(existsSync(expected)).to.be.true;
        });
        it("Should create renamed original file", async ()=>{
            expect(existsSync(renamedOriginal)).to.be.true;
        });
        it("Transcoded file should match codec white-list", async ()=>{
            const output = await canPlayInputVideo(expected);
            expect(output).to.be.true;
        });        
    });

    describe("Process FLV video", function(){
        const baseName = 'small002';
        const file = path.join(basePath, `${baseName}.flv`);
        const expected = path.join(basePath, `${baseName}.mp4`);
        const renamedOriginal = path.join(basePath, `$_${baseName}.flv`);
        
        this.slow(500);

        after(()=>{
            //remove our expected output
            unlinkSync(expected);
            //rename flv file
            renameSync(renamedOriginal, file);
        });

        it("Should not match codec white-list", async ()=>{            
            const output = await canPlayInputVideo(file);
            expect(output).to.be.false;
        });
        it("Should transcode file", async ()=>{            
            const output = await transcode(file, baseName, [], false);            
            expect(output).to.eq(expected);            
        });
        it("Should create transcoded file", async ()=>{
            expect(existsSync(expected)).to.be.true;
        });
        it("Should create renamed original file", async ()=>{
            expect(existsSync(renamedOriginal)).to.be.true;
        });
        it("Transcoded file should match codec white-list", async ()=>{
            const output = await canPlayInputVideo(expected);
            expect(output).to.be.true;
        });        
    });

    describe("Process MP4 video", function(){
        this.slow(100);

        const file = path.join(basePath, 'small003.mp4');

        it("Should match codec white-list", async ()=>{            
            const output = await canPlayInputVideo(file);
            expect(output).to.be.true;
        });
        it("Should not be transcoded", async ()=>{
            const output = await transcode(file, 'small003', [], false);
            expect(output).to.eq(file);
        });
    });

    describe("Process OGV video", function(){
        this.slow(100);

        const file = path.join(basePath, 'small004.ogv');

        it("Should match codec white-list", async ()=>{            
            const output = await canPlayInputVideo(file);
            expect(output).to.be.true;
        });
        it("Should not be transcoded", async ()=>{
            const output = await transcode(file, 'small004', [], false);
            expect(output).to.eq(file);
        });
    });

    describe("Process WebM video", function(){
        this.slow(100);
        
        const file = path.join(basePath, 'small005.webm');

        it("Should match codec white-list", async ()=>{            
            const output = await canPlayInputVideo(file);
            expect(output).to.be.true;
        });
        it("Should not be transcoded", async ()=>{
            const output = await transcode(file, 'small005', [], false);
            expect(output).to.eq(file);
        });
    });   
});