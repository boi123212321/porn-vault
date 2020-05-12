<template>
  <div>
    <div v-if="currentActor">
      <v-img
        :max-height="500"
        :aspect-ratio="2.75"
        v-if="heroImage && $vuetify.breakpoint.smAndUp"
        :src="heroImage"
      ></v-img>
      <BindTitle :value="currentActor.name" />
      <v-container fluid>
        <v-row>
          <v-col cols="12" sm="4" md="3" lg="2" xl="2">
            <v-row>
              <v-col class="pb-0" cols="6" sm="12">
                <div
                  v-if="avatar"
                  :class="($vuetify.breakpoint.xsOnly || !heroImage) ? '' : 'avatar-margin-top'"
                  class="text-center"
                >
                  <v-avatar
                    class="elevation-8"
                    :size="$vuetify.breakpoint.xsOnly ? 150 : 180"
                    color="white"
                    style="border: 3px solid white"
                  >
                    <v-img :src="avatar"></v-img>
                  </v-avatar>
                </div>
                <v-hover
                  :class="($vuetify.breakpoint.xsOnly || !heroImage) ? '' : 'elevation-8 thumb-margin-top'"
                  v-else
                >
                  <template v-slot:default="{ hover }">
                    <div style="position: relative" class="text-center">
                      <img class="avatar" :src="thumbnail" />

                      <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%;">
                        <v-fade-transition>
                          <v-img
                            style="z-index: 5"
                            eager
                            cover
                            :src="altThumbnail"
                            v-if="altThumbnail && hover"
                          ></v-img>
                        </v-fade-transition>
                      </div>
                    </div>
                  </template>
                </v-hover>

                <Rating @change="rate" :value="currentActor.rating" class="my-2 text-center" />

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
                    color="primary"
                    v-ripple
                    @click="openLabelSelector"
                    small
                    :class="`hover mr-1 mb-1 ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
                  >+ Add</v-chip>
                </div>
              </v-col>

              <v-col cols="6" sm="12">
                <!-- <div class="d-flex align-center">
                  <v-icon>mdi-information-outline</v-icon>
                  <v-subheader>General</v-subheader>
                </div>-->
                <v-divider class="mb-2"></v-divider>
                <div class="px-2">
                  <div
                    v-if="currentActor.aliases.length"
                    class="py-1 med--text body-2"
                  >a.k.a. {{ currentActor.aliases.join(", ") }}</div>
                  <div
                    v-if="currentActor.bornOn"
                    class="py-1"
                  >Born on {{ new Date(currentActor.bornOn).toDateString(undefined, { timeZone: "UTC" }) }}</div>

                  <v-tooltip bottom class="py-1">
                    <template v-slot:activator="{ on }">
                      <div v-on="on" class="d-flex align-center">
                        <b>
                          <pre>{{ currentActor.watches.length }} </pre>
                        </b>
                        <span class="med-text">views</span>
                      </div>
                    </template>
                    <span
                      v-if="currentActor.watches.length"
                    >Last watched: {{ new Date(currentActor.watches[currentActor.watches.length - 1]).toLocaleString() }}</span>
                    <span v-else>You haven't watched {{ currentActor.name }} yet!</span>
                  </v-tooltip>
                  <v-divider class="mt-2"></v-divider>
                  <div class="text-center mt-2">
                    <v-btn
                      color="primary"
                      text
                      class="text-none"
                      @click="imageDialog=true"
                    >Manage images</v-btn>
                  </div>

                  <div class="text-center mt-2">
                    <v-btn
                      color="primary"
                      :loading="pluginLoader"
                      text
                      class="text-none"
                      @click="runPlugins"
                    >Run plugins</v-btn>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-col>
          <v-col cols="12" sm="8" md="9" lg="10" xl="10">
            <div class="mb-2">
              <div v-if="currentActor.description">
                <div class="d-flex align-center">
                  <v-icon>mdi-text</v-icon>
                  <v-subheader>Description</v-subheader>
                </div>
                <div
                  class="pa-2 med--text"
                  v-if="currentActor.description"
                >{{ currentActor.description }}</div>
              </div>

              <Collabs class="mb-3" :name="currentActor.name" :collabs="collabs" />
            </div>
            <v-tabs
              v-model="activeTab"
              background-color="transparent"
              color="primary"
              centered
              grow
            >
              <v-tab>Metadata</v-tab>
              <v-tab>Scenes</v-tab>
              <v-tab>Movies</v-tab>
              <v-tab>Images</v-tab>
            </v-tabs>
            <div class="pa-2" v-if="activeTab == 0">
              <div class="text-center py-2">
                <v-btn
                  class="text-none"
                  color="primary"
                  text
                  @click="updateCustomFields"
                  :disabled="!hasUpdatedFields"
                >Update</v-btn>
              </div>
              <CustomFieldSelector
                :fields="currentActor.availableFields"
                v-model="editCustomFields"
                @change="hasUpdatedFields = true"
              />
            </div>
            <div class="pa-2" v-if="activeTab == 1">
              <v-row>
                <v-col cols="12">
                  <!-- <h1 class="text-center font-weight-light">{{ scenes.length }} Scenes</h1> -->

                  <v-row>
                    <v-col
                      class="pa-1"
                      v-for="(scene, i) in scenes"
                      :key="scene._id"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                      xl="2"
                    >
                      <scene-card v-model="scenes[i]" style="height: 100%" />
                    </v-col>
                  </v-row>

                  <infinite-loading
                    v-if="currentActor"
                    :identifier="sceneInfiniteId"
                    @infinite="sceneInfiniteHandler"
                  >
                    <div slot="no-results">
                      <v-icon large>mdi-close</v-icon>
                      <div>Nothing found!</div>
                    </div>

                    <div class="mt-3" slot="spinner">
                      <div>Loading...</div>
                      <v-progress-circular indeterminate></v-progress-circular>
                    </div>

                    <div slot="no-more">
                      <v-icon large>mdi-emoticon-wink</v-icon>
                      <div>That's all!</div>
                    </div>
                  </infinite-loading>
                </v-col>
              </v-row>
            </div>
            <div class="pa-2" v-if="activeTab == 2">
              <v-row>
                <v-col
                  class="pa-1"
                  v-for="(movie, i) in movies"
                  :key="movie._id"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                  xl="2"
                >
                  <movie-card v-model="movies[i]" style="height: 100%" />
                </v-col>
              </v-row>
            </div>
            <div class="pa-2" v-if="activeTab == 3">
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
                    <v-col
                      class="pa-0"
                      v-for="(image, index) in images"
                      :key="image._id"
                      cols="6"
                      sm="4"
                      md="3"
                      lg="3"
                      xl="2"
                    >
                      <ImageCard
                        @open="lightboxIndex = index"
                        width="100%"
                        height="100%"
                        :image="image"
                      >
                        <template v-slot:action>
                          <v-tooltip top>
                            <template v-slot:activator="{ on }">
                              <v-btn
                                light
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

              <infinite-loading
                v-if="currentActor"
                :identifier="infiniteId"
                @infinite="infiniteHandler"
              >
                <div slot="no-results">
                  <v-icon large>mdi-close</v-icon>
                  <div>Nothing found!</div>
                </div>

                <div class="mt-3" slot="spinner">
                  <div>Loading...</div>
                  <v-progress-circular indeterminate></v-progress-circular>
                </div>

                <div slot="no-more">
                  <v-icon large>mdi-emoticon-wink</v-icon>
                  <div>That's all!</div>
                </div>
              </infinite-loading>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
    <div v-else class="mt-3 text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentActor">
        <v-card-title>Select labels for '{{ currentActor.name }}'</v-card-title>

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

    <v-dialog v-model="avatarDialog" max-width="600px">
      <v-card v-if="currentActor" :loading="avatarLoader">
        <v-card-title>Set avatar for '{{ currentActor.name }}'</v-card-title>
        <v-card-text>
          <v-file-input
            color="primary"
            placeholder="Select image"
            @change="readAvatar"
            v-model="selectedAvatar"
          ></v-file-input>
          <div v-if="avatarDisplay" class="text-center">
            <cropper
              style="height: 400px"
              class="cropper"
              :src="avatarDisplay"
              :stencilProps="{ aspectRatio: 1 }"
              :stencilComponent="$options.components.CircleStencil"
              @change="changeAvatarCrop"
            ></cropper>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!avatarDisplay"
            color="primary"
            text
            class="text-none"
            @click="uploadAvatar"
          >Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="thumbnailDialog" max-width="600px">
      <v-card v-if="currentActor" :loading="thumbnailLoader">
        <v-card-title>Set thumbnail for '{{ currentActor.name }}'</v-card-title>
        <v-card-text>
          <v-file-input
            color="primary"
            placeholder="Select image"
            @change="readThumbnail"
            v-model="selectedThumbnail"
          ></v-file-input>
          <div v-if="thumbnailDisplay" class="text-center">
            <cropper
              style="height: 400px"
              class="cropper"
              :src="thumbnailDisplay"
              :stencilProps="{ aspectRatio: aspectRatio }"
              @change="changeThumbnailCrop"
            ></cropper>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!thumbnailDisplay"
            color="primary"
            text
            class="text-none"
            @click="uploadThumbnail"
          >Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="altThumbnailDialog" max-width="600px">
      <v-card v-if="currentActor" :loading="altThumbnailLoader">
        <v-card-title>Set alt. thumbnail for '{{ currentActor.name }}'</v-card-title>
        <v-card-text>
          <v-file-input
            color="primary"
            placeholder="Select image"
            @change="readAltThumbnail"
            v-model="selectedAltThumbnail"
          ></v-file-input>
          <div v-if="altThumbnailDisplay" class="text-center">
            <cropper
              style="height: 400px"
              class="cropper"
              :src="altThumbnailDisplay"
              :stencilProps="{ aspectRatio: aspectRatio }"
              @change="changeAltThumbnailCrop"
            ></cropper>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!altThumbnailDisplay"
            color="primary"
            text
            class="text-none"
            @click="uploadAltThumbnail"
          >Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="heroDialog" max-width="600px">
      <v-card v-if="currentActor" :loading="heroLoader">
        <v-card-title>Set hero image for '{{ currentActor.name }}'</v-card-title>
        <v-card-text>
          <v-file-input
            color="primary"
            placeholder="Select image"
            @change="readHero"
            v-model="selectedHero"
          ></v-file-input>
          <div v-if="heroDisplay" class="text-center">
            <cropper
              style="height: 400px"
              class="cropper"
              :src="heroDisplay"
              :stencilProps="{ aspectRatio: 2.75 }"
              @change="changeHeroCrop"
            ></cropper>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!heroDisplay"
            color="primary"
            text
            class="text-none"
            @click="uploadHero"
          >Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="imageDialog" max-width="700px">
      <v-card v-if="currentActor">
        <v-card-title>Change images for '{{ currentActor.name }}'</v-card-title>
        <v-card-text>
          <v-row>
            <v-col class="text-center pa-2" cols="12" sm="6">
              <v-hover>
                <template v-slot:default="{ hover }">
                  <v-img contain height="200px" :src="thumbnail" v-if="currentActor.thumbnail">
                    <v-fade-transition>
                      <v-overlay v-if="hover" absolute color="primary">
                        <v-btn
                          class="black--text text-none"
                          color="error"
                          @click="setAsThumbnail(null)"
                        >Delete</v-btn>
                      </v-overlay>
                    </v-fade-transition>
                  </v-img>
                </template>
              </v-hover>
              <v-btn
                color="primary"
                text
                class="mt-1 text-none"
                @click="thumbnailDialog=true"
              >Change thumbnail</v-btn>
            </v-col>

            <v-col class="text-center pa-2" cols="12" sm="6">
              <v-hover>
                <template v-slot:default="{ hover }">
                  <v-img
                    contain
                    height="200px"
                    :src="altThumbnail"
                    v-if="currentActor.altThumbnail"
                  >
                    <v-fade-transition>
                      <v-overlay v-if="hover" absolute color="primary">
                        <v-btn
                          class="black--text text-none"
                          color="error"
                          @click="setAsAltThumbnail(null)"
                        >Delete</v-btn>
                      </v-overlay>
                    </v-fade-transition>
                  </v-img>
                </template>
              </v-hover>
              <v-btn
                color="primary"
                text
                class="mt-1 text-none"
                @click="altThumbnailDialog=true"
              >Change alt. thumbnail</v-btn>
            </v-col>

            <v-col class="text-center pa-2" cols="12" sm="6">
              <v-hover>
                <template v-slot:default="{ hover }">
                  <v-img contain height="200px" :src="avatar" v-if="currentActor.avatar">
                    <v-fade-transition>
                      <v-overlay v-if="hover" absolute color="primary">
                        <v-btn
                          class="black--text text-none"
                          color="error"
                          @click="setAsAvatar(null)"
                        >Delete</v-btn>
                      </v-overlay>
                    </v-fade-transition>
                  </v-img>
                </template>
              </v-hover>
              <v-btn
                color="primary"
                text
                class="mt-1 text-none"
                @click="avatarDialog=true"
              >Change avatar</v-btn>
            </v-col>

            <v-col class="text-center pa-2" cols="12" sm="6">
              <v-hover>
                <template v-slot:default="{ hover }">
                  <v-img contain height="200px" :src="heroImage" v-if="currentActor.hero">
                    <v-fade-transition>
                      <v-overlay v-if="hover" absolute color="primary">
                        <v-btn
                          class="black--text text-none"
                          color="error"
                          @click="setAsHero(null)"
                        >Delete</v-btn>
                      </v-overlay>
                    </v-fade-transition>
                  </v-img>
                </template>
              </v-hover>
              <v-btn
                color="primary"
                text
                class="mt-1 text-none"
                @click="heroDialog=true"
              >Change hero image</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import sceneFragment from "../fragments/scene";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import movieFragment from "../fragments/movie";
