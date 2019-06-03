<template>
  <v-dialog :value="videos.length || processing.length" persistent>
    <v-card>
      <v-card-text>
        <v-card class="pa-2 mb-2" v-for="video in videos" :key="video.path">
          <v-text-field label="Video name" :value="video.name" @change="video.name = $event"></v-text-field>
          <p class="sec--text">{{ video.path}}</p>
          <v-combobox
            :value="video.labels"
            :items="$store.getters['videos/getLabels']"
            label="Add or choose labels"
            multiple
            chips
            @change="video.labels = $event"
          ></v-combobox>
        </v-card>
        <div v-if="processing.length" class="text-xs-center">
          <v-progress-circular indeterminate :size="80" :width="5" color="primary"></v-progress-circular>
          <div class="mt-2 subheading">
            {{ processing.length }}
            <span>{{ processing.length == 1 ? 'video' : 'videos' }} processing...</span>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn :disabled="generatingThumbnails" flat @click="videos = []">Cancel</v-btn>
        <v-btn :disabled="generatingThumbnails" @click="add" color="primary">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from "vue";
import asyncPool from "tiny-async-pool";
import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import Video from "@/classes/video";
import Image from "@/classes/image";
import { takeScreenshots } from "@/util/thumbnails";
import { toTitleCase } from "../util/string";

var os = require("os");

var platform = os.platform();
//patch for compatibilit with electron-builder, for smart built process.
if (platform == "darwin") {
  platform = "mac";
} else if (platform == "win32") {
  platform = "win";
}
//adding browser, for use case when module is bundled using browserify. and added to html using src.
if (
  platform !== "linux" &&
  platform !== "mac" &&
  platform !== "win" &&
  platform !== "browser"
) {
  console.error("Unsupported platform.", platform);
  process.exit(1);
}

var arch = os.arch();
if (platform === "mac" && arch !== "x64") {
  console.error("Unsupported architecture.");
  process.exit(1);
}

const ffmpegPath = path.join(
  process.cwd(),
  "bin/",
  platform,
  "ffmpeg/",
  arch,
  platform === "win" ? "ffmpeg.exe" : "ffmpeg"
);

const ffprobePath = path.join(
  process.cwd(),
  "bin/",
  platform,
  "ffprobe/",
  arch,
  platform === "win" ? "ffprobe.exe" : "ffprobe"
);

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export default Vue.extend({
  data() {
    return {
      videos: [] as {
        name: string;
        path: string;
        size: number;
        labels?: string[];
      }[],
      processing: [] as {
        name: string;
        path: string;
        size: number;
        labels?: string[];
      }[]
    };
  },
  methods: {
    push(
      vids: { name: string; path: string; size: number; labels?: string[] }[]
    ): void {
      vids.forEach(vid => {
        vid.labels = [];
      });
      this.videos.push(...vids);
    },
    async add() {
      this.processing.push(...this.videos);
      this.videos = [];

      const videos = (<{ name: string; path: string; size: number }[]>(
        this.processing
      )).map(file => Video.create(file));

      videos.forEach(video => {
        let labels = this.processing.find(
          (v: { path: string }) => v.path == video.path
        ).labels as string[];

        if (labels && labels.length) {
          labels = labels.map(label => toTitleCase(label));
        }

        video.labels = labels || [];
      });

      let customFieldNames = this.$store.getters[
        "globals/getCustomFieldNames"
      ] as string[];

      this.generatingThumbnails = true;

      if (!fs.existsSync("library/")) {
        fs.mkdirSync("library/");
      }

      if (!fs.existsSync("library/images/")) {
        fs.mkdirSync("library/images/");
      }

      const thumbnailPath = "library/images/thumbnails/";

      if (!fs.existsSync(thumbnailPath)) {
        fs.mkdirSync(thumbnailPath);
      }

      await asyncPool(1, videos, video => {
        return new Promise(async (resolve, reject) => {
          customFieldNames.forEach(field => {
            video.customFields[field] = null;
          });

          let metadata = (await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(video.path, (err, metadata) => {
              if (err) return reject(err);
              resolve(metadata);
            });
          })) as FfprobeData;

          let amount = Math.max(
            1,
            Math.floor(
              metadata.format.duration /
                this.$store.state.globals.settings.thumbnailsOnImportInterval
            )
          );

          video.duration = metadata.format.duration;
          video.dimensions = {
            width: metadata.streams[0].width,
            height: metadata.streams[0].height
          }

          console.log(`Generating ${amount} thumbnails...`);

          await takeScreenshots({
            file: video.path,
            pattern: `thumbnail-${video.id}-%s.jpg`,
            count: amount,
            thumbnailPath,
          });

          let files = fs.readdirSync(thumbnailPath) as any[];
          files = files.filter(name => name.includes(`thumbnail-${video.id}`));

          files = files.map(name => {
            let filePath = path.resolve(
              process.cwd(),
              "library/images/thumbnails/",
              name
            );
            return {
              name,
              path: filePath,
              size: fs.statSync(filePath).size,
              time: fs.statSync(filePath).mtime.getTime()
            };
          });

          files.sort((a, b) => a.time - b.time);

          let images = files.map(file => Image.create(file));

          images.forEach(image => {
            image.video = video.id;
            image.labels = video.labels;
          });

          this.$store.commit("images/add", images);

          video.thumbnails.push(...images.map(i => i.id));

          this.$store.commit("videos/add", [video]);

          this.processing = this.processing.filter(
            (v: { path: string }) => v.path != video.path
          );

          resolve();
        });
      });

      this.generatingThumbnails = false;
    }
  },
  computed: {
    generatingThumbnails: {
      get(): boolean {
        return this.$store.state.videos.generatingThumbnails;
      },
      set(value: boolean) {
        this.$store.commit("videos/generatingThumbnails", value);
      }
    }
  }
});
</script>

<style>
</style>
