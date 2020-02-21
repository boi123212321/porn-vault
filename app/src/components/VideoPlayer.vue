<template>
  <v-hover v-slot:default="{ hover }">
    <div class="video-wrapper">
      <div class="video-overlay">
        <v-img
          @click="togglePlay"
          :src="poster"
          cover
          max-height="100%"
          class="blurred poster"
          v-if="poster && showPoster"
        ></v-img>
        <v-img
          @click="togglePlay"
          class="poster text-center"
          :src="poster"
          contain
          max-height="100%"
          v-if="poster && showPoster"
        ></v-img>
        <v-fade-transition>
          <div v-if="videoNotice" class="notice pa-2">{{ videoNotice }}</div>
        </v-fade-transition>

        <v-fade-transition>
          <div v-if="hover" class="bottom-bar d-flex align-center">
            <div class="px-1 align-center d-flex" style="width: 100%; height: 100%">
              <v-btn @click="togglePlay" icon>
                <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
              </v-btn>
              <span class="mx-2 caption">{{ formatTime(progress) }}</span>
              <v-hover v-slot:default="{ hover }">
                <div
                  @mousemove="onMouseMove"
                  id="progress-bar"
                  class="progress-bar-wrapper"
                  @click="onProgressClick"
                >
                  <div class="time-bar">
                    <v-fade-transition>
                      <div
                        class="elevation-4 preview-window"
                        v-if="hover && preview"
                        :style="`left: ${previewX * 100}%;`"
                      >
                        <div class="preview-wrapper">
                          <img
                            class="preview-image"
                            :style="`left: -${imageIndex * 160}px; background-position: ${imageIndex * 160}`"
                            :src="preview"
                          />
                        </div>
                      </div>
                    </v-fade-transition>
                  </div>

                  <div class="progress-bar" :style="`width: ${progressPercent * 100}%;`"></div>
                  <v-tooltip v-for="marker in markers" :key="marker.id" top>
                    <template v-slot:activator="{ on }">
                      <v-hover v-slot:default="{ hover }">
                        <div
                          @click="seek(marker.time)"
                          v-on="on"
                          :class="`marker ${hover ? 'hover' : ''}`"
                          :style="`left: ${percentOfVideo(marker.time) * 100}%;`"
                        ></div>
                      </v-hover>
                    </template>
                    {{ marker.name }}
                  </v-tooltip>
                </div>
              </v-hover>
              <span class="mx-2 caption">{{ formatTime(duration) }}</span>
              <v-btn @click="requestFullscreen" icon>
                <v-icon>mdi-fullscreen</v-icon>
              </v-btn>
            </div>
          </div>
        </v-fade-transition>
      </div>
      <video @click="togglePlay" id="video" style="width: 100%">
        <source :src="src" type="video/mp4" />
      </video>
    </div>
  </v-hover>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import moment from "moment";

@Component
export default class VideoPlayer extends Vue {
  @Prop(String) src!: string;
  @Prop(Number) duration!: number;
  @Prop({ default: null }) poster!: string | null;
  @Prop() markers!: { _id: string; name: string; time: number }[];
  @Prop({ default: null }) preview!: string | null;

  videoNotice = "";
  previewX = 0;
  progress = 0;
  isPlaying = false;
  showPoster = true;

  formatTime(secs: number) {
    return moment()
      .startOf("day")
      .seconds(secs)
      .format("H:mm:ss");
  }

  currentProgress() {
    return this.progress;
  }

  get imageIndex() {
    return Math.floor(this.previewX * 100);
  }

  requestFullscreen() {
    const video = <HTMLVideoElement>document.getElementById("video");
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
        // @ts-ignore
      } else if (video.webkitRequestFullscreen) {
        // @ts-ignore
        video.webkitRequestFullscreen();
        // @ts-ignore
      } else if (video.mozRequestFullScreen) {
        // @ts-ignore
        video.mozRequestFullScreen();
        // @ts-ignore
      } else if (video.msRequestFullscreen) {
        // @ts-ignore
        video.msRequestFullscreen();
      }
    }
  }

  onMouseMove(ev) {
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
      const rect = progressBar.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      this.previewX = x / rect.width;
    }
  }

  percentOfVideo(time: number) {
    return time / this.duration;
  }

  get progressPercent() {
    return this.percentOfVideo(this.progress);
  }

  seekRel(delta: number, text?: string) {
    this.seek(
      Math.min(this.duration, Math.max(0, this.progress + delta)),
      text
    );
  }

  seek(time: number, text?: string, play = false) {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.currentTime = time;

      if (play) this.play();

      if (text) {
        this.notice(text);
      }
    }
  }

  onProgressClick(ev: any) {
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
      const rect = progressBar.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const xPercentage = x / rect.width;
      this.seek(xPercentage * this.duration, "", true);
    }
  }

  notice(text: string, duration = 1500) {
    this.videoNotice = text;
    setTimeout(() => {
      this.videoNotice = "";
    }, duration);
  }

  play() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.play();
      this.isPlaying = true;
      this.showPoster = false;
      vid.ontimeupdate = ev => {
        this.progress = vid.currentTime;
      };
      this.$emit("play");
    }
  }

  isPaused() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    return vid && vid.paused;
  }

  pause() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.pause();
      this.isPlaying = false;
    }
  }

  togglePlay() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      if (vid.paused) {
        this.play();
      } else {
        this.pause();
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.video-wrapper {
  cursor: pointer;
  position: relative;
}

.video-overlay {
  pointer-events: none;
  overflow: hidden;
  z-index: 11;
  cursor: pointer;
  position: absolute;
  width: 100%;
  height: 100%;

  .progress-bar-wrapper {
    height: 100%;
    position: relative;
    width: 100%;

    .time-bar {
      transform: translateY(-50%);
      top: 50%;
      width: 100%;
      position: absolute;
      border-radius: 4px;
      height: 6px;
      background: #202a3b;

      .preview-window {
        position: absolute;
        top: -120px;
        transform: translateX(-60px);

        .preview-wrapper {
          position: relative;
          overflow: hidden;
          width: 160px;
          height: 90px;

          .preview-image {
            position: absolute;
            height: 100%;
          }
        }
      }
    }

    .progress-bar {
      pointer-events: none;
      transform: translateY(-50%);
      top: 50%;
      position: absolute;
      border-radius: 4px;
      height: 6px;
      left: 0px;
      background: #405090;
    }

    .marker {
      transition: all 0.15s ease-in-out;
      transform: translateY(-50%);
      top: 50%;
      border-radius: 4px;
      position: absolute;
      width: 4px;
      background: #4070aa;
      height: 12px;

      &.hover {
        background: #50aacc;
        height: 16px;
      }
    }
  }

  .bottom-bar {
    pointer-events: auto;
    background: #121420ee;
    padding: 4px;
    height: 48px;
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
  }

  .notice {
    background: #333333aa;
    position: absolute;
    left: 10px;
    top: 10px;
    border-radius: 6px;
  }

  .poster {
    pointer-events: auto;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;

    &.blurred {
      filter: blur(8px);
    }
  }
}
</style>