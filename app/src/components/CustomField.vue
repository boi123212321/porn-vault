<template>
  <div>
    <v-layout row wrap>
      <v-flex xs6 sm4>
        <v-subheader class="pl-0">{{ field.name }}</v-subheader>
      </v-flex>
      <v-flex xs6 sm8 class="mr-1" v-if="field.mode !== undefined">
        <v-select
          :items="filterModes"
          item-text="name"
          item-value="value"
          :value="field.mode"
          label="Filter mode"
          hide-details
          @change="$emit('change', { key: field.name, value: field.value, mode: $event })"
        ></v-select>
      </v-flex>
      <v-flex xs6 sm8>
        <v-text-field
          :value="value"
          label="Enter string"
          clearable
          @input="$emit('change', { key: field.name, value: $event, mode: field.mode })"
          v-if="field.type === 0"
        />
        <v-text-field
          :value="value"
          type="number"
          label="Enter number"
          clearable
          @input="$emit('change', { key: field.name, value: parseInt($event), mode: field.mode })"
          v-if="field.type === 1"
        />
        <v-checkbox
          v-else-if="field.type === 2"
          :value="value"
          label="Set value"
          @change="$emit('change', { key: field.name, value: $event || false, mode: field.mode })"
        ></v-checkbox>
        <v-select
          v-else-if="field.type === 3"
          v-model="internalValue"
          :items="field.values"
          label="Select value"
          clearable
          @change="$emit('change', { key: field.name, value: internalValue, mode: field.mode })"
        />
        <v-select
          v-else-if="field.type === 4"
          v-model="internalValue"
          :items="field.values"
          label="Select value(s)"
          multiple
          chips
          clearable
          @change="$emit('change', { key: field.name, value: internalValue, mode: field.mode })"
        />
      </v-flex>
    </v-layout>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import CustomField, { CustomFieldType } from "@/classes/custom_field";

export default Vue.extend({
  props: ["field", "value"],
  data() {
    return {
      internalValue: this.value
    };
  },
  computed: {
    filterModes() {
      switch (this.field.type) {
        case CustomFieldType.STRING:
          return [
            {
              name: "None",
              value: 0
            },
            {
              name: "Equals",
              value: 1
            },
            {
              name: "Includes",
              value: 2
            }
          ];
          break;
        case CustomFieldType.NUMBER:
          return [
            {
              name: "None",
              value: 0
            },
            {
              name: "Equals",
              value: 1
            },
            {
              name: "Greater",
              value: 3
            },
            {
              name: "Lesser",
              value: 4
            }
          ];
          break;
        case CustomFieldType.BOOLEAN:
          return [
            {
              name: "None",
              value: 0
            },
            {
              name: "Equals",
              value: 2
            }
          ];
          break;
        case CustomFieldType.SELECT:
          return [
            {
              name: "None",
              value: 0
            },
            {
              name: "Equals",
              value: 2
            }
          ];
          break;
        case CustomFieldType.MULTI_SELECT:
          return [
            {
              name: "None",
              value: 0
            },
            {
              name: "Includes",
              value: 2
            },
            {
              name: "Includes some",
              value: 5
            }
          ];
          break;
        default:
          return [];
      }
    }
  }
});
</script>

<style lang="scss" scoped>
</style>
