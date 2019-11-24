<template>
  <v-card>
    <v-card-title>Upload scene(s)</v-card-title>
    <v-card-text style="max-height: 400px">
      <v-file-input
        accept="video/*"
        color="accent"
        v-model="files"
        multiple
        @change="addFiles"
        placeholder="Select file(s)"
      ></v-file-input>
      <div>
        <div
          class="mb-2 d-flex align-center"
          v-for="(item, i) in uploadItems"
          :key="item.file.name"
        >
          <v-text-field color="accent" class="ml-2" hide-details v-model="uploadItems[i].name"></v-text-field>
          <v-spacer></v-spacer>
          <v-btn icon @click="uploadItems.splice(i, 1)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
      <div>{{ uploadQueue.length }} scenes queued.</div>
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
import sceneFragment from "../fragments/scene";
import actorFragment from "../fragments/actor";
import gql from "graphql-tag";

@Component
export default class ImageUploader extends Vue {
  files = [] as File[];
  uploadItems = [] as { file: File; name: string }[];

  uploadQueue = [] as { file: File; name: string }[];
  isUploading = false;

  async addFiles(files: File[]) {
    for (const file of files) {
      this.uploadItems.push({
        file,
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

  upload(scene: { file: File; name: string }) {
    this.isUploading = true;
    this.$emit("update-state", true);

    console.log("Uploading...");

    ApolloClient.mutate({
      mutation: gql`
        mutation($file: Upload!, $name: String) {
          uploadScene(file: $file, name: $name)
        }
      `,
      variables: {
        file: scene.file,
        name: scene.name || scene.file.name
      },
      context: {
        hasUpload: true,
        onProgress: (ev: ProgressEvent) => {
          console.log(ev.loaded / ev.total);
        }
      }
    })
      .then(res => {
        // TODO: feedback?
        // this.$emit("uploaded", res.data.uploadScene);
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