import studioFragment from "../fragments/studio";
import { actorModule } from "../store/actor";
import SceneCard from "../components/SceneCard.vue";
import moment from "moment";
import LabelSelector from "../components/LabelSelector.vue";
import Lightbox from "../components/Lightbox.vue";
import MovieCard from "../components/MovieCard.vue";
import ImageCard from "../components/ImageCard.vue";
import InfiniteLoading from "vue-infinite-loading";
import { Cropper, CircleStencil } from "vue-advanced-cropper";
import ImageUploader from "../components/ImageUploader.vue";
import IScene from "../types/scene";
import IMovie from "../types/movie";
import IImage from "../types/image";
import ILabel from "../types/label";
import { contextModule } from "../store/context";
import CustomFieldSelector from "../components/CustomFieldSelector.vue";
import Collabs from "../components/Collabs.vue";
import { ICollabActor } from "../types/actor";

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
    ImageUploader,
    CustomFieldSelector,
    MovieCard,
    CircleStencil,
    Collabs
  },
  beforeRouteLeave(_to, _from, next) {
    actorModule.setCurrent(null);
    next();
  }
})
export default class ActorDetails extends Vue {
  scenes = [] as IScene[];
  movies = [] as IMovie[];
  images = [] as IImage[];
  collabs = [] as ICollabActor[];
  lightboxIndex = null as number | null;

