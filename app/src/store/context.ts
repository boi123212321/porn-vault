import { VuexModule, Module, Mutation, Action } from "vuex-class-modules";

@Module
class ContextModule extends VuexModule {
  showFilters = false;

  sceneAspectRatio = 1;
  actorAspectRatio = 1;
  scenesPerPage = 24;
  actorsPerPage = 24;
  moviesPerPage = 24;
  studiosPerPage = 24;
  imagesPerPage = 24;
  scenePauseOnUnfocus = false;
  showCardLabels = true;

  fillActorCards = true;

  showSidenav = true; // TODO: store and load from localStorage

  @Mutation
  toggleSidenav(bool: boolean) {
    this.showSidenav = bool;
  }

  @Mutation
  toggleActorCardStyle(bool: boolean) {
    this.fillActorCards = bool;
  }

  @Mutation
  toggleCardLabels(bool: boolean) {
    this.showCardLabels = bool;
  }

  @Mutation
  toggleFilters(bool: boolean) {
    this.showFilters = bool;
  }

  @Mutation
  setScenePauseOnUnfocus(val: boolean) {
    this.scenePauseOnUnfocus = val;
  }

  @Mutation
  setSceneAspectRatio(val: number) {
    this.sceneAspectRatio = val;
  }

  @Mutation
  setActorAspectRatio(val: number) {
    this.actorAspectRatio = val;
  }

  @Mutation
  setScenesPerPage(val: number) {
    this.scenesPerPage = val;
  }

  @Mutation
  setActorsPerPage(val: number) {
    this.actorsPerPage = val;
  }
  
  @Mutation
  setMoviesPerPage(val: number) {
    this.moviesPerPage = val;
  }

  @Mutation
  setStudiosPerPage(val: number) {
    this.studiosPerPage = val;
  }
  
  @Mutation
  setImagesPerPage(val: number) {
    this.imagesPerPage = val;
  }
}

import store from "./index";
export const contextModule = new ContextModule({ store, name: "context" });
