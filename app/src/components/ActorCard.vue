<template>
  <v-card :dark="!!cardColor || $vuetify.theme.dark" :color="cardColor" v-if="value" tile>
    <a :href="`#/actor/${value._id}`">
      <v-img contain :aspect-ratio="aspectRatio" class="hover" v-ripple eager :src="thumbnail">
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

    <v-card-title>
      <span
        :title="value.name"
        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
      >
        {{ value.name }}
        <span class="subtitle-1 med--text" v-if="value.bornOn">({{ age }})</span>
      </span>
    </v-card-title>
    <v-card-subtitle
      class="pb-0"
    >{{ value.numScenes }} {{ value.numScenes == 1 ? 'scene' : 'scenes' }}</v-card-subtitle>
    <v-rating
      half-increments
      @input="rate"
      class="ml-3 mb-2"
      :value="value.rating / 2"
      background-color="grey"
      color="amber"
      dense
    ></v-rating>
    <div class="pa-2" v-if="this.value.labels.length && showLabels">
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
import moment from "moment";
import { copy } from "../util/object";
import { ensureDarkColor } from "../util/color";

@Component
export default class ActorCard extends Vue {
  @Prop(Object) value!: IActor;
  @Prop({ default: true }) showLabels!: boolean;

  get cardColor() {
    if (this.value.thumbnail && this.value.thumbnail.color)
      return ensureDarkColor(this.value.thumbnail.color);
    return null;
  }

  get age() {
    if (this.value.bornOn) {
      return moment().diff(this.value.bornOn, "years");
    }
  }

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
        ids: [this.value._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      const actor = copy(this.value);
      actor.rating = res.data.updateActors[0].rating;
      this.$emit("input", actor);
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
        ids: [this.value._id],
        opts: {
          favorite: !this.value.favorite
        }
      }
    }).then(res => {
      const actor = copy(this.value);
      actor.favorite = res.data.updateActors[0].favorite;
      this.$emit("input", actor);
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
        ids: [this.value._id],
        opts: {
          bookmark: !this.value.bookmark
        }
      }
    }).then(res => {
      const actor = copy(this.value);
      actor.bookmark = res.data.updateActors[0].bookmark;
      this.$emit("input", actor);
    });
  }

  get labelNames() {
    return this.value.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.value.thumbnail)
      return `${serverBase}/image/${
        this.value.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return ``;
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