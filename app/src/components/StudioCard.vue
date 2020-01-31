<template>
  <v-card tile v-if="studio">
    <router-link :to="`/studio/${studio._id}`">
      <div class="pa-2" v-ripple>
        <v-img contain aspect-ratio="2" :src="thumbnail"></v-img>
      </div>
    </router-link>
    <v-card-title class="pb-3">
      <span
        :title="studio.name"
        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
      >{{ studio.name }}</span>
    </v-card-title>
    <v-card-subtitle
      class="py-0"
    >{{ studio.numScenes }} {{ studio.numScenes == 1 ? 'scene' : 'scenes' }}</v-card-subtitle>
    <v-card-subtitle class="py-0" v-if="studio.parent">Part of {{ studio.parent.name }}</v-card-subtitle>
    <v-card-text class="pt-3" v-if="this.studio.labels.length && showLabels">
      <v-chip
        class="mr-1 mb-1"
        label
        small
        outlined
        v-for="label in labelNames"
        :key="label"
      >{{ label }}</v-chip>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class ActorCard extends Vue {
  @Prop(Object) studio!: any;
  @Prop({ default: true }) showLabels!: boolean;

  get labelNames() {
    return this.studio.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.studio.thumbnail)
      return `${serverBase}/image/${
        this.studio.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return `${serverBase}/broken`;
  }
}
</script>

<style lang="scss" scoped>
</style>