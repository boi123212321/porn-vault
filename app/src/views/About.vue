<template>
  <div class="text-center">
    <div class="pa-3 d-inline-block" style="border: 1px solid #ddd">
      <div class="title">porn-manager (name TBD)</div>

      <div class="med--text">by boi123212321</div>

      <v-btn
        depressed
        href="https://github.com/boi123212321/porn-manager"
        target="_blank"
        color="accent mt-3"
      >
        <v-icon left>mdi-github-circle</v-icon>GitHub
      </v-btn>
    </div>

    <QueueInfo />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import QueueInfo from "../components/QueueInfo.vue";

@Component({
  components: {
    QueueInfo
  }
})
export default class About extends Vue {}
</script>