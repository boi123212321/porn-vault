<template>
  <div>
    <div v-if="currentActor">
      <v-row>
        <v-col cols="12" sm="4" md="4" lg="3" xl="2">
          <v-container>
            <v-hover>
              <template v-slot:default="{ hover }">
                <v-img
                  v-ripple
                  @click="openThumbnailDialog"
                  class="elevation-4 hover"
                  aspect-ratio="1"
                  cover
                  :src="thumbnail"
                >
                  <v-fade-transition>
                    <v-overlay v-if="hover" absolute color="accent">
                      <v-icon x-large>mdi-upload</v-icon>
                    </v-overlay>
                  </v-fade-transition>
                </v-img>
              </template>
            </v-hover>
          </v-container>
        </v-col>
        <v-col cols="12" sm="8" md="8" lg="9" xl="10">
          <div v-if="currentActor.aliases.length">
            <div class="med--text pa-2">a.k.a. {{ currentActor.aliases.join(", ") }}</div>
          </div>

          <div v-if="currentActor.bornOn">
            <div class="d-flex align-center">
              <v-icon>mdi-calendar</v-icon>
              <v-subheader>Birthday</v-subheader>
            </div>
            <div class="med--text pa-2">{{ bornOn }}</div>
          </div>

          <div class="d-flex align-center">
            <v-icon>mdi-star</v-icon>
            <v-subheader>Rating</v-subheader>
          </div>
          <v-rating
            half-increments
            @input="rate"
            class="pa-2 pb-0"
            :value="currentActor.rating / 2"
            background-color="grey"
            color="amber"
            dense
            hide-details
          ></v-rating>
          <div
            @click="rate(0)"
            class="d-inline-block pl-3 mt-1 med--text caption hover"
          >Reset rating</div>
          <div class="d-flex align-center">
            <v-icon>mdi-label</v-icon>
            <v-subheader>Labels</v-subheader>
          </div>
          <div class="pa-2">
            <v-chip
              label
              class="mr-1 mb-1"
              small
              outlined
              v-for="label in labelNames"
              :key="label"
            >{{ label }}</v-chip>
            <v-chip
              label
              color="accent"
              v-ripple
              @click="openLabelSelector"
              small
              class="hover mr-1 mb-1"
            >+ Add</v-chip>
          </div>
        </v-col>
      </v-row>
      <v-row v-if="scenes.length">
        <v-col cols="12">
          <h1 class="text-center font-weight-light">{{ scenes.length }} Scenes</h1>

          <v-row>
            <v-col
              class="pa-1"
              v-for="scene in scenes"
              :key="scene._id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <scene-card
                @rate="rateScene(scene._id, $event)"
                @bookmark="bookmarkScene(scene._id, $event)"
                @favorite="favoriteScene(scene._id, $event)"
                :scene="scene"
                style="height: 100%"
              />
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <div v-if="images.length">
        <div class="d-flex align-center">
          <v-spacer></v-spacer>
          <h1 class="font-weight-light mr-3">{{ images.length }} Images</h1>
          <v-btn @click="openUploadDialog" icon>
            <v-icon>mdi-upload</v-icon>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
        <v-container fluid>
          <v-row>
            <v-col class="pa-1" v-for="(image, index) in images" :key="image._id" cols="6" sm="4">
              <ImageCard @open="lightboxIndex = index" width="100%" height="100%" :image="image">
                <template v-slot:action>
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        v-on="on"
                        @click.native.stop="setAsThumbnail(image._id)"
                        class="elevation-2 mb-2"
                        icon
                        style="background: #fafafa;"
                      >
                        <v-icon>mdi-image</v-icon>
                      </v-btn>
                    </template>
                    <span>Set as actor thumbnail</span>
                  </v-tooltip>
                </template>
              </ImageCard>
            </v-col>
          </v-row>

          <transition name="fade">
            <Lightbox
              @delete="removeImage"
              @update="updateImage"
              :items="images"
              :index="lightboxIndex"
              @index="lightboxIndex = $event"
            />
          </transition>
        </v-container>
      </div>
    </div>
    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentActor">
        <v-card-title>Select labels for '{{ currentActor.name }}'</v-card-title>

        <v-card-text style="max-height: 400px">
          <LabelSelector :items="allLabels" v-model="selectedLabels" />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editLabels" depressed color="primary" class="black--text text-none">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <infinite-loading v-if="currentActor" :identifier="infiniteId" @infinite="infiniteHandler">
      <div slot="no-results">
        <v-icon large>mdi-close</v-icon>
        <div>Nothing found!</div>
      </div>

      <div slot="spinner">
        <v-progress-circular indeterminate></v-progress-circular>
        <div>Loading...</div>
      </div>

      <div slot="no-more">
        <v-icon large>mdi-emoticon-wink</v-icon>
        <div>That's all!</div>
      </div>
    </infinite-loading>

    <v-dialog
      v-if="currentActor"
      :persistent="isUploading"
      scrollable
      v-model="uploadDialog"
      max-width="400px"
    >
      <ImageUploader
        :labels="currentActor.labels.map(l => l._id)"
        :name="currentActor.name"
        :actors="[currentActor._id]"
        @update-state="isUploading = $event"
        @uploaded="images.unshift($event)"
      />
    </v-dialog>

    <v-dialog v-model="thumbnailDialog" max-width="600px">
      <v-card v-if="currentActor" :loading="thumbnailLoader">
        <v-card-title>Set thumbnail for '{{ currentActor.name }}'</v-card-title>
        <v-card-text>
          <v-file-input
            color="accent"
            placeholder="Select image"
            @change="readThumbnail"
            v-model="selectedThumbnail"
          ></v-file-input>
          <div v-if="thumbnailDisplay" class="text-center">
            <cropper
              style="height: 400px"
              class="cropper"
              :src="thumbnailDisplay"
              :stencilProps="{ aspectRatio: 1 }"
              @change="changeCrop"
            ></cropper>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!thumbnailDisplay"
            class="black--text"
            color="primary"
            depressed
            @click="uploadThumbnail"
          >Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import sceneFragment from "../fragments/scene";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import { actorModule } from "../store/actor";
