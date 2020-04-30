<template>
  <div>
    <v-icon
      :color="color"
      @click="onClick($event, i)"
      :class="readonly ? 'no-cursor' : 'hover'"
      v-for="i in 5"
      :key="i"
    >{{ icon(i) }}</v-icon>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";

@Component
export default class Rating extends Vue {
  @Prop({ default: 0 }) value!: number | null;
  @Prop({ default: "amber" }) color!: string;
  @Prop({ default: false }) readonly!: boolean;

  icon(index: number) {
    if (index * 2 <= (this.value || 0)) return "mdi-star";
    if (this.value && this.value % 2 == 1 && index * 2 == this.value + 1)
      return "mdi-star-half-full";
    return "mdi-star-outline";
  }

  onClick(event: any, index: number) {
    if (this.readonly) return;

    const clickTarget = event.target as any;
    const clickTargetWidth = clickTarget.offsetWidth;
    const xCoordInClickTarget =
      event.clientX - clickTarget.getBoundingClientRect().left;

    let computedValue;
    if (clickTargetWidth / 2 > xCoordInClickTarget) {
      // clicked left
      computedValue = index * 2 - 1;
    } else {
      // clicked right
      computedValue = index * 2;
    }

    if (this.value == computedValue) {
      this.$emit("input", 0);
      this.$emit("change", 0);
    } else {
      this.$emit("input", computedValue);
      this.$emit("change", computedValue);
    }
  }
}
</script>

<style lang="scss" scoped>
.no-cursor {
  cursor: default !important;
}
</style>