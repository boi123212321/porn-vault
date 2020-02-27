<template>
  <v-fade-transition>
    <div v-if="value" class="dvd-render">
      <div class="actions">
        <v-btn class="mr-2" target="_blank" :href="url" icon>
          <v-icon>mdi-link</v-icon>
        </v-btn>
        <v-tooltip left>
          <template v-slot:activator="{ on }">
            <v-btn class="mr-2" v-on="on" @click="toggleMode" icon>
              <v-icon>mdi-theme-light-dark</v-icon>
            </v-btn>
          </template>
          Toggle box color
        </v-tooltip>
        <v-btn @click="$emit('input', false)" icon>
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <iframe script :src="url" frameborder="0"></iframe>
    </div>
  </v-fade-transition>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { serverBase } from "../apollo";

@Component
export default class DVDRenderer extends Vue {
  @Prop({ default: false }) value!: boolean;
  @Prop() movie!: string;

  light = "false";

  toggleMode() {
    if (this.light == "false") this.light = "true";
    else this.light = "false";
  }

  get url() {
    return serverBase + `/dvd-renderer/${this.movie}?light=${this.light}`;
  }
}
</script>

<style lang="scss" scoped>
iframe {
  width: 100%;
  height: 100%;
}

.dvd-render {
  z-index: 999;
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;

  .actions {
    position: absolute;
    top: 5px;
    right: 5px;
  }
}
</style>