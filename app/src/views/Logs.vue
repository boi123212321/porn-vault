<template>
  <v-container fluid>
    <div class="pb-4">
      <v-checkbox hide-details v-model="showWarn" label="Show warnings"></v-checkbox>
      <v-checkbox hide-details v-model="showLog" label="Show dev logs"></v-checkbox>
      <v-checkbox hide-details v-model="showHttp" label="Show HTTP routing"></v-checkbox>
    </div>
    <div class="pa-2 output white--text">
      <div v-for="(item, i) in filtered" :key="i" :style="'color: '+ fontColor(item.type)">
        <span class="font-weight-bold" style="text-transform: uppercase">{{ item.type }}:</span>
        {{ new Date(item.date).toLocaleString() }}: {{ item.text }}
      </div>
    </div>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Axios from "axios";
import { serverBase } from "../apollo";

@Component
export default class About extends Vue {
  showLog = false;
  showHttp = false;
  showWarn = true;

  logs = [] as any[];

  get filtered() {
    let logs = this.logs;

    if (!this.showHttp) logs = logs.filter(l => l.type != "http");
    if (!this.showLog) logs = logs.filter(l => l.type != "log");
    if (!this.showWarn) logs = logs.filter(l => l.type != "warn");
    return logs;
  }

  fontColor(type: string) {
    return {
      log: "#60b0ff",
      error: "#ff3040",
      http: "#aaaaff",
      warn: "#ffdd66",
      message: "#ffffff",
      success: "#aaff85"
    }[type];
  }

  mounted() {
    Axios.get(`${serverBase}/log?password=${localStorage.getItem("password")}`)
      .then(({ data }) => {
        this.logs = data;
      })
      .catch(err => {
        console.error(err);
      });
  }
}
</script>

<style scoped>
.output {
  background: #090909;
  border-radius: 4px;
}
</style>