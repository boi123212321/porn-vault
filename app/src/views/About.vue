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

    <div>
      <v-subheader>Scene cards aspect ratio</v-subheader>
      <v-radio-group v-model="sceneRatio">
        <v-radio :value="1" label="Square"></v-radio>
        <v-radio :value="16/9" label="16:9"></v-radio>
        <v-radio :value="4/3" label="4:3"></v-radio>
      </v-radio-group>
    </div>

    <div>
      <v-subheader>Actor cards aspect ratio</v-subheader>
      <v-radio-group v-model="actorRatio">
        <v-radio :value="1" label="Square"></v-radio>
        <v-radio :value="9/16" label="9:16"></v-radio>
        <v-radio :value="3/4" label="3:4"></v-radio>
      </v-radio-group>
    </div>

    <QueueInfo />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import QueueInfo from "../components/QueueInfo.vue";
import { contextModule } from "../store/context";

@Component({
  components: {
    QueueInfo
  }
})
export default class About extends Vue {
  beforeMount() {
    document.title = "About";
  }

  set actorRatio(val: number) {
    localStorage.setItem("pm_actorRatio", val.toString());
    contextModule.setActorAspectRatio(val);
  }

  get actorRatio() {
    return contextModule.actorAspectRatio;
  }

  set sceneRatio(val: number) {
    localStorage.setItem("pm_sceneRatio", val.toString());
    contextModule.setSceneAspectRatio(val);
  }

  get sceneRatio() {
    return contextModule.sceneAspectRatio;
  }

  toggleDarkMode() {
    this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
    localStorage.setItem(
      "pm_darkMode",
      this.$vuetify.theme.dark ? "true" : "false"
    );
  }
}
</script>