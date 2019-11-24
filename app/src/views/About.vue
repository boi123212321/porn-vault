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
        :class="`text-none ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
      >
        <v-icon left>mdi-github-circle</v-icon>GitHub
      </v-btn>
    </div>

    <div>
      <v-btn
        color="gray darken-4"
        depressed
        dark
        @click="toggleDarkMode"
        class="text-none my-3"
      >{{ this.$vuetify.theme.dark ? "Light mode" : "Dark mode" }}</v-btn>
    </div>

    <QueueInfo />

    <SceneSelector v-model="scenes" />
    {{ scenes }}
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import QueueInfo from "../components/QueueInfo.vue";
import SceneSelector from "../components/SceneSelector.vue";

@Component({
  components: {
    QueueInfo,
    SceneSelector
  }
})
export default class About extends Vue {
  scenes = [];

  toggleDarkMode() {
    this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
    localStorage.setItem(
      "pm_darkMode",
      this.$vuetify.theme.dark ? "true" : "false"
    );
  }
}
</script>