<template>
  <v-list-item>
    <v-list-item-content>
      <v-list-item-title>{{ value.name }}</v-list-item-title>
      <v-list-item-subtitle>{{ value.type }} {{ value.values && value.values.length ? `(${value.values.join(", ")})` : ""}}</v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action>
      <div class="d-flex">
        <v-btn icon @click="openEditDialog">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn @click="deleteHandler" :color="deleteState == 0 ? 'warning': 'error'" icon>
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </div>
    </v-list-item-action>

    <v-dialog v-model="editDialog" max-width="400px">
      <v-card :loading="isEditing">
        <v-card-title>Edit field: '{{ value.name }}'</v-card-title>
        <v-card-text>
          <v-form v-model="validEdit">
            <v-text-field
              :rules="fieldNameRules"
              color="accent"
              v-model="editName"
              placeholder="Field name"
              hide-details
            />
            <v-combobox
              chips
              v-if="value.type == 'SINGLE_SELECT' || value.type == 'MULTI_SELECT'"
              placeholder="Preset values"
              color="accent"
              clearable
              multiple
              v-model="editValues"
              hide-details
            />
            <v-text-field
              v-if="value.type != 'BOOLEAN'"
              color="accent"
              placeholder="Unit (optional)"
              v-model="editUnit"
              hide-details
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="edit" :disabled="!validEdit" text color="accent" class="text-none">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-list-item>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class CreatedCustomField extends Vue {
  @Prop() value!: any;
  editDialog = false;
  isEditing = false;
  validEdit = false;

  editName = "" as string | null;
  editUnit = null as string | null;
  editValues = [] as string[];

  fieldNameRules = [v => (!!v && !!v.length) || "Invalid field name"];

  deleteState = 0;

  edit() {
    if (!this.validEdit) return;

    this.isEditing = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $id: String!
          $name: String
          $values: [String!]
          $unit: String
        ) {
          updateCustomField(
            id: $id
            name: $name
            values: $values
            unit: $unit
          ) {
            _id
            name
            type
            values
            unit
          }
        }
      `,
      variables: {
        id: this.value._id,
        name: this.editName,
        values: this.editValues,
        unit: this.editUnit
      }
    })
      .then(res => {
        this.$emit("update", res.data.updateCustomField);
        this.editDialog = false;
      })
      .finally(() => {
        this.isEditing = false;
      });
  }

  openEditDialog() {
    this.editDialog = true;
    this.editName = this.value.name;
    this.editUnit = this.value.unit;
    this.editValues = this.value.values || [];
  }

  deleteHandler() {
    if (this.deleteState == 0) {
      this.deleteState++;
      setTimeout(() => {
        this.deleteState = 0;
      }, 2500);
    } else {
      ApolloClient.mutate({
        mutation: gql`
          mutation($id: String!) {
            removeCustomField(id: $id)
          }
        `,
        variables: {
          id: this.value._id
        }
      }).then(res => {
        this.$emit("delete");
      });
    }
  }
}
</script>

<style lang="scss" scoped>
</style>