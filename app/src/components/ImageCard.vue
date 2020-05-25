<template>
  <v-card width="100%" height="100%" v-if="image" outlined>
    <v-img
      eager
      class="hover"
      :src="imageLink(image)"
      :alt="image.name"
      width="100%"
      height="100%"
      min-height="100px"
      @click="$emit('open')"
      v-ripple
      :contain="contain"
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
import IImage from "../types/image";

@Component
export default class ImageCard extends Vue {
  @Prop(Object) image!: IImage;
  @Prop({ default: false }) contain!: boolean;

  imageLink(image: IImage) {
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