import SceneCard from "../components/SceneCard.vue";
import moment from "moment";
import LabelSelector from "../components/LabelSelector.vue";
import Lightbox from "../components/Lightbox.vue";
import ImageCard from "../components/ImageCard.vue";
import InfiniteLoading from "vue-infinite-loading";
import { Cropper } from "vue-advanced-cropper";
import ImageUploader from "../components/ImageUploader.vue";
import IScene from "../types/scene";
import IImage from "../types/image";
import ILabel from "../types/label";

interface ICropCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ICropResult {
  coordinates: ICropCoordinates;
}

@Component({
  components: {
    SceneCard,
    LabelSelector,
    Lightbox,
    ImageCard,
    InfiniteLoading,
    Cropper,
    ImageUploader
  },
  beforeRouteLeave(_to, _from, next) {
    actorModule.setCurrent(null);
    next();
  }
})
export default class ActorDetails extends Vue {
  scenes = [] as IScene[];
  images = [] as IImage[];
  lightboxIndex = null as number | null;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  infiniteId = 0;
  page = 0;

  thumbnailDialog = false;
  thumbnailLoader = false;
  thumbnailDisplay = null as string | null;
  selectedThumbnail = null as File | null;
  crop: ICropCoordinates = { left: 0, top: 0, width: 0, height: 0 };

  uploadDialog = false;
  isUploading = false;

  openUploadDialog() {
    this.uploadDialog = true;
  }

  changeCrop(crop: ICropResult) {
    this.crop = {
      left: Math.round(crop.coordinates.left),
      top: Math.round(crop.coordinates.top),
      width: Math.round(crop.coordinates.width),
      height: Math.round(crop.coordinates.height)
    };
  }

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

