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
import { Component, Vue, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import IScene from "../types/scene";
import moment from "moment";
import { contextModule } from "../store/context";
import { copy } from "../util/object";
import { ensureDarkColor } from "../util/color";
import Color from "color";

@Component
export default class SceneCard extends Vue {
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
    console.log("stopping video");
    if (this.playInterval) clearInterval(this.playInterval);
  }

  destroyed() {
    console.log("stopping video");
    if (this.playInterval) clearInterval(this.playInterval);
  }

  get aspectRatio() {
    return contextModule.sceneAspectRatio;
  }

  get videoDuration() {
    if (this.value)
      return moment()
        .startOf("day")
        .seconds(this.value.meta.duration)
        .format(this.value.meta.duration < 3600 ? "mm:ss" : "H:mm:ss");
    return "";
  }

  rate($event) {
    const rating = $event * 2;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.value._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      const scene = copy(this.value);
      scene.rating = res.data.updateScenes[0].rating;
      this.$emit("input", scene);
    });
  }

  favorite() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.value._id],
        opts: {
          favorite: !this.value.favorite
        }
      }
    }).then(res => {
      const scene = copy(this.value);
      scene.favorite = res.data.updateScenes[0].favorite;
      this.$emit("input", scene);
    });
  }

  bookmark() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.value._id],
        opts: {
          bookmark: !this.value.bookmark
        }
      }
    }).then(res => {
      const scene = copy(this.value);
      scene.bookmark = res.data.updateScenes[0].bookmark;
      this.$emit("input", scene);
    });
  }

  get labelNames() {
    return this.value.labels.map(l => l.name).sort();
  }

  get actorLinks() {
    const names = this.value.actors.map(
      a =>
        `<a class="${this.complementary ? "" : "accent--text"}" style="color: ${
          this.complementary
        }" href="#/actor/${a._id}">${a.name}</a>`
    );
    names.sort();
    return names.join(", ");
  }

  get thumbnail() {
    if (this.value.thumbnail)
      return `${serverBase}/image/${
        this.value.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return ``;
  }

  get videoPath() {
    if (this.value)
      return `${serverBase}/scene/${
        this.value._id
      }?password=${localStorage.getItem("password")}`;
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