  activeTab = 0;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  scenePage = 0;
  sceneInfiniteId = 0;

  infiniteId = 0;
  page = 0;

  imageDialog = false;

  avatarDialog = false;
  avatarLoader = false;
  avatarDisplay = null as string | null;
  selectedAvatar = null as File | null;
  avatarCrop: ICropCoordinates = { left: 0, top: 0, width: 0, height: 0 };

  thumbnailDialog = false;
  thumbnailLoader = false;
  thumbnailDisplay = null as string | null;
  selectedThumbnail = null as File | null;
  thumbnailCrop: ICropCoordinates = { left: 0, top: 0, width: 0, height: 0 };

  altThumbnailDialog = false;
  altThumbnailLoader = false;
  altThumbnailDisplay = null as string | null;
  selectedAltThumbnail = null as File | null;
  altThumbnailCrop: ICropCoordinates = { left: 0, top: 0, width: 0, height: 0 };

  heroDialog = false;
  heroLoader = false;
  heroDisplay = null as string | null;
  selectedHero = null as File | null;
  heroCrop: ICropCoordinates = { left: 0, top: 0, width: 0, height: 0 };

  uploadDialog = false;
  isUploading = false;

  editCustomFields = {} as any;
  hasUpdatedFields = false;

  sceneLoader = false;
  pluginLoader = false;

