<template>
  <div class="mb-1 px-3 d-flex align-center">
    <div class="mr-2 med--text">{{ formatTime(marker.time) }}</div>
    <v-tooltip bottom v-if="marker.labels && marker.labels.length">
      <template v-slot:activator="{ on }">
        <div v-on="on" class="text-truncate" style="overflow: hidden">{{ marker.name }}</div>
      </template>
      {{ marker.labels.map(l => l.name).join(", ") }}
    </v-tooltip>
    <div v-else class="text-truncate" style="overflow: hidden">{{ marker.name }}</div>
    <v-spacer></v-spacer>
    <v-btn small text color="primary" class="px-0 mr-2 text-none" @click="$emit('jump')">Jump</v-btn>
    <v-btn
      small
      text
      :color="errorState === 0 ? 'warning' : 'error'"
      @click="errorClick"
      class="px-0 text-none"
    >{{ errorState === 0 ? 'Delete' : 'Confirm' }}</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import ApolloClient from "../apollo";
import gql from "graphql-tag";
import moment from "moment";

@Component
export default class MarkerItem extends Vue {
  @Prop(Object) marker!: any;

  errorState = 0;

  errorClick() {
    if (this.errorState == 0) {
      this.errorState = 1;
      setTimeout(() => {
        this.errorState = 0;
      }, 2500);
    } else {
      this.$emit("delete");
    }
  }

  formatTime(secs: number) {
    return moment()
      .startOf("day")
      .seconds(secs)
      .format("H:mm:ss");
  }
}
</script>