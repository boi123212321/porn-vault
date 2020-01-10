<template>
  <div>
    <template v-for="field in fields">
      <v-checkbox
        :key="field._id"
        v-if="field.type == 'BOOLEAN'"
        v-model="innerValue[field._id]"
        @change="onInnerValueChange"
        color="accent"
        :label="field.name"
        hide-details
      ></v-checkbox>

      <v-select
        :multiple="field.type == 'MULTI_SELECT'"
        color="accent"
        clearable
        v-else-if="field.type == 'SINGLE_SELECT' || field.type == 'MULTI_SELECT'"
        :placeholder="field.name"
        v-model="innerValue[field._id]"
        :items="field.values"
        :key="field._id"
        @change="onInnerValueChange"
        hide-details
      ></v-select>

      <v-text-field
        v-else
        :placeholder="field.name"
        clearable
        v-model="innerValue[field._id]"
        :key="field._id"
        @input="onInnerValueChange"
        hide-details
        color="accent"
      ></v-text-field>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class CustomFieldSelector extends Vue {
  @Prop({ default: () => ({}) }) value: any;
  @Prop() fields!: any;

  innerValue = JSON.parse(JSON.stringify(this.value));

  @Watch("value", { deep: true })
  onValueChange(newVal: any) {
    this.innerValue = newVal;
  }

  onInnerValueChange(newVal: any) {
    this.$emit("input", this.innerValue);
  }
}
</script>

<style lang="scss" scoped>
</style>