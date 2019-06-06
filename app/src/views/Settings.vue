<template>
  <v-container>
    <v-subheader>Settings</v-subheader>
    {{ $store.state.globals.settings }}
    <v-checkbox v-model="darkMode" label="Dark Mode"></v-checkbox>

    <v-subheader>Custom data fields</v-subheader>

    <v-list two-line v-if="$store.state.globals.customFields">
      <v-list-tile v-for="field in $store.state.globals.customFields" :key="field.name">
        <v-list-tile-content>
          <v-list-tile-title>{{ field.name }}</v-list-tile-title>
          <v-list-tile-sub-title>
            {{ fields.types.find(t => t.value == field.type).name }}
            <span v-if="field.type > 2">{{ "- " + field.values.join(", ") }}</span>
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>

    <v-text-field v-model="fields.name" clearable label="Field name"></v-text-field>
    <v-select
      v-model="fields.chosenType"
      :items="fields.types"
      item-text="name"
      item-value="value"
      label="Field type"
    ></v-select>

    <v-combobox
      multiple
      clearable
      v-if="fields.chosenType > 2"
      v-model="fields.values"
      chips
      label="Preset values"
    ></v-combobox>
    <v-btn @click="createField">Create data field</v-btn>
  </v-container>
</template>

<script lang="ts">
import Vue from "vue";
import CustomField, { CustomFieldType } from "@/classes/custom_field";
import { toTitleCase } from '../util/string';
import { exportToDisk } from '@/util/library';

// Turn enum into array
function toArray(enumme: any) {
  return Object.keys(enumme)
    .filter((value: any) => isNaN(Number(value)) === false)
    .map(key => enumme[key]);
}

export default Vue.extend({
  data() {
    return {
      fields: {
        name: "",
        chosenType: 0,
        types: [
          {
            name: "String",
            value: 0
          },
          {
            name: "Number",
            value: 1
          },
          {
            name: "Boolean",
            value: 2
          },
          {
            name: "Select",
            value: 3
          },
          {
            name: "Multi-Select",
            value: 4
          }
        ],
        values: []
      }
    };
  },
  computed: {
    darkMode: {
      get(): boolean {
        return this.$store.getters["globals/darkMode"];
      },
      set(val: boolean) {
        this.$store.commit("globals/setDarkMode", val);

        exportToDisk(5000);
      }
    }
  },
  methods: {
    createField() {
      let field = CustomField.create(
        toTitleCase(this.fields.name),
        this.fields.chosenType > 2 ? this.fields.values.map((v: string) => toTitleCase(v)) : null,
        this.fields.chosenType
      );

      this.$store.commit("globals/addCustomField", field);
      this.$store.commit("actors/addCustomField", field);
      this.$store.commit("images/addCustomField", field);
      this.$store.commit("videos/addCustomField", field);

      exportToDisk();
    }
  }
});
</script>

<style>
</style>
