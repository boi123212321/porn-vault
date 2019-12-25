<template>
  <v-card>
    <v-card-title>Upload image(s)</v-card-title>
    <v-card-text style="max-height: 400px">
      <v-file-input
        accept="image/*"
        color="accent"
        v-model="files"
        multiple
        @change="addFiles"
        placeholder="Select file(s)"
      ></v-file-input>
      <div>
        <div class="mb-2 d-flex align-center" v-for="(item, i) in uploadItems" :key="item.b64">
          <v-avatar tile size="80">
            <v-img :src="item.b64"></v-img>
          </v-avatar>
          <v-text-field color="accent" class="ml-2" hide-details v-model="uploadItems[i].name"></v-text-field>
          <v-spacer></v-spacer>
          <v-btn icon @click="uploadItems.splice(i, 1)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
      <div>{{ uploadQueue.length }} images queued.</div>
      <div v-if="isUploading && uploadQueue.length">Uploading {{ uploadQueue[0].name }}...</div>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn @click="addToQueue" text color="accent" class="text-none">Add</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import imageFragment from "../fragments/image";
import gql from "graphql-tag";

@Component
export default class ImageUploader extends Vue {
  @Prop({ default: null }) scene!: string | null;
  @Prop({ default: null }) name!: string | null;
  @Prop({ default: () => [] }) actors!: string[];
  @Prop({ default: () => [] }) labels!: string[];

  files = [] as File[];
  uploadItems = [] as { file: File; b64: string; name: string }[];

  uploadQueue = [] as { file: File; b64: string; name: string }[];
  isUploading = false;

  readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) resolve(reader.result.toString());
        else reject("File error");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async addFiles(files: File[]) {
    for (const file of files) {
      const b64 = await this.readImage(file);

      if (this.uploadItems.find(i => i.b64 == b64)) continue;

      this.uploadItems.push({
        file,
        b64,
        name: file.name
      });
    }

    this.files = [];
  }

  addToQueue() {
    this.uploadQueue.push(...this.uploadItems);
    this.uploadItems = [];
    if (!this.isUploading) this.upload(this.uploadQueue[0]);
  }

  upload(image: { file: File; b64: string; name: string }) {
    this.isUploading = true;
    this.$emit("update-state", true);

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $scene: String
          $actors: [String!]
          $labels: [String!]
        ) {
          uploadImage(
            file: $file
            name: $name
            scene: $scene
            actors: $actors
            labels: $labels
          ) {
            ...ImageFragment
            actors {
              ...ActorFragment
            }
            scene {
              _id
              name
            }
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: image.file,
        name: this.name || image.name,
        scene: this.scene,
        actors: this.actors,
        labels: this.labels
      },
      context: {
        hasUpload: true
      }
    })
      .then(res => {
        this.$emit("uploaded", res.data.uploadImage);
        this.uploadQueue.shift();

        if (this.uploadQueue.length) {
          this.upload(this.uploadQueue[0]);
        } else this.$emit("update-state", false);
      })
      .catch(err => {
        console.error(err);
        this.uploadQueue = [];
        this.isUploading = false;
        this.$emit("update-state", false);
        this.uploadItems.push(...this.uploadQueue);
      });
  }
}
</script>

<style lang="scss" scoped>
</style>