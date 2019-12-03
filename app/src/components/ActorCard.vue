<template>
  <v-card v-if="actor" outlined>
    <a :href="`#/actor/${actor._id}`">
      <v-img :aspect-ratio="aspectRatio" class="hover" v-ripple eager :src="thumbnail">
        <div class="corner-actions">
          <v-btn
            light
            class="elevation-2 mr-1"
            @click.stop.prevent="favorite"
            icon
            style="background: #fafafa;"
          >
            <v-icon
              :color="actor.favorite ? 'red' : undefined"
            >{{ actor.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
          </v-btn>
          <v-btn
            light
            class="elevation-2"
            @click.stop.prevent="bookmark"
            icon
            style="background: #fafafa;"
          >
            <v-icon>{{ actor.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
          </v-btn>
        </div>
      </v-img>
    </a>

    <v-card-title>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ actor.name }}</span>
    </v-card-title>
    <v-card-subtitle
      class="pb-0"
    >{{ actor.numScenes }} {{ actor.numScenes == 1 ? 'scene' : 'scenes' }}</v-card-subtitle>
    <v-rating
      half-increments
      @input="rate"
      class="ml-3 mb-2"
      :value="actor.rating / 2"
      background-color="grey"
      color="amber"
      dense
    ></v-rating>
    <div class="pa-2">
      <v-chip
        class="mr-1 mb-1"
        label
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
import IActor from "../types/actor";
import { contextModule } from "../store/context";

@Component
export default class ActorCard extends Vue {
  @Prop(Object) actor!: IActor;

  get aspectRatio() {
    return contextModule.actorAspectRatio;
  }

  rate($event) {
    const rating = $event * 2;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.actor._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      this.$emit("rate", res.data.updateActors[0].rating);
    });
  }

  favorite() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.actor._id],
        opts: {
          favorite: !this.actor.favorite
        }
      }
    }).then(res => {
      this.$emit("favorite", res.data.updateActors[0].favorite);
    });
  }

  bookmark() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.actor._id],
        opts: {
          bookmark: !this.actor.bookmark
        }
      }
    }).then(res => {
      this.$emit("bookmark", res.data.updateActors[0].bookmark);
    });
  }

  get labelNames() {
    return this.actor.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.actor.thumbnail)
      return `${serverBase}/image/${
        this.actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
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