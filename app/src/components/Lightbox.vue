<template>
  <div
    @click="close"
    v-if="currentImage"
    style="flex-direction: column; z-index: 999; position: fixed; top:0;left:0; width: 100%; height: 100%; background: #000000aa"
    class="d-flex"
  >
    <div style="position: relative; width: 100%; height: 100%;">
      <v-img
        v-touch="{
          left: incrementIndex,
          right: decrementIndex,
        }"
        contain
        class="image"
        :src="imageLink(currentImage)"
        @click.native.stop
      ></v-img>

      <v-btn
        outlined
        large
        v-if="index > 0"
        icon
        class="thumb-btn left"
        @click.stop="decrementIndex"
      >
        <v-icon color="white">mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn
        outlined
        large
        v-if="index < items.length - 1"
        icon
        class="thumb-btn right"
        @click.stop="incrementIndex"
      >
        <v-icon color="white">mdi-chevron-right</v-icon>
      </v-btn>
    </div>

    <div v-if="!showImageDetails" class="text-center py-3">
      <v-btn @click.stop="showImageDetails = true" text color="white" class="text-none">Show details</v-btn>
    </div>

    <v-card tile style="align-self: flex-end; width: 100%;" @click.native.stop v-else>
      <v-toolbar>
        <v-btn @click="favorite" class="mr-1" icon>
          <v-icon
            :color="currentImage.favorite ? 'red' : undefined"
          >{{ currentImage.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
        </v-btn>

        <v-btn @click="bookmark" icon>
          <v-icon>{{ currentImage.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn @click="showImageDetails = false" class="mr-1" icon>
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
        <v-btn :href="imageLink(currentImage)" target="_blank" class="mr-1" icon>
          <v-icon>mdi-link</v-icon>
        </v-btn>
        <v-btn @click="openRemoveDialog" icon>
          <v-icon>mdi-delete-forever</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-title class="pb-0 subtitle-1">{{ currentImage.name }}</v-card-title>
      <v-card-text>
        <div v-if="currentImage.scene">
          Part of scene
          <a
            class="primary--text"
            :href="`#/scene/${currentImage.scene._id}`"
          >{{ currentImage.scene.name }}</a>
        </div>

        <div>
          <SceneSelector
            @input="editImageScene"
            class="d-inline-block"
            style="max-width: 200px"
            v-model="editScene"
          />
        </div>

        <div>
          <Rating @change="rate" class="pa-2 pb-0" :value="currentImage.rating" />
        </div>
        <div class="pa-2">
          <v-chip
            class="mr-1 mb-1"
            label
            small
            outlined
            v-for="label in currentImage.labels"
            :key="label._id"
          >{{ label.name }}</v-chip>
          <v-chip
            label
            color="primary"
            v-ripple
            @click="openLabelSelector"
            small
            :class="`mr-1 mb-1 hover ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
          >+ Add</v-chip>
        </div>
        <div class="d-flex mt-2">
          <div
            class="d-inline-block mr-2 text-center"
            v-for="actor in currentImage.actors"
            :key="actor._id"
          >
            <a :href="`#/actor/${actor._id}`">
              <v-avatar color="pink" size="80">
                <v-img class="hover" v-ripple eager :src="thumbnail(actor)"></v-img>
              </v-avatar>
            </a>
            <div class="mt-2">{{ actor.name }}</div>
          </div>
          <v-row class="ml-2" align="center">
            <v-btn small text @click="openEditActorsDialog">Edit actors</v-btn>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentImage">
        <v-card-title>Select labels for '{{ currentImage.name }}'</v-card-title>

        <v-text-field
          clearable
          color="primary"
          hide-details
          class="px-5 mb-2"
          label="Find labels..."
          v-model="labelSearchQuery"
        />

        <v-card-text style="max-height: 400px">
          <LabelSelector
            :searchQuery="labelSearchQuery"
            :items="allLabels"
            v-model="selectedLabels"
          />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editLabels" text color="primary" class="text-none">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card>
        <v-card-title>Really delete '{{ currentImage.name }}'?</v-card-title>
        <v-card-text>
          <v-alert type="error">This will absolutely annihilate the original source file on disk</v-alert>Actors and scenes featuring this image will stay in your collection.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="error" @click="$emit('delete', index); removeDialog = false">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editActorsDialog" max-width="400px">
      <v-card>
        <v-card-title>Edit actors</v-card-title>
        <v-card-text>
          <ActorSelector v-model="editActors" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editImageActors" color="primary" class="text-none" text>Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import LabelSelector from "../components/LabelSelector.vue";
import InfiniteLoading from "vue-infinite-loading";
import { contextModule } from "../store/context";
import ImageCard from "../components/ImageCard.vue";
import actorFragment from "../fragments/actor";
import ActorSelector from "../components/ActorSelector.vue";
import IImage from "../types/image";
import ILabel from "../types/label";
import IActor from "../types/actor";
import SceneSelector from "../components/SceneSelector.vue";
import IScene from "../types/scene";
import { Touch } from "vuetify/lib/directives";
import hotkeys from "hotkeys-js";

@Component({
  components: {
    LabelSelector,
    InfiniteLoading,
    ImageCard,
    ActorSelector,
    SceneSelector
  },
  directives: {
    Touch
  }
})
export default class Lightbox extends Vue {
  @Prop(Array) items!: IImage[];
  @Prop() index!: number | null;
  showImageDetails = false;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  editActorsDialog = false;
  editActors = [] as IActor[];
  editScene = null as { _id: string; name: string } | null;

  removeDialog = false;

  labelSearchQuery = "";

  destroyed() {
    hotkeys.unbind("*");
  }

  mounted() {
    hotkeys("*", ev => {
      if (this.index === null) return;

      if (ev.keyCode === 27) {
        this.close();
      } else if (ev.keyCode === 37 || ev.keyCode === 65) {
        this.decrementIndex();
      } else if (ev.keyCode === 39 || ev.keyCode === 68) {
        this.incrementIndex();
      } /*else if (ev.keyCode === 70) {
        this.favorite();
      } else if (ev.keyCode === 66) {
        this.bookmark();
      } else if (ev.keyCode >= 48 && ev.keyCode <= 53) {
        const rating = ev.keyCode - 48;
        this.rate(rating);
      } else if (ev.keyCode >= 96 && ev.keyCode <= 101) {
        const rating = ev.keyCode - 96;
        this.rate(rating);
      }*/
    });
  }

  close() {
    this.$emit("index", null);
  }

  decrementIndex() {
    if (this.index === null) return;
    this.$emit("index", Math.max(0, <number>this.index - 1));
  }

  incrementIndex() {
    if (this.index === null) return;
    this.$emit(
      "index",
      Math.min(<number>this.index + 1, this.items.length - 1)
    );

    // TODO: load next page
    if (this.index == this.items.length - 1) this.$emit("more");
  }

  editImageScene() {
    if (!this.currentImage) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            _id
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          scene: this.editScene ? this.editScene._id : null
        }
      }
    }).then(res => {
      this.$emit("update", {
        index: this.index,
        key: "scene",
        value: this.editScene
      });
    });
  }

  editImageActors() {
    if (!this.currentImage) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            _id
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          actors: this.editActors.map(a => a._id)
        }
      }
    }).then(res => {
      this.$emit("update", {
        index: this.index,
        key: "actors",
        value: this.editActors
      });
      this.editActorsDialog = false;
    });
  }

  openEditActorsDialog() {
    if (!this.currentImage) return;
    this.editActors = JSON.parse(JSON.stringify(this.currentImage.actors));
    this.editActorsDialog = true;
  }

  openRemoveDialog() {
    this.removeDialog = true;
  }

  @Watch("showImageDetails")
  onToggleDetails() {
    this.selectedLabels = [];
  }

  @Watch("index")
  onIndexChange(newVal: number) {
    this.selectedLabels = [];

    if (this.items[newVal]) {
      this.selectedLabels = this.items[newVal].labels.map(l =>
        this.allLabels.findIndex(k => k._id == l._id)
      );
      this.editScene = this.items[newVal].scene;
    }
  }

  rate(rating: number) {
    if (!this.currentImage) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      this.$emit("update", {
        index: this.index,
        key: "rating",
        value: rating
      });
    });
  }

  favorite() {
    if (!this.currentImage) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          favorite: !this.currentImage.favorite
        }
      }
    })
      .then(res => {
        this.$emit("update", {
          index: this.index,
          key: "favorite",
          value: res.data.updateImages[0].favorite
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  bookmark() {
    if (!this.currentImage) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          bookmark: this.currentImage.bookmark ? null : Date.now()
        }
      }
    })
      .then(res => {
        this.$emit("update", {
          index: this.index,
          key: "bookmark",
          value: res.data.updateImages[0].bookmark
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentImage) return;

    this.labelEditLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ImageUpdateOpts!) {
          updateImages(ids: $ids, opts: $opts) {
            labels {
              _id
              name
            }
          }
        }
      `,
      variables: {
        ids: [this.currentImage._id],
        opts: {
          labels: this.selectedLabels
            .map(i => this.allLabels[i])
            .map(l => l._id)
        }
      }
    })
      .then(res => {
        this.$emit("update", {
          index: this.index,
          key: "labels",
          value: res.data.updateImages[0].labels
        });
        this.labelSelectorDialog = false;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.labelEditLoader = false;
      });
  }

  openLabelSelector() {
    if (!this.currentImage) return;

    if (!this.allLabels.length) {
      ApolloClient.query({
        query: gql`
          {
            getLabels {
              _id
              name
              aliases
            }
          }
        `
      })
        .then(res => {
          if (!this.currentImage) return;

          this.allLabels = res.data.getLabels;
          this.selectedLabels = this.currentImage.labels.map(l =>
            this.allLabels.findIndex(k => k._id == l._id)
          );
          this.labelSelectorDialog = true;
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      this.labelSelectorDialog = true;
    }
  }

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }

  get currentImage() {
    if (this.index !== null) return this.items[this.index];
    return null;
  }

  thumbnail(actor: any) {
    if (actor.thumbnail)
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }
}
</script>

<style lang="scss" scoped>
.image {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: calc(100% - 150px);
  max-height: calc(100% - 20px);
}

.thumb-btn {
  z-index: 1000;

  &.left {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
  &.right {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
}
</style>