  labelSearchQuery = "";

  get avatar() {
    if (!this.currentActor) return null;
    if (!this.currentActor.avatar) return null;
    return `${serverBase}/image/${
      this.currentActor.avatar._id
    }?password=${localStorage.getItem("password")}`;
  }

  get heroImage() {
    if (!this.currentActor) return null;
    if (!this.currentActor.hero) return null;
    return `${serverBase}/image/${
      this.currentActor.hero._id
    }?password=${localStorage.getItem("password")}`;
  }

  sceneInfiniteHandler($state) {
    this.fetchScenePage().then(items => {
      if (items.length) {
        this.scenePage++;
        this.scenes.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  async fetchScenePage() {
    try {
      if (!this.currentActor) return;

      const query = `query:'' actors:${this.currentActor._id} page:${this.scenePage} sortDir:desc sortBy:addedOn`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getScenes(query: $query) {
              ...SceneFragment
              actors {
                ...ActorFragment
              }
              studio {
                ...StudioFragment
              }
            }
          }
          ${sceneFragment}
          ${actorFragment}
          ${studioFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getScenes;
    } catch (err) {
      throw err;
    }
  }

  runPlugins() {
    if (!this.currentActor) return;

    this.pluginLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          runActorPlugins(ids: $ids) {
            ...ActorFragment
            numScenes
            labels {
              _id
              name
            }
            thumbnail {
              _id
              color
            }
            altThumbnail {
              _id
            }
            watches
            hero {
              _id
              color
            }
            avatar {
              _id
            }
          }
        }
        ${actorFragment}
      `,
      variables: {
        ids: [this.currentActor._id]
      }
    })
      .then(res => {
        actorModule.setCurrent(res.data.runActorPlugins[0]);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.pluginLoader = false;
      });
  }

  updateCustomFields() {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            customFields
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          customFields: this.editCustomFields
        }
      }
    })
      .then(res => {
        actorModule.setCustomFields(res.data.updateActors[0].customFields);
        this.hasUpdatedFields = false;
      })
      .catch(err => {
        console.error(err);
      });
  }

  get aspectRatio() {
    return contextModule.actorAspectRatio;
  }

  openUploadDialog() {
    this.uploadDialog = true;
  }

  changeAvatarCrop(crop: ICropResult) {
    this.avatarCrop = {
      left: Math.round(crop.coordinates.left),
      top: Math.round(crop.coordinates.top),
      width: Math.round(crop.coordinates.width),
      height: Math.round(crop.coordinates.height)
    };
  }

  changeThumbnailCrop(crop: ICropResult) {
    this.thumbnailCrop = {
      left: Math.round(crop.coordinates.left),
      top: Math.round(crop.coordinates.top),
      width: Math.round(crop.coordinates.width),
      height: Math.round(crop.coordinates.height)
    };
  }

  changeAltThumbnailCrop(crop: ICropResult) {
    this.altThumbnailCrop = {
      left: Math.round(crop.coordinates.left),
      top: Math.round(crop.coordinates.top),
      width: Math.round(crop.coordinates.width),
      height: Math.round(crop.coordinates.height)
    };
  }

  changeHeroCrop(crop: ICropResult) {
    this.heroCrop = {
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

  async readAvatar(file: File) {
    if (file) this.avatarDisplay = await this.readImage(file);
  }

  async readThumbnail(file: File) {
    if (file) this.thumbnailDisplay = await this.readImage(file);
  }

  async readAltThumbnail(file: File) {
    if (file) this.altThumbnailDisplay = await this.readImage(file);
  }

  async readHero(file: File) {
    if (file) this.heroDisplay = await this.readImage(file);
  }

  uploadAvatar() {
    if (!this.currentActor) return;

    this.avatarLoader = true;

    console.log("Uploading avatar...");

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $crop: Crop
          $actors: [String!]
          $labels: [String!]
          $compress: Boolean
        ) {
          uploadImage(
            file: $file
            name: $name
            crop: $crop
            actors: $actors
            labels: $labels
            compress: $compress
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
        ${actorFragment}
      `,
      variables: {
        file: this.selectedAvatar,
        name: this.currentActor.name + " (avatar)",
        actors: [this.currentActor._id],
        labels: this.currentActor.labels.map(a => a._id),
        crop: {
          left: this.avatarCrop.left,
          top: this.avatarCrop.top,
          width: this.avatarCrop.width,
          height: this.avatarCrop.height
        },
        compress: true
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsAvatar(image._id);
        this.avatarDialog = false;
        this.avatarDisplay = null;
        this.selectedAvatar = null;
      })
      .finally(() => {
        this.avatarLoader = false;
      });
  }

  uploadHero() {
    if (!this.currentActor) return;

    this.heroLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $crop: Crop
          $actors: [String!]
          $labels: [String!]
          $compress: Boolean
        ) {
          uploadImage(
            file: $file
            name: $name
            crop: $crop
            actors: $actors
            labels: $labels
            compress: $compress
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
        ${actorFragment}
      `,
      variables: {
        file: this.selectedHero,
        name: this.currentActor.name + " (hero image)",
        actors: [this.currentActor._id],
        labels: this.currentActor.labels.map(a => a._id),
        crop: {
          left: this.heroCrop.left,
          top: this.heroCrop.top,
          width: this.heroCrop.width,
          height: this.heroCrop.height
        },
        compress: false
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsHero(image._id);
        this.heroDialog = false;
        this.heroDisplay = null;
        this.selectedHero = null;
      })
      .finally(() => {
        this.heroLoader = false;
      });
  }

  uploadAltThumbnail() {
    if (!this.currentActor) return;

    this.altThumbnailLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $crop: Crop
          $actors: [String!]
          $labels: [String!]
          $compress: Boolean
        ) {
          uploadImage(
            file: $file
            name: $name
            crop: $crop
            actors: $actors
            labels: $labels
            compress: $compress
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
        ${actorFragment}
      `,
      variables: {
        file: this.selectedAltThumbnail,
        name: this.currentActor.name + " (alt. thumbnail)",
        actors: [this.currentActor._id],
        labels: this.currentActor.labels.map(a => a._id),
        crop: {
          left: this.altThumbnailCrop.left,
          top: this.altThumbnailCrop.top,
          width: this.altThumbnailCrop.width,
          height: this.altThumbnailCrop.height
        },
        compress: true
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsAltThumbnail(image._id);
        this.altThumbnailDialog = false;
        this.altThumbnailDisplay = null;
        this.selectedAltThumbnail = null;
      })
      .finally(() => {
        this.altThumbnailLoader = false;
      });
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
          $compress: Boolean
        ) {
          uploadImage(
            file: $file
            name: $name
            crop: $crop
            actors: $actors
            labels: $labels
            compress: $compress
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
        ${actorFragment}
      `,
      variables: {
        file: this.selectedThumbnail,
        name: this.currentActor.name + " (thumbnail)",
        actors: [this.currentActor._id],
        labels: this.currentActor.labels.map(a => a._id),
        crop: {
          left: this.thumbnailCrop.left,
          top: this.thumbnailCrop.top,
          width: this.thumbnailCrop.width,
          height: this.thumbnailCrop.height
        },
        compress: true
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

  openAltThumbnailDialog() {
    this.altThumbnailDialog = true;
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
          query($query: String, $auto: Boolean) {
            getImages(query: $query, auto: $auto) {
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
          query,
          auto: true
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

  setAsAvatar(id: string | null) {
    if (!this.currentActor) return;

    console.log("Set image as avatar...");

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            avatar {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          avatar: id
        }
      }
    })
      .then(res => {
        actorModule.setAvatar(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  setAsHero(id: string | null) {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            hero {
              _id
              color
            }
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          hero: id
        }
      }
    })
      .then(res => {
        actorModule.setHero(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  setAsAltThumbnail(id: string | null) {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            altThumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          altThumbnail: id
        }
      }
    })
      .then(res => {
        actorModule.setAltThumbnail(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  setAsThumbnail(id: string | null) {
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
    if (!this.currentActor) return [];
    return this.currentActor.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.currentActor && this.currentActor.thumbnail)
      return `${serverBase}/image/${
        this.currentActor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return `${serverBase}/broken`;
  }

  get altThumbnail() {
    if (this.currentActor && this.currentActor.altThumbnail)
      return `${serverBase}/image/${
        this.currentActor.altThumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return null;
  }

  @Watch("$route.params.id")
  onRouteChange() {
    actorModule.setCurrent(null);
    this.images = [];
    this.scenes = [];
    this.movies = [];
    this.collabs = [];
    this.selectedLabels = [];
    this.page = 0;
    this.scenePage = 0;
    this.onLoad();
    this.loadCollabs();
    this.loadMovies();
  }

  loadMovies() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getActorById(id: $id) {
            movies {
              ...MovieFragment
              actors {
                ...ActorFragment
              }
              scenes {
                ...SceneFragment
              }
            }
          }
        }
        ${sceneFragment}
        ${actorFragment}
        ${movieFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      this.movies = res.data.getActorById.movies;
    });
  }

  loadCollabs() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getActorById(id: $id) {
            collabs {
              _id
              name
              thumbnail {
                _id
              }
              avatar {
                _id
              }
            }
          }
        }
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      this.collabs = res.data.getActorById.collabs;
    });
  }

  onLoad() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getActorById(id: $id) {
            ...ActorFragment
            numScenes
            labels {
              _id
              name
            }
            thumbnail {
              _id
              color
            }
            altThumbnail {
              _id
            }
            watches
            hero {
              _id
              color
            }
            avatar {
              _id
            }
          }
        }
        ${actorFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      actorModule.setCurrent(res.data.getActorById);
      this.editCustomFields = res.data.getActorById.customFields;
    });
  }

  beforeMount() {
    this.onLoad();
    this.loadCollabs();
    this.loadMovies();
  }

  mounted() {
    /* window.addEventListener("keydown", ev => {
      if (ev.keyCode >= 48 && ev.keyCode <= 53) {
        const rating = ev.keyCode - 48;
        this.rate(rating);
      } else if (ev.keyCode >= 96 && ev.keyCode <= 101) {
        const rating = ev.keyCode - 96;
        this.rate(rating);
      }
    }); */
  }
}
</script>

<style lang="scss" scoped>
.thumb-margin-top {
  margin-top: -160px;
}
.avatar-margin-top {
  margin-top: -120px;
}
.avatar {
  max-width: 100%;
}
</style>
