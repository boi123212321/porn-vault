<template>
  <div>
    <v-autocomplete
      solo
      flat
      single-line
      color="primary"
      v-model="innerValue"
      :items="items"
      item-text="name"
      item-value="_id"
      multiple
      clearable
      label="Select labels"
      @change="onChange"
      hide-details
      class="mb-2 mt-0 pt-2"
    >
      <template v-slot:selection="{ index }">
        <span v-if="index == 0">{{ innerValue.length }} labels selected</span>
      </template>
    </v-autocomplete>
    <span v-for="label in items" :key="label._id">
      <v-menu offset-y bottom v-if="isUsed(label._id)">
        <template v-slot:activator="{ on }">
          <v-chip
            v-on="on"
            v-ripple
            class="mr-1 mb-1 hover"
            small
            :color="isIncluded(label._id) ? 'primary' : 'error'"
          >
            <span class="black--text">{{ label.name }}</span>
            <v-icon class="black--text" dark small right>mdi-chevron-down</v-icon>
          </v-chip>
        </template>

        <v-list>
          <v-list-item @click="toggleLabel(label._id)">
            <v-list-item-title>{{ isExcluded(label._id) ? 'Include' : 'Exclude' }}</v-list-item-title>
          </v-list-item>
          <v-list-item @click="removeLabel(label._id)">
            <v-list-item-title>Remove</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </span>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import ILabel from "../types/label";
import { copy } from "../util/object";

function arrayToObject(arr: string[]) {
  let obj = {} as Record<string, boolean>;
  for (const str of arr) {
    obj[str] = true;
  }
  return obj;
}

@Component
export default class LabelFilter extends Vue {
  @Prop({ default: () => [] }) value!: any;
  @Prop({ default: () => [] }) items!: ILabel[];

  @Watch("value", { deep: true })
  onValueChange(val: any) {
    this.include = arrayToObject(this.value.include);
    this.exclude = arrayToObject(this.value.exclude);
  }

  innerValue = [...this.value.include, ...this.value.exclude] as string[];
  include = arrayToObject(this.value.include) as Record<string, boolean>;
  exclude = arrayToObject(this.value.exclude) as Record<string, boolean>;

  emit() {
    this.$emit("input", {
      include: Object.keys(this.include),
      exclude: Object.keys(this.exclude)
    });
  }

  onChange(ids: string[]) {
    const newIncluded = {};
    const newExcluded = {};
    for (const id of ids) {
      const label = <ILabel>this.items.find(l => l._id == id);
      if (!this.isUsed(id) || this.isIncluded(id)) newIncluded[id] = label;
      else if (this.isExcluded(id)) newExcluded[id] = label;
    }
    this.include = newIncluded;
    this.exclude = newExcluded;
    this.emit();
  }

  isUsed(id: string) {
    return !!this.include[id] || !!this.exclude[id];
  }

  isExcluded(id: string) {
    return !!this.exclude[id];
  }

  isIncluded(id: string) {
    return !!this.include[id];
  }

  removeLabel(id: string) {
    delete this.include[id];
    delete this.exclude[id];
    this.innerValue = this.innerValue.filter(l => l != id);
    this.emit();
  }

  toggleLabel(id: string) {
    if (this.isIncluded(id)) {
      delete this.include[id];
      this.exclude[id] = true;
    } else {
      delete this.exclude[id];
      this.include[id] = true;
    }
    this.emit();
  }
}
</script>

<style lang="scss" scoped>
</style>