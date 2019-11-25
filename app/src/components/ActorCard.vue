<template>
  <v-card v-if="actor" outlined>
    <a :href="`#/actor/${actor._id}`">
      <v-img aspect-ratio="1" class="hover" v-ripple eager :src="thumbnail"></v-img>
    </a>

    <div class="corner-actions">
      <v-btn light class="elevation-2 mb-2" @click="favorite" icon style="background: #fafafa;">
        <v-icon
          :color="actor.favorite ? 'red' : undefined"
        >{{ actor.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
      </v-btn>
      <br />
      <v-btn light class="elevation-2" @click="bookmark" icon style="background: #fafafa;">
        <v-icon>{{ actor.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
      </v-btn>
    </div>

    <v-card-title>{{ actor.name }}</v-card-title>
    <v-card-subtitle>{{ actor.numScenes }} {{ actor.numScenes == 1 ? 'scene' : 'scenes' }}</v-card-subtitle>
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

@Component
export default class ActorCard extends Vue {
  @Prop(Object) actor!: IActor;

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
  top: 5px;
  right: 5px;
}
</style>