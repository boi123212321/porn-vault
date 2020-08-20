<template>
  <div class="white--text">
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
                <v-btn dark @click="togglePlay" icon>
                  <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                </v-btn>
                <v-hover v-slot:default="{ hover }" close-delay=100> <!-- close-delay to allow the user to jump the gap and hover over volume wrapper -->
                  <div>
                    <div v-if="hover" class="volume-bar-background">
                      <div id="volume-bar" class="volume-bar-wrapper" @click="onVolumeClick" @mousedown="onVolumeMouseDown" @mousemove="onVolumeDrag">
                        <div class="volume-bar"></div>
                        <div v-if="!isMuted" class="current-volume-bar" :style="`height: ${volume * 100}%;`"></div>
                      </div>
                    </div>
                    <v-btn dark @click="toggleMute" icon>
                      <v-icon>{{ isMuted ? 'mdi-volume-mute' : 'mdi-volume-high' }}</v-icon>
                    </v-btn>
                  </div>
                </v-hover>
                <span class="mx-2 body-2">{{ formatTime(progress) }}</span>
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
                <span class="mx-2 body-2">{{ formatTime(duration) }}</span>
                <v-btn dark @click="requestFullscreen" icon>
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
    <v-card
      v-if="paniced"
      style="z-index: 99999; position: fixed; left: 0; top: 0; width: 100%; height: 100%;"
    ></v-card>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import moment from "moment";

const IS_MUTED = "player_is_muted";
const VOLUME = "player_volume";

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
  
  isVolumeDragging = false;
  isMuted = localStorage.getItem(IS_MUTED) === "true";
  volume = parseFloat(localStorage.getItem(VOLUME) ?? "1");

  paniced = false;

  mounted() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.volume = this.volume;
      vid.muted = this.isMuted;
    }
    window.addEventListener('mouseup', this.onVolumeMouseUp);
  }

  panic() {
    this.paniced = true;
    this.pause();
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.src = "";
    }
    window.location.replace(
      localStorage.getItem("pm_panic") || "https://google.com"
    );
  }

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

  setVolume(volume: number) {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      if (volume <= 0.02) {
        this.mute();
      } else {
        if (volume > 1) {
          volume = 1;
        }
        this.unmute();
        this.volume = volume;
        localStorage.setItem(VOLUME, volume.toString());
        vid.volume = volume;
      }
    }
  }

  onVolumeClick(ev: any) {
    const volumeBar = document.getElementById("volume-bar");
    if (volumeBar) {
      const rect = volumeBar.getBoundingClientRect();
      const y = (ev.clientY - rect.bottom) * -1;
      const yPercentage = y / rect.height;
      this.setVolume(yPercentage);
    }
  }

  onVolumeMouseDown() {
    this.isVolumeDragging = true;
  }

  onVolumeMouseUp() {
    this.isVolumeDragging = false;
  }

  onVolumeDrag(ev) {
    if (this.isVolumeDragging) {
      this.onVolumeClick(ev);
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

  mute() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.muted = true;
      this.isMuted = true;
      localStorage.setItem(IS_MUTED, "true");
    }
  }

  unmute() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      vid.muted = false;
      this.isMuted = false;
      localStorage.setItem(IS_MUTED, "false");
    }
  }

  toggleMute() {
    const vid = <HTMLVideoElement>document.getElementById("video");
    if (vid) {
      if (vid.muted) {
        this.unmute();
      } else {
        this.mute();
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

  .volume-bar-background {
    position: absolute;
    height: 110px;
    background-color: #121420ee;
    width: 30px;
    top: -110px;
    padding-bottom: 5px;
    padding-top: 5px;
    user-select: none;

    .volume-bar-wrapper {
      position: relative;
      width: 100%;
      height: 100%;

      .volume-bar {
        position: absolute;
        background-color: #202a3b;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 100px;
        bottom: 0;
      }

      .current-volume-bar {
        position: absolute;
        background-color: #405090;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 35px;
        bottom: 0;
      }
    }
  }

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