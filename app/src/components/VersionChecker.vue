<template>
  <div class="text-center">
    <v-alert
      prominent
      border="top"
      elevation="2"
      colored-border
      type="info"
      v-if="newerVersionAvailable"
    >
      <template v-slot:actions></template>

      <v-row align="center">
        <v-col class="grow">Newer version available!</v-col>
        <v-col class="shrink">
          <v-btn
            large
            text
            color="accent"
            href="https://github.com/boi123212321/porn-manager/releases"
            target="_blank"
          >Show</v-btn>
        </v-col>
      </v-row>
    </v-alert>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient from "../apollo";
import gql from "graphql-tag";

@Component
export default class QueueInfo extends Vue {
  newerVersionAvailable = false;

  created() {
    this.getInfo();
  }

  async getInfo() {
    try {
      const res = await ApolloClient.query({
        query: gql`
          {
            newerVersionAvailable
          }
        `
      });
      this.newerVersionAvailable = res.data.newerVersionAvailable;
    } catch (error) {}
  }
}
</script>