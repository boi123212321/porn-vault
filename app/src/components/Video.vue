<template>
  <div class="pa-2" v-if="video" style="word-break: break-word">
    <v-card v-ripple class="video" @click="goToVideo">
      <v-img
        v-if="video.thumbnails.length"
        class="thumb"
        :aspect-ratio="1"
        v-ripple
        :src="thumbnails[video.coverIndex]"
      ></v-img>
      <v-img v-else class="thumb" :aspect-ratio="1" v-ripple src style="background: grey"></v-img>
    </v-card>
    <div class="mt-3 text-center">
      <span class="subheading">{{ video.title }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import fs from "fs";
import path from "path";
import { hash } from "@/util/generator";
import Video from "@/classes/video";

const Props = Vue.extend({
  props: {
    video: Object as () => Video
  }
});

@Component
export default class VideoComponent extends Props {
  goToVideo() {
    this.$router.push("/video/" + this.video.id);
  }

  get thumbnails(): string[] {
    return (<Video>this.video).thumbnails.map(id =>
      this.$store.getters["images/idToPath"](id)
    );
  }
}
</script>

<style lang="scss" scoped>
.video {
  user-select: none;

  &:hover {
    .thumb {
      cursor: pointer;
      filter: brightness(0.8);
    }
  }

  .thumb {
    transition: filter 0.15s ease-in-out;
  }
}
</style>
