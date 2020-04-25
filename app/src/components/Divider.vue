<template>
  <div class="mt-3 mb-2 med--text d-flex align-center">
    <v-icon class="mr-2">{{ icon }}</v-icon>
    <span class="mr-2 body-2">
      <slot />
    </span>
    <v-divider></v-divider>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class Divider extends Vue {
  @Prop({ default: "changehere" }) icon!: string;
}
</script>

