<template>
  <v-card light width="100%" height="100%" v-if="image" outlined>
    <v-img
      eager
      class="hover"
      :src="imageLink(image)"
      :alt="image.name"
      :title="image.name"
      width="100%"
      height="100%"
      min-height="100px"
      @click="$emit('open')"
      v-ripple
    >
      <div class="corner-actions">
        <slot name="action"></slot>
      </div>

      <template v-slot:placeholder>
        <v-skeleton-loader width="100%" height="100%" tile loading type="image"></v-skeleton-loader>
      </template>
    </v-img>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";

@Component
export default class ImageCard extends Vue {
  @Prop(Object) image!: any;

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }
}
</script>

<style lang="scss" scoped>
.corner-actions {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>