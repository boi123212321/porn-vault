<template>
  <v-app>
    <v-app-bar clipped-left elevate-on-scroll app color="primary">
      <v-app-bar-nav-icon @click="navDrawer = true" v-if="$vuetify.breakpoint.xsOnly"></v-app-bar-nav-icon>

      <span v-else>
        <v-btn v-for="item in navItems" :key="item.icon" class="mr-2 text-none" text :to="item.url">
          <v-icon left>{{ item.icon }}</v-icon>
          {{ item.text }}
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

      <template
        v-slot:extension
        v-if="$route.name == 'scene-details' || $route.name == 'actor-details'  || $route.name == 'movie-details'"
      >
        <scene-details-bar v-if="$route.name == 'scene-details'" />
        <actor-details-bar v-else-if="$route.name == 'actor-details'" />
        <movie-details-bar v-else-if="$route.name == 'movie-details'" />
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
      <v-container>
        <router-view />
      </v-container>
    </v-content>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { sceneModule } from "./store/scene";
import { actorModule } from "./store/actor";
import { serverBase } from "./apollo";
import SceneDetailsBar from "./components/AppBar/SceneDetails.vue";
import ActorDetailsBar from "./components/AppBar/ActorDetails.vue";
import MovieDetailsBar from "./components/AppBar/MovieDetails.vue";
import { contextModule } from "./store/context";

@Component({
  components: {
    SceneDetailsBar,
    ActorDetailsBar,
    MovieDetailsBar
  }
})
export default class App extends Vue {
  navDrawer = false;

  get showFilterButton() {
    return (
      this.$route.name == "scenes" ||
      this.$route.name == "actors" ||
      this.$route.name == "images" ||
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