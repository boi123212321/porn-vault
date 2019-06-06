<template>
  <div>
    Home
    <v-btn flat @click="loadLibrary">Load</v-btn>
    <v-btn flat @click="exportLibrary">Export</v-btn>
  </div>
</template>

<script>
import * as library from "../util/library";

export default {
  methods: {
    loadLibrary() {
      library.loadFromDisk();
    },
    exportLibrary() {
      library.exportToDisk(1);
    }
  }
}
</script>

<style>

</style>
