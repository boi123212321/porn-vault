<template>
  <v-container>
    <v-btn color="primary" @click="openGithub">
      <v-icon left>mdi-github-circle</v-icon>
      <span>GitHub</span>
    </v-btn>
    <v-subheader>Settings</v-subheader>
    {{ $store.state.globals.settings }}
    <v-checkbox v-model="darkMode" label="Dark Mode"></v-checkbox>

    <v-card>
      <v-card-title>Custom data fields</v-card-title>
      <v-card-text>
        <v-list two-line v-if="$store.state.globals.customFields">
          <v-list-item v-for="field in $store.state.globals.customFields" :key="field.name">
            <v-list-item-content>
              <v-list-item-title>{{ field.name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ fields.types.find(t => t.value == field.type).name }}
                <span
                  v-if="field.type > 2"
                >{{ "- " + field.values.join(", ") }}</span>
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
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
        <v-card-actions>
          <v-btn
            color="primary"
            :disabled="!fields.name || !fields.name.length"
            @click="createField"
          >Create data field</v-btn>
        </v-card-actions>
      </v-card-text>
    </v-card>

    <div class="mt-5">
      <v-btn text :loading="backupLoader" @click="exportBackup">
        <v-icon left>mdi-database</v-icon>create backup
      </v-btn>
    </div>
  </v-container>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import CustomField, { CustomFieldType } from "@/classes/custom_field";
import { toTitleCase } from "../util/string";
import { exportToDisk } from "@/util/library";
import { ncp } from "ncp";
import path from "path";
import fs from "fs";
import rimraf from "rimraf";
const { shell } = require("electron");

// Turn enum into array
function toArray(enumme: any) {
  return Object.keys(enumme)
    .filter((value: any) => isNaN(Number(value)) === false)
    .map(key => enumme[key]);
}

@Component
export default class Settings extends Vue {
  backupLoader = false;

  fields = {
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
    values: [] as any[]
  };

  get darkMode(): boolean {
    return this.$vuetify.theme.dark;
  }

  set darkMode(val: boolean) {
    this.$vuetify.theme.dark = val;
    this.$store.commit("globals/setDarkMode", val);
    exportToDisk(5000);
  }

  openGithub() {
    shell.openExternal("https://github.com/boi123212321/porn-manager");
  }

  exportBackup() {
    const cwd = process.cwd();
    const libraryPath = path.resolve(cwd, "library/");

    if (fs.existsSync(libraryPath)) {
      const backupPath = path.resolve(cwd, "backup/");
      this.backupLoader = true;

      if (fs.existsSync(backupPath)) {
        rimraf.sync(backupPath);
        console.log("Deleted old backup");
      }

      ncp(libraryPath, backupPath, err => {
        console.log("Backup saved.");
        this.backupLoader = false;
      });
    }
  }

  createField() {
    let field = CustomField.create(
      toTitleCase(this.fields.name),
      this.fields.chosenType > 2
        ? this.fields.values.map((v: string) => toTitleCase(v))
        : null,
      this.fields.chosenType
    );

    this.$store.commit("globals/addCustomField", field);
    this.$store.commit("actors/addCustomField", field);
    this.$store.commit("images/addCustomField", field);
    this.$store.commit("videos/addCustomField", field);

    exportToDisk();
  }
}
</script>

<style>
</style>
