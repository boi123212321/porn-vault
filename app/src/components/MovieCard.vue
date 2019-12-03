<template>
  <v-card v-if="movie" outlined>
    <v-hover v-slot:default="{ hover }">
      <a :href="`#/movie/${movie._id}`">
        <v-img
          contain
          :aspect-ratio="ratio"
          class="hover"
          v-ripple
          eager
          :src="hover ? backCover : frontCover"
        >
          <div class="corner-actions">
            <v-btn
              light
              class="elevation-2 mr-1"
              @click.stop.prevent="favorite"
              icon
              style="background: #fafafa;"
            >
              <v-icon
                :color="movie.favorite ? 'red' : undefined"
              >{{ movie.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
            </v-btn>
            <v-btn
              light
              class="elevation-2"
              @click.stop.prevent="bookmark"
              icon
              style="background: #fafafa;"
            >
              <v-icon>{{ movie.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
            </v-btn>
          </div>
        </v-img>
      </a>
    </v-hover>

    <v-card-title>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ movie.name }}</span>
    </v-card-title>
    <v-card-subtitle v-if="movie.actors.length" class="pt-0 pb-0">
      Featuring
      <span v-html="actorLinks"></span>
    </v-card-subtitle>
    <v-card-subtitle class="pt-0 pb-0">{{ movie.scenes.length }} scenes</v-card-subtitle>
    <v-rating
      half-increments
      class="ml-3 mb-2"
      :value="movie.rating / 2"
      background-color="grey"
      color="amber"
      dense
      readonly
    ></v-rating>
    <div class="pa-2">
      <v-chip class="mr-1 mb-1" small outlined v-for="label in labelNames" :key="label">{{ label }}</v-chip>
    </div>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import IMovie from "../types/movie";

@Component
export default class MovieCard extends Vue {
  @Prop(Object) movie!: IMovie;
  @Prop({ default: 0.71 }) ratio!: number;

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
        ids: [this.movie._id],
        opts: {
          favorite: !this.movie.favorite
        }
      }
    }).then(res => {
      this.$emit("favorite", res.data.updateMovies[0].favorite);
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
        ids: [this.movie._id],
        opts: {
          bookmark: !this.movie.bookmark
        }
      }
    }).then(res => {
      this.$emit("bookmark", res.data.updateMovies[0].bookmark);
    });
  }

  get labelNames() {
    return this.movie.labels.map(l => l.name).sort();
  }

  get actorLinks() {
    const names = this.movie.actors.map(
      a => `<a class="accent--text" href="#/actor/${a._id}">${a.name}</a>`
    );
    names.sort();
    return names.join(", ");
  }

  get frontCover() {
    if (this.movie.frontCover)
      return `${serverBase}/image/${
        this.movie.frontCover._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  get backCover() {
    if (this.movie.backCover)
      return `${serverBase}/image/${
        this.movie.backCover._id
      }?password=${localStorage.getItem("password")}`;
    return this.frontCover;
  }
}
</script>

<style lang="scss" scoped>
.corner-actions {
  position: absolute;
  bottom: 5px;
  left: 5px;
}
</style>