<template>
  <div>
    <v-icon :color="color" v-for="i in Math.floor(value)" :key="i">mdi-star</v-icon>
    <v-icon :color="color" v-if="(value * 2) % 2 != 0">mdi-star-half</v-icon>
    <v-icon :color="color" v-for="i in Math.floor(5 - value)" :key="i">mdi-star-outline</v-icon>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class SceneCard extends Vue {
  @Prop({ default: 0 }) value!: number | null;
  @Prop({ default: "amber" }) color!: string;
}
</script>

<style lang="scss" scoped>
</style>