<template>
  <span></span>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from "vue-property-decorator";

@Component({})
export default class BindTitle extends Vue {
  @Prop(String) value!: string;

  mounted() {
    document.title = this.value || "";
  }

  @Watch("value")
  onValueChange(newVal: string) {
    document.title = newVal;
  }
}
</script>