  async readThumbnail(file: File) {
    if (file) this.thumbnailDisplay = await this.readImage(file);
  }

  uploadThumbnail() {
    if (!this.currentActor) return;

    this.thumbnailLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $crop: Crop
          $actors: [String!]
          $labels: [String!]
        ) {
          uploadImage(
            file: $file
            name: $name
            crop: $crop
            actors: $actors
            labels: $labels
          ) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.selectedThumbnail,
        name: this.currentActor.name + " (thumbnail)",
        actors: [this.currentActor._id],
        labels: this.currentActor.labels.map(a => a._id),
        crop: {
          left: this.crop.left,
          top: this.crop.top,
          width: this.crop.width,
          height: this.crop.height
        }
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsThumbnail(image._id);
        this.thumbnailDialog = false;
        this.thumbnailDisplay = null;
        this.selectedThumbnail = null;
      })
      .finally(() => {
        this.thumbnailLoader = false;
      });
  }

  openThumbnailDialog() {
    this.thumbnailDialog = true;
  }

  removeImage(index: number) {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeImages(ids: $ids)
        }
      `,
      variables: {
        ids: [this.images[index]._id]
      }
    })
      .then(res => {
        this.images.splice(index, 1);
        this.lightboxIndex = null;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {});
  }

  async fetchPage() {
    if (!this.currentActor) return;

    try {
      const query = `page:${this.page} sortDir:asc sortBy:addedOn actors:${this.currentActor._id}`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getImages(query: $query) {
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
          ${actorFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getImages;
    } catch (err) {
      throw err;
    }
  }

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.images.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  updateImage({
    index,
    key,
    value
  }: {
    index: number;
    key: string;
    value: any;
  }) {
    const images = this.images[index];
    images[key] = value;
    Vue.set(this.images, index, images);
  }

  get currentActor() {
    return actorModule.current;
  }

  setAsThumbnail(id: string) {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          thumbnail: id
        }
      }
    })
      .then(res => {
        actorModule.setThumbnail(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentActor) return;

    this.labelEditLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            labels {
              _id
              name
              aliases
            }
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          labels: this.selectedLabels
            .map(i => this.allLabels[i])
            .map(l => l._id)
        }
      }
    })
      .then(res => {
        actorModule.setLabels(res.data.updateActors[0].labels);
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
    if (!this.currentActor) return;

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
          if (!this.currentActor) return;

          this.allLabels = res.data.getLabels;
          this.selectedLabels = this.currentActor.labels.map(l =>
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

  rate(rating: number) {
    if (!this.currentActor) return;

    rating = rating * 2;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      actorModule.setRating(rating);
    });
  }

  get labelNames() {
    if (!this.currentActor) return "";
    return this.currentActor.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.currentActor && this.currentActor.thumbnail)
      return `${serverBase}/image/${
        this.currentActor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  rateScene(id: any, rating: number) {
    const index = this.scenes.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.scenes[index];
      actor.rating = rating;
      Vue.set(this.scenes, index, actor);
    }
  }

  favoriteScene(id: any, favorite: boolean) {
    const index = this.scenes.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.scenes[index];
      actor.favorite = favorite;
      Vue.set(this.scenes, index, actor);
    }
  }

  bookmarkScene(id: any, bookmark: boolean) {
    const index = this.scenes.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.scenes[index];
      actor.bookmark = bookmark;
      Vue.set(this.scenes, index, actor);
    }
  }

  beforeMount() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getActorById(id: $id) {
            ...ActorFragment
            scenes {
              ...SceneFragment
              actors {
                ...ActorFragment
              }
            }
          }
        }
        ${actorFragment}
        ${sceneFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      this.scenes = res.data.getActorById.scenes;
      delete res.data.getActorById.scenes;
      actorModule.setCurrent(res.data.getActorById);
    });
  }
}
</script>

<style lang="scss" scoped>
</style>