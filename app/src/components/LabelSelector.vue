<template>
  <div>
    <v-list-item-group v-model="innerValue" multiple>
      <v-list>
        <template v-for="label in items">
          <v-list-item :key="label._id" v-show="itemIsFound(label)">
            <template v-slot:default="{ active, toggle }">
              <v-list-item-action>
                <v-checkbox color="accent" v-model="active" @click="toggle"></v-checkbox>
              </v-list-item-action>

              <v-list-item-content>
                <v-list-item-title>{{ label.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ labelAliases(label) }}</v-list-item-subtitle>
              </v-list-item-content>

              <slot :label="label" name="action"></slot>
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-list-item-group>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import ILabel from "../types/label";

@Component
export default class LabelSelector extends Vue {
  @Prop() value!: ILabel[];
  @Prop(Array) items!: ILabel[];
  @Prop({ default: "" }) searchQuery!: string | null;

  itemIsFound(label: ILabel) {
    if (!this.searchQuery) return true;

    const sq = this.searchQuery.toLowerCase();

    return (
      label.name.toLowerCase().includes(sq) ||
      label.aliases.some(name => name.toLowerCase().includes(sq))
    );
  }

  innerValue = (this.value.length ? this.value : []) as ILabel[];

  @Watch("value", { deep: true })
  onValueChange(newVal: ILabel[]) {
    this.innerValue = newVal;
  }

  labelAliases(label: ILabel) {
    return label.aliases
      .slice()
      .sort()
      .join(", ");
  }

  @Watch("innerValue", { deep: true })
  onInnerValueChange() {
    this.$emit("input", this.innerValue);
  }
}
</script>

<style lang="scss" scoped>
</style>