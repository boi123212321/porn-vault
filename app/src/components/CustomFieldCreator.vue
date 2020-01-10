<template>
  <div class="text-left">
    <v-list two-line>
      <v-list-item @click="openCreateDialog">
        <v-list-item-content>
          <v-list-item-title>+ Add</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <CreatedCustomField
        @delete="fields.splice(i, 1)"
        v-model="fields[i]"
        v-for="(field, i) in fields"
        :key="field._id"
      />
    </v-list>

    <v-dialog v-model="createDialog" max-width="400px">
      <v-card :loading="isCreating">
        <v-card-title>Create new custom field</v-card-title>
        <v-card-text>
          <v-text-field
            clearable
            v-model="createFieldName"
            color="accent"
            placeholder="Field name (e.g. Hair color)"
          ></v-text-field>
          <v-select
            color="accent"
            placeholder="Field type"
            :items="createFieldTypes"
            v-model="createFieldType"
            persistent-hint
            :hint="typeHint"
          ></v-select>
          <v-combobox
            chips
            v-if="createFieldType == 'SINGLE_SELECT' || createFieldType == 'MULTI_SELECT'"
            placeholder="Preset values"
            color="accent"
            clearable
            multiple
            v-model="createFieldValues"
          ></v-combobox>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn class="text-none" text color="accent" @click="createField">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import CreatedCustomField from "./CreatedCustomField.vue";

@Component({
  components: {
    CreatedCustomField
  }
})
export default class CustomFieldCreator extends Vue {
  fields = [] as any[];

  isCreating = false;
  createDialog = false;
  createFieldName = "" as string | null;
  createFieldType = "STRING" as string | null;
  createFieldTypes = [
    "NUMBER",
    "STRING",
    "BOOLEAN",
    "SINGLE_SELECT",
    "MULTI_SELECT"
  ];
  createFieldValues = [] as string[];

  createField() {
    if (this.isCreating) return;

    this.isCreating = true;
    setTimeout(() => {
      ApolloClient.mutate({
        mutation: gql`
          mutation(
            $name: String!
            $values: [String!]
            $type: CustomFieldType!
          ) {
            createCustomField(name: $name, values: $values, type: $type) {
              _id
              name
              type
              values
            }
          }
        `,
        variables: {
          name: this.createFieldName,
          type: this.createFieldType,
          values: this.createFieldValues
        }
      })
        .then(res => {
          this.fields.push(res.data.createCustomField);
          this.createFieldName = "";
          this.createFieldValues = [];
          this.createDialog = false;
        })
        .finally(() => {
          this.isCreating = false;
        });
    }, 50);
  }

  get typeHint() {
    switch (this.createFieldType) {
      case "STRING":
        return "Arbitrary string value (e.g. social media link)";
        break;
      case "NUMBER":
        return "Some number (integer or float) (e.g. height in cm)";
        break;
      case "BOOLEAN":
        return "Checkbox (e.g. retired yes/no)";
        break;
      case "SELECT":
        return "Set of values with one possible selected value (e.g. nationality)";
        break;
      case "MULTI_SELECT":
        return "Set of values with more than one possible value (e.g. hair color)";
        break;
    }
  }

  openCreateDialog() {
    this.createDialog = true;
  }

  mounted() {
    ApolloClient.query({
      query: gql`
        {
          getCustomFields {
            _id
            name
            type
            values
          }
        }
      `
    })
      .then(res => {
        this.fields = res.data.getCustomFields;
      })
      .catch(error => {
        console.error(error);
      });
  }
}
</script>

<style lang="scss" scoped>
</style>