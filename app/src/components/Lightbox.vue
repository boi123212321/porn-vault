<template>
  <div v-if="currentImage" class="lightbox d-flex">
    <div @click="close" class="lightbox-bg"></div>

    <div class="image-container">
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

      <v-hover v-slot:default="{ hover }">
        <v-card :style="`opacity: ${hover ? '100%' : '50%'}`" class="pa-2 actions-card">
          <v-btn :disabled="index <= 0" icon @click.stop="decrementIndex">
            <v-icon color="white">mdi-chevron-left</v-icon>
          </v-btn>
          <div style="width: 50px"></div>
          <v-btn :disabled="index >= items.length - 1" icon @click.stop="incrementIndex">
            <v-icon color="white">mdi-chevron-right</v-icon>
          </v-btn>
        </v-card>
      </v-hover>
    </div>

    <v-card class="pa-2" :style="sidebarCss" tile v-if="showImageDetails">
      <div class="d-flex align-center mb-2">
        <span class="title text-truncate">{{ currentImage.name }}</span>
        <v-spacer></v-spacer>
        <v-btn :href="imageLink(currentImage)" target="_blank" class="mr-1" icon>
          <v-icon>mdi-link</v-icon>
        </v-btn>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <div class="mt-2 d-flex align-center">
        <v-btn @click="favorite" class="mr-1" icon>
          <v-icon
            :color="currentImage.favorite ? 'red' : undefined"
          >{{ currentImage.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
        </v-btn>
        <v-btn @click="bookmark" icon>
          <v-icon>{{ currentImage.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <Rating @change="rate" :value="currentImage.rating" />
      </div>
      <v-img
        v-if="$vuetify.breakpoint.smAndDown"
        v-touch="{
          left: incrementIndex,
          right: decrementIndex,
        }"
        contain
        :src="imageLink(currentImage)"
        @click.native.stop
      ></v-img>
      <div class="mt-2">
        <div v-if="currentImage.scene">
          Part of scene
          <a
            class="primary--text"
            :href="`#/scene/${currentImage.scene._id}`"
          >{{ currentImage.scene.name }}</a>
        </div>

        <div class="mb-2">
          <SceneSelector @input="editImageScene" class="d-inline-block" v-model="editScene" />
        </div>

        <div class="pa-2">
          <v-chip
            class="mr-1 mb-1"
            label
            small
            outlined
            v-for="label in currentImage.labels.slice().sort((a, b) => a.name.localeCompare(b.name))"
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

        <v-row>
          <v-col class="text-center" v-for="actor in currentImage.actors" :key="actor._id" cols="6">
            <a :href="`#/actor/${actor._id}`">
              <v-avatar :style="`border: 3px solid ${avatarColor(actor)}`" size="120">
                <v-img class="hover" v-ripple eager :src="avatar(actor)"></v-img>
              </v-avatar>
            </a>
            <div class="mt-2">{{ actor.name }}</div>
          </v-col>
        </v-row>
        <div class="text-center mt-2">
          <v-btn small text @click="openEditActorsDialog">Edit actors</v-btn>
        </div>

        <v-divider class="mt-4"></v-divider>

        <div class="mt-5 mb-3 text-center">
          <v-btn
            :class="$vuetify.theme.dark ? 'black--text' : ''"
            color="error"
            class="text-none"
            @click="openRemoveDialog"
          >
            <v-icon>mdi-delete-forever</v-icon>Delete
          </v-btn>
        </div>
      </div>
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
  showImageDetails = true;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  editActorsDialog = false;
  editActors = [] as IActor[];
  editScene = null as { _id: string; name: string } | null;

  removeDialog = false;

  labelSearchQuery = "";

  get sidebarCss() {
    return {
      "overflow-x": "hidden",
      "overflow-y": "scroll",
      height: "100%",
      "z-index": 999,
      width: {
        xs: "100%",
        sm: "100%",
        md: "300px",
        lg: "300px",
        xl: "300px"
        // @ts-ignore
      }[this.$vuetify.breakpoint.name]
    };
  }

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

  avatar(actor: any) {
    if (actor.avatar)
      return `${serverBase}/image/${
        actor.avatar._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  avatarColor(actor: any) {
    if (actor.avatar) return actor.avatar.color || "#ffffff";
    return "#ffffff";
  }
}
</script>

<style lang="scss" scoped>
.lightbox {
  z-index: 997;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.lightbox-bg {
  z-index: 998;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000000aa;
}

.image-container {
  pointer-events: none !important;
  position: relative;
  height: 100%;
  flex-grow: 1;
  z-index: 999;
}

.image {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: calc(100% - 150px);
  max-height: calc(100% - 20px);
  pointer-events: initial;
}

.actions-card {
  display: flex;
  transition: opacity 0.15s ease-in-out;
  pointer-events: initial;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 5px;
}
</style>
