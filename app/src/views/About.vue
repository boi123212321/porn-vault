<template>
  <v-container fluid>
    <BindTitle value="Settings" />

    <div style="max-width: 800px" class="mx-auto">
      <v-card>
        <v-card-title>Preferences</v-card-title>
        <v-card-text>
          <v-row>
            <v-col :cols="12" :sm="6">
              <div>
                <v-subheader>Scene cards aspect ratio</v-subheader>
                <v-radio-group v-model="sceneRatio">
                  <v-radio color="primary" :value="1" label="Square"></v-radio>
                  <v-radio color="primary" :value="16/9" label="16:9"></v-radio>
                  <v-radio color="primary" :value="4/3" label="4:3"></v-radio>
                </v-radio-group>
              </div>

              <div>
                <v-subheader>Actor cards aspect ratio</v-subheader>
                <v-radio-group v-model="actorRatio">
                  <v-radio color="primary" :value="1" label="Square"></v-radio>
                  <v-radio color="primary" :value="9/16" label="9:16"></v-radio>
                  <v-radio color="primary" :value="3/4" label="3:4"></v-radio>
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
                  color="primary"
                  hide-details
                  v-model="scenePauseOnUnfocus"
                  label="Pause video on window unfocus"
                />
                <v-checkbox
                  color="primary"
                  hide-details
                  v-model="showCardLabels"
                  label="Show card labels on overview"
                />
                <v-checkbox
                  color="primary"
                  hide-details
                  label="Fill actor thumbnails"
                  v-model="fillActorCards"
                />
              </div>
            </v-col>
          </v-row>

          <v-subheader>Results per page</v-subheader>
          <v-row>             
            <v-col :cols="4" :sm="4">
              <div>
                <v-text-field
                  :rules="perPageInputRules"
                  color="primary"
                  v-model="scenesPerPage"
                  placeholder="24"
                  label="Scenes per page"
                />
              </div>
            </v-col>
            <v-col :cols="4" :sm="4">
              <div>
                <v-text-field
                  :rules="perPageInputRules"
                  color="primary"
                  v-model="actorsPerPage"
                  placeholder="24"
                  label="Actors per page"
                />
              </div>
            </v-col>
            <v-col :cols="4" :sm="4">
              <div>
                <v-text-field
                  :rules="perPageInputRules"
                  color="primary"
                  v-model="moviesPerPage"
                  placeholder="24"
                  label="Movies per page"
                />
              </div>
            </v-col>
            <v-col :cols="4" :sm="4">
              <div>
                <v-text-field
                  :rules="perPageInputRules"
                  color="primary"
                  v-model="studiosPerPage"
                  placeholder="24"
                  label="Studios per page"
                />
              </div>
            </v-col>
            <v-col :cols="4" :sm="4">
              <div>
                <v-text-field
                  :rules="perPageInputRules"
                  color="primary"
                  v-model="imagesPerPage"
                  placeholder="24"
                  label="Images per page"
                />
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="mt-3">
        <v-card-title>Custom data fields</v-card-title>
        <v-card-text>
          <CustomFieldCreator />
        </v-card-text>
      </v-card>

      <v-card class="mt-3">
        <v-card-title class="pb-0">Porn Vault {{ version }}</v-card-title>
        <v-card-text>
          <div class="mb-3 med--text">by boi123212321</div>

          <v-btn
            class="text-none mr-2 mb-2"
            depressed
            href="https://github.com/boi123212321/porn-vault"
            target="_blank"
          >
            <v-icon left>mdi-github</v-icon>GitHub
          </v-btn>

          <v-btn
            depressed
            href="https://discord.gg/t499hxK"
            target="_blank"
            color="#7289da"
            light
            class="text-none mr-2 mb-2"
          >
            <v-icon left>mdi-discord</v-icon>Discord
          </v-btn>

          <v-btn
            depressed
            href="https://github.com/boi123212321/porn-vault#support"
            target="_blank"
            color="primary"
            class="text-none mb-2"
            :class="$vuetify.theme.dark ? 'black--text' : ''"
          >
            <v-icon left>mdi-currency-btc</v-icon>Support
          </v-btn>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import CustomFieldCreator from "@/components/CustomFieldCreator.vue";
import { contextModule } from "@/store/context";
import { sceneModule } from "@/store/scene";
import { movieModule } from "@/store/movie";
import { imageModule } from "@/store/image";
import { actorModule } from "@/store/actor";
import { studioModule } from "@/store/studio";

@Component({
  components: {
    CustomFieldCreator
  }
})
export default class About extends Vue {
  version = "0.22";

  perPageInputRules = [
    v => (v !> 0) || "Value must be a positive integer",
    v => (!!v.match(/^[0-9]+$/)) || "Value must be a positive integer"    
  ];

  set fillActorCards(val: boolean) {
    localStorage.setItem("pm_fillActorCards", val.toString());
    contextModule.toggleActorCardStyle(val);
  }

  get fillActorCards() {
    return contextModule.fillActorCards;
  }

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

  set scenesPerPage(val: number) {
    localStorage.setItem("pm_scenesPerPage", val.toString());
    contextModule.setScenesPerPage(val);
    sceneModule.resetPagination();
  }

  get scenesPerPage() {
    return contextModule.scenesPerPage;
  }

  set actorsPerPage(val: number) {
    localStorage.setItem("pm_actorsPerPage", val.toString());
    contextModule.setActorsPerPage(val);
    actorModule.resetPagination();
  }

  get actorsPerPage() {
    return contextModule.actorsPerPage;
  }

  set moviesPerPage(val: number) {
    localStorage.setItem("pm_moviesPerPage", val.toString());
    contextModule.setMoviesPerPage(val);
    movieModule.resetPagination();
  }

  get moviesPerPage() {
    return contextModule.moviesPerPage;
  }

  set studiosPerPage(val: number) {
    localStorage.setItem("pm_studiosPerPage", val.toString());
    contextModule.setStudiosPerPage(val);
    studioModule.resetPagination();
  }

  get studiosPerPage() {
    return contextModule.studiosPerPage;
  }

  set imagesPerPage(val: number) {
    localStorage.setItem("pm_imagesPerPage", val.toString());
    contextModule.setImagesPerPage(val);
    imageModule.resetPagination();
  }

  get imagesPerPage() {
    return contextModule.imagesPerPage;
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
