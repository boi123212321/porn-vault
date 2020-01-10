<template>
  <v-list-item>
    <v-list-item-content>
      <v-list-item-title>{{ value.name }}</v-list-item-title>
      <v-list-item-subtitle>{{ value.type }} {{ value.values && value.values.length ? `(${value.values.join(", ")})` : ""}}</v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action>
      <div class="d-flex">
        <!-- <v-btn icon>
          <v-icon>mdi-pencil</v-icon>
        </v-btn>-->
        <v-btn @click="deleteHandler" :color="deleteState == 0 ? 'warning': 'error'" icon>
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </div>
    </v-list-item-action>
  </v-list-item>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class CreatedCustomField extends Vue {
  @Prop() value!: any;

  deleteState = 0;

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