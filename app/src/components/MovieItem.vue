<template>
  <div class="pa-2 mb-2 d-flex align-center">
    <div class="mr-4 font-weight-light display-1 med--text">{{ index }}</div>

    <a :href="`#/scene/${value._id}`">
      <v-hover>
        <template v-slot:default="{ hover }">
          <v-avatar style="border-radius: 4px" class="mr-5" tile :size="thumbnailSize">
            <v-img
              v-ripple
              :src="`http://localhost:3000/image/${
          value.thumbnail._id
        }?password=xxx`"
            >
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
            </v-img>
          </v-avatar>
        </template>
      </v-hover>
    </a>
    <div>
      <a
        :class="$vuetify.theme.dark ? 'white--text' : 'black--text'"
        style="text-decoration: none !important"
        :href="`#/scene/${value._id}`"
      >
        <div class="title">{{ value.name }}</div>
      </a>
      <div class="med--text">Featuring {{ value.actors.map(a => a.name).join(", ") }}</div>
      <div v-if="$vuetify.breakpoint.mdAndUp" class="mt-1" style="max-width: 300px">
        <v-chip
          small
          outlined
          label
          class="mr-1 mb-1"
          v-for="label in labelNames"
          :key="label"
        >{{ label }}</v-chip>
      </div>
      <v-rating
        half-increments
        @input="rate"
        class="ml-3 mb-2"
        :value="value.rating / 2"
        background-color="grey"
        color="amber"
        dense
      ></v-rating>
    </div>
  </div>
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
  @Prop(Number) index!: number;

  playIndex = 0;
  playInterval = null as NodeJS.Timeout | null;

  get thumbnailSize() {
    switch (this.$vuetify.breakpoint.name) {
      case "xs":
        return 100;
      case "sm":
        return 200;
      case "md":
        return 225;
      case "lg":
        return 250;
      case "xl":
        return 300;
    }
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