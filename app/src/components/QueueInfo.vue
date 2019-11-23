<template>
  <div class="mt-4 text-center" v-if="info">
    <div class="title">Processing video queue</div>
    <div v-if="info.length > 0">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
    <div>Queue length: {{ info.length }}</div>
  </div>
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