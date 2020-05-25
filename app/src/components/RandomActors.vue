<template>
  <v-card v-if="actors && actors.length" class="mb-3" style="border-radius: 10px">
    <v-card-title>
      <v-icon medium class="mr-2">mdi-shuffle</v-icon>Actors you haven't watched yet
    </v-card-title>

    <v-card-text>
      <ActorGrid :value="actors" />
    </v-card-text>

    <v-card-actions>
      <v-btn block class="text-none" color="primary" text @click="nextPage">Show more</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient from "../apollo";
import gql from "graphql-tag";
import ActorGrid from "./ActorGrid.vue";

@Component({
  components: {
    ActorGrid
  }
})
export default class RandomActors extends Vue {
  actors = [] as any[];
  skip = 0;

  nextPage() {
    this.getActors();
  }

  created() {
    this.getActors();
  }

  async getActors() {
    const res = await ApolloClient.query({
      query: gql`
        query($skip: Int) {
          getUnwatchedActors(skip: $skip, take: 4) {
            _id
            name
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        skip: this.skip
      }
    });
    this.actors.push(...res.data.getUnwatchedActors);
    this.skip += 4;
  }
}
</script>