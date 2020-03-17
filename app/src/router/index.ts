import Vue from "vue";
import VueRouter from "vue-router";
import Home from "../views/Home.vue";
import About from "../views/About.vue";
import Scenes from "../views/Scenes.vue";
import Actors from "../views/Actors.vue";
import Movies from "../views/Movies.vue";
import SceneDetails from "../views/SceneDetails.vue";
import ActorDetails from "../views/ActorDetails.vue";
import MovieDetails from "../views/MovieDetails.vue";
import StudioDetails from "../views/StudioDetails.vue";
import Labels from "../views/Labels.vue";
import Images from "../views/Images.vue";
import Studios from "../views/Studios.vue";
import Plugins from "../views/Plugins.vue";
import Graph from "../views/Graph.vue";
import Logs from "../views/Logs.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "home",
    component: Home
  },
  {
    path: "/logs",
    name: "logs",
    component: Logs
  },
  {
    path: "/home",
    name: "home",
    component: Home
  },
  {
    path: "/plugins",
    name: "plugins",
    component: Plugins
  },
  {
    path: "/graph",
    name: "graph",
    component: Graph
  },
  {
    path: "/about",
    name: "about",
    component: About
  },
  {
    path: "/settings",
    name: "settings",
    component: About
  },
  {
    path: "/scenes",
    name: "scenes",
    component: Scenes
  },
  {
    path: "/actors",
    name: "actors",
    component: Actors
  },
  {
    path: "/movies",
    name: "movies",
    component: Movies
  },
  {
    path: "/studios",
    name: "studios",
    component: Studios
  },
  {
    path: "/scene/:id",
    name: "scene-details",
    component: SceneDetails
  },
  {
    path: "/actor/:id",
    name: "actor-details",
    component: ActorDetails
  },
  {
    path: "/movie/:id",
    name: "movie-details",
    component: MovieDetails
  },
  {
    path: "/studio/:id",
    name: "studio-details",
    component: StudioDetails
  },
  {
    path: "/labels",
    name: "labels",
    component: Labels
  },
  {
    path: "/images",
    name: "images",
    component: Images
  },
  {
    path: "*",
    redirect: "/"
  }
];

const router = new VueRouter({
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { x: 0, y: 0 };
    }
  }
});

export default router;
