<template>
  <v-card :dark="!!cardColor || $vuetify.theme.dark" :color="cardColor" v-if="value" tile>
    <v-hover v-slot:default="{ hover }">
      <a :href="`#/movie/${value._id}`">
        <v-img contain :aspect-ratio="ratio" class="hover" v-ripple eager :src="frontCover">
          <v-fade-transition>
            <v-img eager :aspect-ratio="ratio" :src="backCover" v-if="hover"></v-img>
          </v-fade-transition>

          <div
            style="z-index: 6"
            class="white--text body-2 font-weight-bold duration-stamp"
            v-if="value.duration"
          >{{ movieDuration }}</div>

          <div class="corner-actions">
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
      </a>
    </v-hover>

    <v-card-title>
      <span
        :title="value.name"
        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
      >{{ value.name }}</span>
    </v-card-title>
    <v-card-subtitle v-if="value.actors.length" class="pt-0 pb-0">
      Featuring
      <span v-html="actorLinks"></span>
    </v-card-subtitle>
    <v-card-subtitle class="pt-0 pb-0">{{ value.scenes.length }} scenes</v-card-subtitle>
    <v-rating
      half-increments
      class="ml-3 mb-2"
      :value="value.rating / 2"
      background-color="grey"
      color="amber"
      dense
      readonly
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
import IMovie from "../types/movie";
import { copy } from "../util/object";
import moment from "moment";
import { ensureDarkColor } from "../util/color";
import Color from "color";

@Component
export default class MovieCard extends Vue {
  @Prop(Object) value!: IMovie;
  @Prop({ default: 0.71 }) ratio!: number;

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
    if (this.value.frontCover && this.value.frontCover.color)
      return ensureDarkColor(this.value.frontCover.color);
    return null;
  }

  get movieDuration() {
    if (this.value && this.value.duration)
      return moment()
        .startOf("day")
        .seconds(this.value.duration)
        .format(this.value.duration < 3600 ? "mm:ss" : "H:mm:ss");
    return "";
  }

  favorite() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
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
      const movie = copy(this.value);
      movie.favorite = res.data.updateMovies[0].favorite;
      this.$emit("input", movie);
    });
  }

  bookmark() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
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
      const movie = copy(this.value);
      movie.bookmark = res.data.updateMovies[0].bookmark;
      this.$emit("input", movie);
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

  get frontCover() {
    if (this.value.frontCover)
      return `${serverBase}/image/${
        this.value.frontCover._id
      }?password=${localStorage.getItem("password")}`;
    return ``;
  }

  get backCover() {
    if (this.value.backCover)
      return `${serverBase}/image/${
        this.value.backCover._id
      }?password=${localStorage.getItem("password")}`;
    return this.frontCover;
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

.corner-actions {
  position: absolute;
  bottom: 5px;
  left: 5px;
}
</style>