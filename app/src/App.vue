<template>
  <v-app>
    <v-app-bar clipped-left elevate-on-scroll app color="primary">
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
        v-if="showFilterButton && $vuetify.breakpoint.smAndDown"
        icon
        @click="filterDrawer = !filterDrawer"
      >
        <v-icon>mdi-filter</v-icon>
      </v-btn>

      <template v-slot:extension v-if="showDetailsBar">
        <scene-details-bar v-if="$route.name == 'scene-details'" />
        <actor-details-bar v-else-if="$route.name == 'actor-details'" />
        <movie-details-bar v-else-if="$route.name == 'movie-details'" />
        <studio-details-bar v-else-if="$route.name == 'studio-details'" />
      </template>
    </v-app-bar>

    <v-navigation-drawer temporary app v-model="navDrawer">
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
      <v-container :fluid="$vuetify.breakpoint.xlOnly">
        <router-view />
      </v-container>
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
    if ((<any>this).$route.query.password) {
      localStorage.setItem("password", (<any>this).$route.query.password);
    }

    const darkModeLocalStorage = localStorage.getItem("pm_darkMode");
    if (darkModeLocalStorage) {
      this.$vuetify.theme.dark = darkModeLocalStorage == "true";
    }

    const sceneRatioLocalStorage = localStorage.getItem("pm_sceneRatio");
    if (sceneRatioLocalStorage) {
      contextModule.setSceneAspectRatio(parseFloat(sceneRatioLocalStorage));
    }

    const actorRatioLocalStorage = localStorage.getItem("pm_actorRatio");
    if (actorRatioLocalStorage) {
      contextModule.setActorAspectRatio(parseFloat(actorRatioLocalStorage));
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
    },
    {
      icon: "mdi-information",
      text: "About",
      url: "/about"
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
  &:hover {
    cursor: pointer;
  }
}

.med--text {
  opacity: 0.6;
}
</style>