<template>
  <v-app>
    <v-app-bar :hide-on-scroll="showDetailsBar" dense style="z-index: 13" clipped-left app :color="appbarColor">
      <v-btn icon to="/" v-if="$vuetify.breakpoint.smAndUp">
        <v-icon>mdi-home</v-icon>
      </v-btn>

      <v-divider class="mx-2" inset vertical v-if="$vuetify.breakpoint.smAndUp"></v-divider>

      <div
        style="overflow: hidden; text-overflow: ellipsis"
        class="d-flex align-center"
        v-if="$vuetify.breakpoint.xsOnly"
      >
        <v-app-bar-nav-icon class="mr-2" @click="navDrawer = true"></v-app-bar-nav-icon>
        <v-toolbar-title v-if="currentScene" class="mr-1 title">{{ currentScene.name }}</v-toolbar-title>
        <v-toolbar-title v-if="currentActor" class="mr-1 title">
          {{ currentActor.name }}
          <span
            class="subtitle-1 med--text"
            v-if="currentActor.bornOn"
          >({{ age }})</span>
        </v-toolbar-title>
        <v-toolbar-title v-if="currentMovie" class="mr-1 title">{{ currentMovie.name }}</v-toolbar-title>
        <v-toolbar-title v-if="currentStudio" class="mr-1 title">{{ currentStudio.name }}</v-toolbar-title>
      </div>

      <span v-else>
        <v-btn
          :icon="$vuetify.breakpoint.smAndDown"
          v-for="item in navItems"
          :key="item.icon"
          class="mr-2 text-none"
          text
          :to="item.url"
        >
          <v-icon :left="$vuetify.breakpoint.mdAndUp">{{ item.icon }}</v-icon>
          <span v-if="$vuetify.breakpoint.mdAndUp">{{ item.text }}</span>
        </v-btn>
      </span>

      <v-spacer></v-spacer>

      <v-btn
        v-if="showFilterButton && $vuetify.breakpoint.mdAndDown"
        icon
        @click="filterDrawer = !filterDrawer"
      >
        <v-icon>mdi-filter</v-icon>
      </v-btn>

      <v-btn icon to="/settings">
        <v-icon>mdi-settings</v-icon>
      </v-btn>

      <template v-slot:extension v-if="showDetailsBar">
        <scene-details-bar v-if="$route.name == 'scene-details'" />
        <actor-details-bar v-else-if="$route.name == 'actor-details'" />
        <movie-details-bar v-else-if="$route.name == 'movie-details'" />
        <studio-details-bar v-else-if="$route.name == 'studio-details'" />
      </template>
    </v-app-bar>

    <v-navigation-drawer style="z-index: 14" temporary app v-model="navDrawer">
      <v-list nav>
        <v-list-item :to="item.url" v-for="item in navItems" :key="item.icon">
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>

          <v-list-item-content>{{ item.text }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-content>
      <router-view />
    </v-content>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { sceneModule } from "./store/scene";
import { actorModule } from "./store/actor";
import { movieModule } from "./store/movie";
import { studioModule } from "./store/studio";
import { serverBase } from "./apollo";
import SceneDetailsBar from "./components/AppBar/SceneDetails.vue";
import ActorDetailsBar from "./components/AppBar/ActorDetails.vue";
import MovieDetailsBar from "./components/AppBar/MovieDetails.vue";
import StudioDetailsBar from "./components/AppBar/StudioDetails.vue";
import { contextModule } from "./store/context";
import moment from "moment";
import { ensureDarkColor } from "./util/color";

@Component({
  components: {
    SceneDetailsBar,
    ActorDetailsBar,
    MovieDetailsBar,
    StudioDetailsBar
  }
})
export default class App extends Vue {
  navDrawer = false;

  get appbarColor() {
    let color;
    if (this.currentActor && this.currentActor.thumbnail)
      return this.currentActor.thumbnail.color;
    if (this.currentScene && this.currentScene.thumbnail)
      return this.currentScene.thumbnail.color;
    if (this.currentMovie && this.currentMovie.frontCover)
      return this.currentMovie.frontCover.color;
    if (this.currentStudio && this.currentStudio.thumbnail)
      return this.currentStudio.thumbnail.color;

    return color ? ensureDarkColor(color) : undefined;
  }

  get age() {
    if (this.currentActor && this.currentActor.bornOn) {
      return moment().diff(this.currentActor.bornOn, "years");
    }
    return -1;
  }

  get showDetailsBar() {
    return (
      this.$route.name == "scene-details" ||
      this.$route.name == "actor-details" ||
      this.$route.name == "studio-details" ||
      this.$route.name == "movie-details"
    );
  }

  get currentStudio() {
    return studioModule.current;
  }

  get currentActor() {
    return actorModule.current;
  }

  get currentMovie() {
    return movieModule.current;
  }

  get currentScene() {
    return sceneModule.current;
  }

  get showFilterButton() {
    return (
      this.$route.name == "scenes" ||
      this.$route.name == "actors" ||
      this.$route.name == "images" ||
      this.$route.name == "studios" ||
      this.$route.name == "movies"
    );
  }

  get filterDrawer() {
    return contextModule.showFilters;
  }

  set filterDrawer(val: boolean) {
    contextModule.toggleFilters(val);
  }

  beforeCreate() {
    // @ts-ignore
    if (this.$route.query.password) {
      // @ts-ignore
      localStorage.setItem("password", this.$route.query.password);
    }

    const darkModeLocalStorage = localStorage.getItem("pm_darkMode");
    if (darkModeLocalStorage) {
      // @ts-ignore
      this.$vuetify.theme.dark = darkModeLocalStorage == "true";
    }

    const fillActorCardsLocalStorage = localStorage.getItem(
      "pm_fillActorCards"
    );
    if (fillActorCardsLocalStorage) {
      // @ts-ignore
      contextModule.toggleActorCardStyle(fillActorCardsLocalStorage == "true");
    }

    const sceneRatioLocalStorage = localStorage.getItem("pm_sceneRatio");
    if (sceneRatioLocalStorage) {
      contextModule.setSceneAspectRatio(parseFloat(sceneRatioLocalStorage));
    }

    const actorRatioLocalStorage = localStorage.getItem("pm_actorRatio");
    if (actorRatioLocalStorage) {
      contextModule.setActorAspectRatio(parseFloat(actorRatioLocalStorage));
    }

    const scenePauseOnUnfocusLocalStorage = localStorage.getItem(
      "pm_scenePauseOnUnfocus"
    );
    if (scenePauseOnUnfocusLocalStorage) {
      contextModule.setScenePauseOnUnfocus(
        scenePauseOnUnfocusLocalStorage == "true"
      );
    }

    const showCardLabelsLocalStorage = localStorage.getItem(
      "pm_showCardLabels"
    );
    if (showCardLabelsLocalStorage) {
      contextModule.toggleCardLabels(showCardLabelsLocalStorage == "true");
    }
  }

  navItems = [
    {
      icon: "mdi-camcorder-box",
      text: "Scenes",
      url: "/scenes"
    },
    {
      icon: "mdi-account-multiple",
      text: "Actors",
      url: "/actors"
    },
    {
      icon: "mdi-filmstrip",
      text: "Movies",
      url: "/movies"
    },
    {
      icon: "mdi-label",
      text: "Labels",
      url: "/labels"
    },
    {
      icon: "mdi-camera",
      text: "Studios",
      url: "/studios"
    },
    {
      icon: "mdi-image",
      text: "Images",
      url: "/images"
    }
  ];
}
</script>

<style lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.hover {
  transition: filter 0.1s ease-in-out;
  &:hover {
    cursor: pointer;
    filter: brightness(0.75);
  }
}

.med--text {
  opacity: 0.6;
}
</style>
