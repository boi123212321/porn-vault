<template>
  <v-container>
    <BindTitle value="Home" />
    <div class="mx-auto" style="max-width: 800px">
      <v-row dense>
        <v-col cols="12" sm="6">
          <Stats />
          <QueueInfo />
          <SceneLabelUsage />
          <ActorLabelUsage />
          <!-- <SearchTimes /> -->
        </v-col>
        <v-col cols="12" sm="6">
          <TopActors />
          <RandomActors />
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import actorFragment from "../fragments/actor";
import sceneFragment from "../fragments/scene";
import ActorCard from "../components/ActorCard.vue";
import IActor from "../types/actor";
import IScene from "../types/scene";
import QueueInfo from "../components/QueueInfo.vue";
import ActorGrid from "../components/ActorGrid.vue";
import { contextModule } from "../store/context";
import TopActors from "../components/TopActors.vue";
import RandomActors from "../components/RandomActors.vue";
import Stats from "../components/Stats.vue";
import SearchTimes from "../components/SearchTimes.vue";
import ActorLabelUsage from "../components/ActorLabelUsage.vue";
import SceneLabelUsage from "../components/SceneLabelUsage.vue";

@Component({
  components: {
    ActorCard,
    QueueInfo,
    ActorGrid,
    TopActors,
    RandomActors,
    Stats,
    SearchTimes,
    ActorLabelUsage,
    SceneLabelUsage
  }
})
export default class Home extends Vue {}
</script>
