<template>
  <v-row dense>
    <v-col
      class="d-flex align-center"
      v-for="(field, i) in fields"
      :key="field._id"
      cols="12"
      md="6"
      lg="4"
      xl="3"
    >
      <v-subheader class="text-truncate" style="width: 125px">{{ field.name }}</v-subheader>

      <v-checkbox
        class="mt-0"
        v-if="field.type == 'BOOLEAN'"
        v-model="innerValue[field._id]"
        @change="onInnerValueChange"
        color="accent"
        hide-details
        :label="innerValue[field._id]===true ? 'Yes' : 'No'"
      />

      <v-select
        style="width:100%"
        solo
        flat
        single-line
        :multiple="field.type == 'MULTI_SELECT'"
        color="accent"
        v-else-if="field.type.includes('SELECT')"
        :placeholder="field.name"
        v-model="innerValue[field._id]"
        :items="field.values"
        @change="onInnerValueChange"
        hide-details
        :suffix="field.unit"
      />

      <v-text-field
        style="width:100%"
        solo
        flat
        single-line
        v-else
        :placeholder="field.name"
        v-model="innerValue[field._id]"
        @input="onInnerValueChange"
        hide-details
        color="accent"
        :suffix="field.unit"
      />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class CustomFieldSelector extends Vue {
  @Prop({ default: () => ({}) }) value: any;
  @Prop() fields!: any;

  getField(id: string) {
    return this.fields.find(f => f._id == id);
  }

  innerValue = JSON.parse(JSON.stringify(this.value));

  @Watch("value", { deep: true })
  onValueChange(newVal: any) {
    this.innerValue = newVal;
  }

  onInnerValueChange(newVal: any) {
    this.$emit("input", this.innerValue);
    this.$emit("change");
  }
}
</script>

<style lang="scss" scoped>
</style>