<template>
  <v-container>
    <v-row>
      <v-col sm="12" md="12">
        <canvas id="chart"></canvas>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import LabelSelector from "../components/LabelSelector.vue";
import ILabel from "../types/label";
import Axios from "axios";
import Chart from "chart.js";

@Component({
  components: { LabelSelector }
})
export default class Debug extends Vue {
  sceneQueryTimes = [] as { x: number; y: number }[];
  actorQueryTimes = [] as { x: number; y: number }[];
  imageQueryTimes = [] as { x: number; y: number }[];

  fetchLoader = false;

  get chartData() {
    return {
      labels: this.actorQueryTimes.map(i => new Date(i.x).toLocaleTimeString()),
      datasets: [
        {
          fill: false,
          label: "Scene Query times",
          backgroundColor: "#79ffa0",
          data: this.sceneQueryTimes
        },
        {
          fill: false,
          label: "Actor Query times",
          backgroundColor: "#79a0ff",
          data: this.actorQueryTimes
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

    this.actorQueryTimes = (
      await Axios.get(serverBase + "/debug/timings/actors")
    ).data
      .slice(-1000)
      .filter(i => i[1] < 5000)
      .map(i => ({
        x: i[0],
        y: i[1]
      }));

    this.sceneQueryTimes = (
      await Axios.get(serverBase + "/debug/timings/scenes")
    ).data
      .slice(-1000)
      .filter(i => i[1] < 10000)
      .map(i => ({
        x: i[0],
        y: i[1]
      }));

    this.imageQueryTimes = (
      await Axios.get(serverBase + "/debug/timings/images")
    ).data
      .slice(-1000)
      .filter(i => i[1] < 10000)
      .map(i => ({
        x: i[0],
        y: i[1]
      }));

    var myLineChart = new Chart("chart", {
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
