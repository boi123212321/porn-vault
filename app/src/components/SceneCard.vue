<template>
  <v-card v-if="scene" outlined>
    <a :href="`#/scene/${scene._id}`">
      <v-img :aspect-ratio="aspectRatio" class="hover" v-ripple eager :src="thumbnail">
        <div
          class="white--text body-2 font-weight-bold duration-stamp"
          v-if="scene.meta.duration"
        >{{ videoDuration }}</div>

        <div class="corner-actions">
          <v-btn
            light
            class="elevation-2 mr-1"
            @click.stop.prevent="favorite"
            icon
            style="background: #fafafa;"
          >
            <v-icon
              :color="scene.favorite ? 'red' : undefined"
            >{{ scene.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
          </v-btn>
          <v-btn
            light
            class="elevation-2"
            @click.stop.prevent="bookmark"
            icon
            style="background: #fafafa;"
          >
            <v-icon>{{ scene.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
          </v-btn>
        </div>
      </v-img>
    </a>

    <v-card-title>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ scene.name }}</span>
    </v-card-title>
    <v-card-subtitle v-if="scene.actors.length" class="pb-1">
      Featuring
      <span v-html="actorLinks"></span>
    </v-card-subtitle>
    <v-rating
      half-increments
      @input="rate"
      class="ml-3 mb-2"
      :value="scene.rating / 2"
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

@Component
export default class SceneCard extends Vue {
  @Prop(Object) scene!: IScene;

  get aspectRatio() {
    return contextModule.sceneAspectRatio;
  }

  get videoDuration() {
    if (this.scene)
      return moment()
        .startOf("day")
        .seconds(this.scene.meta.duration)
        .format("H:mm:ss");
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
        ids: [this.scene._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      this.$emit("rate", res.data.updateScenes[0].rating);
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
        ids: [this.scene._id],
        opts: {
          favorite: !this.scene.favorite
        }
      }
    }).then(res => {
      this.$emit("favorite", res.data.updateScenes[0].favorite);
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
        ids: [this.scene._id],
        opts: {
          bookmark: !this.scene.bookmark
        }
      }
    }).then(res => {
      this.$emit("bookmark", res.data.updateScenes[0].bookmark);
    });
  }

  get labelNames() {
    return this.scene.labels.map(l => l.name).sort();
  }

  get actorLinks() {
    const names = this.scene.actors.map(
      a => `<a class="accent--text" href="#/actor/${a._id}">${a.name}</a>`
    );
    names.sort();
    return names.join(", ");
  }

  get thumbnail() {
    if (this.scene.thumbnail)
      return `${serverBase}/image/${
        this.scene.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
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