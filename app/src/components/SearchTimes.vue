<template>
  <v-card class="mb-3" style="border-radius: 10px">
    <v-card-text>
      <canvas id="scene-search-times"></canvas>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import ILabel from "../types/label";
import Axios from "axios";
import Chart from "chart.js";

@Component({
  components: {}
})
export default class SearchTimes extends Vue {
  sceneQueryTimes = [] as { x: number; y: number }[];
  imageQueryTimes = [] as { x: number; y: number }[];

  fetchLoader = false;

  get chartData() {
    return {
      labels: this.sceneQueryTimes.map(i => new Date(i.x).toLocaleTimeString()),
      datasets: [
        {
          fill: false,
          label: "Scene Query times",
          backgroundColor: "#79ffa0",
          data: this.sceneQueryTimes
        },
        {
          fill: false,
          label: "Image Query times",
          backgroundColor: "#ffa079",
          data: this.imageQueryTimes
        }
      ]
    };
  }

  async getTimes() {
    this.fetchLoader = true;

    this.sceneQueryTimes = (
      await Axios.get(serverBase + "/search/timings/scenes")
    ).data
      .slice(-1000)
      .map(i => ({
        x: i[0],
        y: i[1] / 1000 / 1000
      }));

    this.imageQueryTimes = (
      await Axios.get(serverBase + "/search/timings/images")
    ).data
      .slice(-1000)
      .map(i => ({
        x: i[0],
        y: i[1] / 1000 / 1000
      }));

    var myLineChart = new Chart("scene-search-times", {
      type: "line",
      data: this.chartData,
      options: {
        showLines: false,
        responsive: true,
        scales: {
          yAxes: [
            {
              display: true,
              ticks: {
                beginAtZero: true
              }
            }
          ]
        }
      }
    });

    this.fetchLoader = false;
  }

  mounted() {
    this.getTimes();
  }
}
</script>
