<template>
  <v-app :dark="$store.getters['globals/darkMode']">
    <v-toolbar clipped-right dense style="-webkit-app-region: drag;" dark color="primary" :flat="flatToolbar" app>
      <!-- <v-btn flat to="/">
        <span class="mr-2">Home</span>
      </v-btn>-->
      <v-btn flat to="/videos">
        <span class="mr-2">Videos</span>
      </v-btn>
      <v-btn flat to="/actors">
        <span class="mr-2">Actors</span>
      </v-btn>
      <v-btn flat to="/images">
        <span class="mr-2">Images</span>
      </v-btn>
      <v-btn flat to="/settings">
        <span class="mr-2">Settings</span>
      </v-btn>
    </v-toolbar>

    <v-content>
      <router-view/>
    </v-content>
  </v-app>
</template>

<script>
import * as library from "@/util/library";
import { remote } from "electron";
const { shell } = require("electron");

// DEBUG RIGHT-CLICK
let rightClickPosition = null;
const menu = new remote.Menu();
const menuItem = new remote.MenuItem({
  label: "Inspect Element",
  click: () => {
    remote
      .getCurrentWindow()
      .inspectElement(rightClickPosition.x, rightClickPosition.y);
  }
});
menu.append(menuItem);

window.addEventListener(
  "contextmenu",
  e => {
    e.preventDefault();
    rightClickPosition = { x: e.x, y: e.y };
    menu.popup(remote.getCurrentWindow());
  },
  false
);
//

export default {
  name: "App",
  components: {},
  data() {
    return {};
  },
  methods: {
    
    minimize() {
      remote.BrowserWindow.getFocusedWindow().minimize();
    },
    maximize() {
      remote.BrowserWindow.getFocusedWindow().isMaximized()
        ? remote.BrowserWindow.getFocusedWindow().unmaximize()
        : remote.BrowserWindow.getFocusedWindow().maximize();
    }
  },
  computed: {
    flatToolbar() {
      return (
        this.$route.path.includes("/video/") ||
        this.$route.path.includes("/actor/")
      );
    }
  },
  async beforeMount() {
    library.loadFromDisk();
  }
};
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
