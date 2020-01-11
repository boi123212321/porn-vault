<template>
  <div class="text-left">
    <v-list two-line>
      <v-list-item @click="openCreateDialog">
        <v-list-item-content>
          <v-list-item-title>+ Add</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <CreatedCustomField
        @update="updateField(i, $event)"
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
          <v-form v-model="validated">
            <v-text-field
              clearable
              v-model="createFieldName"
              color="accent"
              placeholder="Field name (e.g. 'Hair color')"
              :rules="fieldNameRules"
            />
            <v-select
              color="accent"
              placeholder="Field type"
              :items="createFieldTypes"
              v-model="createFieldType"
              persistent-hint
              :hint="typeHint"
              item-value="id"
              item-text="text"
            />
            <!-- <v-select
              multiple
              color="accent"
              placeholder="Field target items"
              :items="createFieldTargets"
              v-model="createFieldTarget"
              persistent-hint
              hint="Currently only actors are supported, but more will be supported in the future"
              :rules="v => !!v.length || 'Required'"
            />-->
            <v-text-field
              color="accent"
              placeholder="Unit (e.g. 'inches', optional)"
              v-model="createFieldUnit"
              hide-details
              v-if="createFieldType != 'BOOLEAN'"
            />
            <v-combobox
              chips
              v-if="createFieldType.includes('SELECT')"
              placeholder="Preset values"
              color="accent"
              clearable
              multiple
              v-model="createFieldValues"
              hide-details
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!validated"
            class="text-none"
            text
            color="accent"
            @click="createField"
          >Create</v-btn>
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
  validated = false;

  createDialog = false;
  createFieldName = "" as string | null;
  createFieldType = "STRING" as string | null;
  createFieldTypes = [
    {
      id: "NUMBER",
      text: "Number"
    },
    {
      id: "STRING",
      text: "String"
    },
    {
      id: "BOOLEAN",
      text: "Boolean"
    },
    {
      id: "SINGLE_SELECT",
      text: "Single choice"
    },
    {
      id: "MULTI_SELECT",
      text: "Multiple choice"
    }
  ];
  createFieldTarget = ["ACTORS"] as string[];
  createFieldTargets = [
    "SCENES",
    "ACTORS",
    "MOVIES",
    "IMAGES",
    "STUDIOS",
    "ALBUMS"
  ];
  createFieldValues = [] as string[];
  createFieldUnit = null as string | null;

  fieldNameRules = [v => (!!v && !!v.length) || "Invalid field name"];

  updateField(index: number, field: any) {
    Vue.set(this.fields, index, field);
  }

  createField() {
    if (this.isCreating || !this.validated) return;

    this.isCreating = true;
    setTimeout(() => {
      ApolloClient.mutate({
        mutation: gql`
          mutation(
            $name: String!
            $values: [String!]
            $type: CustomFieldType!
            $unit: String
            $target: [CustomFieldTarget!]!
          ) {
            createCustomField(
              name: $name
              values: $values
              type: $type
              unit: $unit
              target: $target
            ) {
              _id
              name
              type
              values
              unit
              target
            }
          }
        `,
        variables: {
          name: this.createFieldName,
          type: this.createFieldType,
          values: this.createFieldValues,
          unit: this.createFieldUnit,
          target: this.createFieldTarget
        }
      })
        .then(res => {
          this.fields.push(res.data.createCustomField);
          this.createFieldName = "";
          this.createFieldValues = [];
          this.createDialog = false;
          this.createFieldUnit = null;
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
      case "SINGLE_SELECT":
        return "Set of values with one possible selected value (e.g. nationality)";
        break;
      case "MULTI_SELECT":
        return "Set of values with more than one possible value (e.g. hair color)";
        break;
      default:
        return "Oops?";
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
            unit
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