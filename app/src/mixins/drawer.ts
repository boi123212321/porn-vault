// mixin.js
import Vue from "vue";
import Component from "vue-class-component";
import { contextModule } from "../store/context";

@Component
export default class DrawerMixin extends Vue {
  get drawer() {
    return this.$vuetify.breakpoint.lgAndUp || contextModule.showFilters;
  }

  set drawer(val: boolean) {
    contextModule.toggleFilters(val);
  }
}
