<template>
  <v-card v-if="info" class="mb-3" style="border-radius: 10px">
    <v-card-title>
      <v-icon medium class="mr-2">mdi-progress-wrench</v-icon>Processing video queue
    </v-card-title>

    <v-card-text>
      <div class="my-4">
        <span class="mr-2 d-inline-block display-1">{{ info.length }}</span>
        <span class="subtitle-1">videos</span>
        <span v-if="info.length > 0" class="ml-3">
          <v-progress-circular size="20" width="2" indeterminate></v-progress-circular>
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient from "../apollo";
import gql from "graphql-tag";

@Component
export default class QueueInfo extends Vue {
  info = null as null | { length: number };
  infoInterval = null as NodeJS.Timeout | null;

  created() {
    this.getInfo();
    this.infoInterval = setInterval(() => {
      this.getInfo();
    }, 5000);
  }

  destroyed() {
    if (this.infoInterval) clearInterval(this.infoInterval);
  }

  async getInfo() {
    const res = await ApolloClient.query({
      query: gql`
        {
          getQueueInfo {
            length
          }
        }
      `
    });
    this.info = res.data.getQueueInfo;
  }
}
</script>