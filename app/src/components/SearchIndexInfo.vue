<template>
  <v-card v-if="info && info.indexing" class="mb-3" style="border-radius: 10px">
    <v-card-title>
      <v-icon medium class="mr-2">mdi-file-document-box-search</v-icon>Search index
    </v-card-title>

    <v-card-text>
      <div class="my-2">
        <!-- <span class="subtitle-1 mr-2">Version</span>
        <span class="d-inline-block headline">{{ info.version }}</span>-->
        <span class="ml-3" v-if="info.indexing">
          <v-progress-circular class="mr-2" size="20" width="2" indeterminate></v-progress-circular>
          <span class="subtitle-1">indexing...</span>
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
  info = null as null | { version: string; indexing: boolean };
  infoInterval = null as NodeJS.Timeout | null;

  created() {
    this.getInfo();
    this.infoInterval = setInterval(() => {
      this.getInfo();
    }, 10000);
  }

  destroyed() {
    if (this.infoInterval) clearInterval(this.infoInterval);
  }

  async getInfo() {
    const res = await ApolloClient.query({
      query: gql`
        {
          twigs {
            version
            indexing
          }
        }
      `
    });
    this.info = res.data.twigs;
  }
}
</script>