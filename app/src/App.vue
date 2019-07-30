<template>
  <v-app :dark="$vuetify.theme.dark">
    <v-app-bar
      elevate-on-scroll
      clipped-right
      dense
      style="-webkit-app-region: drag;"
      dark
      color="primary"
      app
    >
      <v-btn v-for="btn in toolbarItems" :key="btn.label" class="mr-2" text :to="btn.to">
        <span>{{ btn.label }}</span>
      </v-btn>
    </v-app-bar>

    <v-content>
      <router-view />
    </v-content>
  </v-app>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import * as library from "@/util/library";
import { remote } from "electron";
const { shell } = require("electron");

// DEBUG RIGHT-CLICK
let rightClickPosition = null as null | { x: number; y: number };
const menu = new remote.Menu();
const menuItem = new remote.MenuItem({
  label: "Inspect Element",
  click: () => {
    remote
      .getCurrentWindow()
      .webContents.inspectElement(rightClickPosition.x, rightClickPosition.y);
  }
});
menu.append(menuItem);

window.addEventListener(
  "contextmenu",
  e => {
    e.preventDefault();
    rightClickPosition = { x: e.x, y: e.y };
    menu.popup({ window: remote.getCurrentWindow() });
  },
  false
);

@Component({
  components: {}
})
export default class App extends Vue {
  toolbarItems = [
    /*{
      to: "/",
      label: "Home"
    },*/
    {
      to: "/videos",
      label: "Videos"
    },
    {
      to: "/actors",
      label: "Actors"
    },
    {
      to: "/images",
      label: "Images"
    },
    {
      to: "/settings",
      label: "Settings"
    }
  ];

  minimize() {
    remote.BrowserWindow.getFocusedWindow().minimize();
  }

  maximize() {
    remote.BrowserWindow.getFocusedWindow().isMaximized()
      ? remote.BrowserWindow.getFocusedWindow().unmaximize()
      : remote.BrowserWindow.getFocusedWindow().maximize();
  }

  async beforeMount() {
    await library.loadFromDisk();
    this.$vuetify.theme.dark = this.$store.state.globals.settings.darkMode;
  }
}
</script>

<style lang="scss">
.clickable {
  cursor: pointer;
}
/* width */
::-webkit-scrollbar {
  width: 12px;
}

/* Track */
::-webkit-scrollbar-track {
  background: #f1f1f1;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: #888;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.sec--text {
  opacity: 0.6;
}

.fixed {
  position: fixed;
}

.fill {
  width: 100%;
  height: 100%;

  &.fixed {
    left: 0;
    top: 0;
  }
}

.center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.fixed-center {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
