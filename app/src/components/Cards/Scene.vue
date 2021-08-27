<template>
  <v-card :dark="!!cardColor || $vuetify.theme.dark" tile :color="cardColor" v-if="value">
    <a :href="`#/scene/${value._id}`">
      <v-hover>
        <template v-slot:default="{ hover }">
          <v-img cover :aspect-ratio="aspectRatio" v-ripple eager :src="thumbnail">
            <v-fade-transition>
              <div
                @mouseenter="mouseenter"
                @mouseleave="mouseleave"
                v-if="previewSceneOnMouseHover && hover"
                style="position: absolute: top: 0; left: 0; width: 100%; height: 100%"
              >
                <div style="width: 100%; height: 100%; position: relative">
                  <video class="video-insert" ref="video" autoplay muted :src="videoPath" />
                </div>
              </div>
            </v-fade-transition>

            <div
              style="z-index: 6"
              class="white--text body-2 font-weight-bold duration-stamp"
              v-if="value.meta.duration"
            >
              {{ videoDuration }}
            </div>

            <div class="corner-slot" style="z-index: 6">
              <slot name="action" :hover="hover"></slot>
            </div>

            <div class="corner-actions top-left" style="z-index: 6">
              <v-fade-transition>
                <v-chip
                  v-if="!hover && value.watches.length"
                  label
                  small
                  color="#1b1b1b"
                  class="elevation-2 chip-watched"
                  >WATCHED</v-chip
                >
              </v-fade-transition>
            </div>

            <div class="corner-actions bottom-left" style="z-index: 6">
              <v-btn
                light
                class="elevation-2 mr-1"
                @click.stop.prevent="favorite"
                icon
                style="background: #fafafa"
              >
                <v-icon :color="value.favorite ? 'red' : undefined">{{
                  value.favorite ? "mdi-heart" : "mdi-heart-outline"
                }}</v-icon>
              </v-btn>
              <v-btn
                light
                class="elevation-2"
                @click.stop.prevent="bookmark"
                icon
                style="background: #fafafa"
              >
                <v-icon>{{
                  value.bookmark !== null ? "mdi-bookmark-check" : "mdi-bookmark-outline"
                }}</v-icon>
              </v-btn>
            </div>
          </v-img>
        </template>
      </v-hover>
    </a>

    <div class="px-2">
      <div v-if="hasTopLine" class="d-flex mt-2 text-uppercase caption">
        <router-link
          v-if="value.studio"
          class="hover"
          style="color: inherit; text-decoration: none"
          :to="`/studio/${value.studio._id}`"
          >{{ value.studio.name }}</router-link
        >
        <v-spacer />
        <div v-if="releaseDate" class="med--text">
          <v-icon x-small>mdi-calendar</v-icon> {{ releaseDate }}
        </div>
        <div v-if="addedOn" class="med--text" style="margin-left: 10px;">
          <v-icon x-small>mdi-calendar-check</v-icon> {{ addedOn }}
        </div>
      </div>
      <v-card-title
        :class="`${hasTopLine ? '' : 'mt-2'}`"
        class="px-0 pt-0"
        style="font-size: 1.1rem; line-height: 1.75rem"
      >
        <span
          :title="value.name"
          style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
          >{{ value.name }}</span
        >
      </v-card-title>
      <v-card-subtitle v-if="value.actors.length" class="px-0 pb-1">
        With
        <span v-html="actorLinks"></span>
      </v-card-subtitle>
      <Rating @change="rate" class="mb-2" :value="value.rating" />
      <div class="py-1" v-if="value.labels.length && showLabels">
        <label-group :allowRemove="false" :item="value._id" v-model="value.labels" />
      </div>
    </div>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import IScene from "@/types/scene";
import { contextModule } from "@/store/context";
import { ensureDarkColor } from "@/util/color";
import Color from "color";
import SceneMixin from "@/mixins/scene";
import moment from "moment";

@Component
export default class SceneCard extends Mixins(SceneMixin) {
  @Prop(Object) value!: IScene;
  @Prop({ default: true }) showLabels!: boolean;

  playIndex = 0;
  playInterval = null as NodeJS.Timeout | null;

  // Card contains top line containing studio/date
  get hasTopLine() {
    return this.value.studio || this.releaseDate || this.addedOn;
  }

  get releaseDate(): string | null {
    if (this.value.releaseDate) {
      return moment(this.value.releaseDate).format("YYYY.MM.DD");
    }
    return null;
  }

  get addedOn(): string | null {
    if (this.value.addedOn) {
      return moment(this.value.addedOn).format("YYYY.MM.DD");
    }
    return null;
  }

  get complementary() {
    if (this.cardColor) {
      return Color(this.cardColor).negate().hex() + " !important";
    }
    return undefined;
  }

  get cardColor() {
    if (this.value.thumbnail && this.value.thumbnail.color) {
      return ensureDarkColor(this.value.thumbnail.color);
    }
    return null;
  }

  get previewSceneOnMouseHover() {
    return contextModule.scenePreviewOnMouseHover;
  }

  mouseenter() {
    if (this.playInterval) clearInterval(this.playInterval);

    this.playIndex = 60;
    // @ts-ignore
    this.$refs.video.currentTime = this.playIndex;

    this.playInterval = setInterval(() => {
      this.playIndex += 180;

      if (this.playIndex > this.value.meta.duration) this.playIndex = 0;
      // @ts-ignore
      if (this.$refs.video) this.$refs.video.currentTime = this.playIndex;
    }, 5000);
  }

  mouseleave() {
    try {
      // @ts-ignore
      this.$refs.video.setAttribute("src", "");
    } catch (error) {}
    if (this.playInterval) {
      clearInterval(this.playInterval);
    }
  }

  beforeDestroy() {
    try {
      // @ts-ignore
      this.$refs.video.setAttribute("src", "");
    } catch (error) {}
  }

  destroyed() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
    }
  }
}
</script>

<style lang="scss" scoped>
.duration-stamp {
  padding-left: 4px;
  padding-right: 4px;
  padding-top: 1px;
  padding-bottom: 1px;
  border-radius: 2px;
  background: #000000c0;
  position: absolute;
  bottom: 2px;
  right: 2px;
}

.corner-slot {
  position: absolute;
  right: 2px;
  top: 2px;
}

.corner-actions {
  position: absolute;

  &.top-left {
    top: 2px;
    left: 2px;
  }

  &.bottom-left {
    position: absolute;
    bottom: 2px;
    left: 2px;
  }
}

.video-insert {
  position: absolute;
  background-size: cover;
  width: 100%;
  height: 100%;
  overflow: hidden;
  object-fit: cover;
}

.chip-watched {
  cursor: pointer;
  opacity: 0.65;
  color: #fff;
}
</style>
