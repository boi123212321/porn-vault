<template>
  <v-container fluid>
    <BindTitle value="About" />
    <div class="text-center headline mt-4">Settings</div>
    <v-row>
      <v-col :cols="12" :sm="6">
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
      </v-col>
      <v-col :cols="12" :sm="6">
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
          <v-checkbox
            hide-details
            v-model="scenePauseOnUnfocus"
            label="Pause video on window unfocus"
          ></v-checkbox>
          <v-checkbox hide-details v-model="showCardLabels" label="Show card labels on overview"></v-checkbox>
        </div>
      </v-col>
    </v-row>

    <div>
      <div class="text-center headline mb-4">Custom data fields</div>
      <CustomFieldCreator />
    </div>

    <div class="text-center">
      <div class="mt-3 pa-3 d-inline-block" style="border: 1px solid #ddd; border-radius: 8px">
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
    </div>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import CustomFieldCreator from "../components/CustomFieldCreator.vue";
import { contextModule } from "../store/context";

@Component({
  components: {
    CustomFieldCreator
  }
})
export default class About extends Vue {
  set showCardLabels(val: boolean) {
    localStorage.setItem("pm_showCardLabels", val.toString());
    contextModule.toggleCardLabels(val);
  }

  get showCardLabels() {
    return contextModule.showCardLabels;
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

  set scenePauseOnUnfocus(val: boolean) {
    localStorage.setItem("pm_scenePauseOnUnfocus", val.toString());
    contextModule.setScenePauseOnUnfocus(val);
  }

  get scenePauseOnUnfocus() {
    return contextModule.scenePauseOnUnfocus;
  }

  toggleDarkMode() {
    // @ts-ignore
    this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
    localStorage.setItem(
      "pm_darkMode",
      // @ts-ignore
      this.$vuetify.theme.dark ? "true" : "false"
    );
  }
}
</script>