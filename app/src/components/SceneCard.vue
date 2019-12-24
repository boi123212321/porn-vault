<template>
  <v-card :dark="!!cardColor || $vuetify.theme.dark" tile :color="cardColor" v-if="value">
    <a :href="`#/scene/${value._id}`">
      <v-hover>
        <template v-slot:default="{ hover }">
          <v-img :aspect-ratio="aspectRatio" class="hover" v-ripple eager :src="thumbnail">
            <v-fade-transition>
              <div
                @mouseenter="mouseenter"
                @mouseleave="mouseleave"
                v-if="hover"
                style="position: absolute: top: 0; left: 0; width: 100%; height: 100%"
              >
                <video
                  ref="video"
                  style="object-fit: cover;width: 100%; height: 100%"
                  autoplay
                  muted
                  :src="videoPath"
                ></video>
              </div>
            </v-fade-transition>

            <div
              style="z-index: 6"
              class="white--text body-2 font-weight-bold duration-stamp"
              v-if="value.meta.duration"
            >{{ videoDuration }}</div>

            <div class="corner-slot" style="z-index: 6">
              <slot name="action"></slot>
            </div>

            <div class="corner-actions" style="z-index: 6">
              <v-btn
                light
                class="elevation-2 mr-1"
                @click.stop.prevent="favorite"
                icon
                style="background: #fafafa;"
              >
                <v-icon
                  :color="value.favorite ? 'red' : undefined"
                >{{ value.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
              </v-btn>
              <v-btn
                light
                class="elevation-2"
                @click.stop.prevent="bookmark"
                icon
                style="background: #fafafa;"
              >
                <v-icon>{{ value.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
              </v-btn>
            </div>
          </v-img>
        </template>
      </v-hover>
    </a>

    <v-card-title>
      <span
        :title="value.name"
        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
      >{{ value.name }}</span>
    </v-card-title>
    <v-card-subtitle v-if="value.actors.length" class="pb-1">
      Featuring
      <span v-html="actorLinks"></span>
    </v-card-subtitle>
    <v-rating
      half-increments
      @input="rate"
      class="ml-3 mb-2"
      :value="value.rating / 2"
      background-color="grey"
      color="amber"
      dense
    ></v-rating>
    <div class="pa-2">
      <v-chip
        label
        class="mr-1 mb-1"
        small
        outlined
        v-for="label in labelNames"
        :key="label"
      >{{ label }}</v-chip>
    </div>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop, Mixins } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import IScene from "../types/scene";
import moment from "moment";
import { contextModule } from "../store/context";
import { copy } from "../util/object";
import { ensureDarkColor } from "../util/color";
import Color from "color";
import SceneMixin from "../mixins/scene";

@Component
export default class SceneCard extends Mixins(SceneMixin) {
  @Prop(Object) value!: IScene;

  playIndex = 0;
  playInterval = null as NodeJS.Timeout | null;

  get complementary() {
    if (this.cardColor)
      return (
        Color(this.cardColor)
          .negate()
          .hex() + " !important"
      );
    return undefined;
  }

  get cardColor() {
    if (this.value.thumbnail && this.value.thumbnail.color)
      return ensureDarkColor(this.value.thumbnail.color);
    return null;
  }

  mouseenter() {
    console.log("playing video");

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
    if (this.playInterval) {
      console.log("stopping video");
      clearInterval(this.playInterval);
    }
  }

  destroyed() {
    if (this.playInterval) {
      console.log("stopping video");
      clearInterval(this.playInterval);
    }
  }
}
</script>

<style lang="scss" scoped>
.duration-stamp {
  padding: 4px;
  border-radius: 4px;
  background: #000000a0;
  position: absolute;
  bottom: 5px;
  right: 5px;
}

.corner-slot {
  position: absolute;
  right: 5px;
  top: 5px;
}

.corner-actions {
  position: absolute;
  bottom: 5px;
  left: 5px;
}
</style>