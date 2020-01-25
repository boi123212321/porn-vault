import { VuexModule, Module, Mutation, Action } from "vuex-class-modules";

@Module
class ContextModule extends VuexModule {
  showFilters = false;

  sceneAspectRatio = 1;
  actorAspectRatio = 1;
  scenePauseOnUnfocus = false;
  showCardLabels = true;
  scenePerRows = 2;

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
  setscenePerRows(val: number) {
    this.scenePerRows = val;
  }
}

import store from "./index";
export const contextModule = new ContextModule({ store, name: "context" });
