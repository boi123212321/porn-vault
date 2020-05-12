<template>
  <v-container fluid>
    <div v-if="currentScene">
      <BindTitle :value="currentScene.name" />
      <div class="d-flex pb-2">
        <div class="d-flex align-center text-center pa-2" style="flex-grow: 1">
          <div class="mx-auto" style="max-width: 1100px">
            <VideoPlayer
              ref="player"
              :src="videoPath"
              :poster="thumbnail"
              :duration="currentScene.meta.duration"
              :markers="markers"
              :preview="currentScene.preview ? imageLink(currentScene.preview) : null"
              @play="manuallyStarted = true"
            />
          </div>
        </div>
        <v-divider vertical v-if="$vuetify.breakpoint.mdAndUp" />
        <div class="py-2" v-if="$vuetify.breakpoint.mdAndUp" style="width: 400px; max-width: 400px">
          <div class="text-center">
            <v-btn class="text-none" color="primary" text @click="openMarkerDialog">Create marker</v-btn>
          </div>
          <div class="mt-3">
            <MarkerItem
              style="width: 100%"
              @jump="$refs.player.seek(marker.time, marker.name); $refs.player.play()"
              @delete="removeMarker(marker._id)"
              :marker="marker"
              v-for="marker in markers"
              :key="marker._id"
            />
          </div>
        </div>
      </div>

      <v-row v-if="!$vuetify.breakpoint.mdAndUp">
        <v-col cols="12" sm="12" md="4" lg="2" xl="1">
          <div class="text-center">
            <v-btn class="text-none" color="primary" text @click="openMarkerDialog">Create marker</v-btn>
          </div>
          <div class="mt-3">
            <MarkerItem
              style="width: 100%"
              @jump="$refs.player.seek(marker.time, marker.name)"
              @delete="removeMarker(marker._id)"
              :marker="marker"
              v-for="marker in markers"
              :key="marker._id"
            />
          </div>
        </v-col>
      </v-row>
      <v-divider></v-divider>
      <div class="mt-2 d-flex">
        <v-spacer></v-spacer>
        <router-link v-if="currentScene.studio" :to="`/studio/${currentScene.studio._id}`">
          <v-img contain v-ripple max-width="200px" :src="studioLogo"></v-img>
        </router-link>
      </div>
      <v-row>
        <v-col cols="12" sm="6" md="4">
          <div v-if="currentScene.releaseDate">
            <div class="d-flex align-center">
              <v-icon>mdi-calendar</v-icon>
              <v-subheader>Release Date</v-subheader>
            </div>
            <div
              class="med--text pa-2"
            >{{ new Date(currentScene.releaseDate).toDateString(undefined, { timeZone: "UTC" }) }}</div>
          </div>

          <div v-if="currentScene.description">
            <div class="d-flex align-center">
              <v-icon>mdi-text</v-icon>
              <v-subheader>Description</v-subheader>
            </div>
            <div
              class="pa-2 med--text"
              v-if="currentScene.description"
            >{{ currentScene.description }}</div>
          </div>

          <div class="d-flex align-center">
            <v-icon>mdi-star</v-icon>
            <v-subheader>Rating</v-subheader>
          </div>
          <Rating @change="rate" class="px-2" :value="currentScene.rating" />
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
              color="primary"
              v-ripple
              @click="openLabelSelector"
              small
              :class="`mr-1 mb-1 hover ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
            >+ Add</v-chip>
          </div>
          <v-divider />
          <v-btn
            text
            class="mt-2 text-none"
            color="primary"
            @click="openThumbnailDialog"
          >Change thumbnail</v-btn>
          <br />
          <v-btn
            text
            class="mt-2 text-none"
            color="primary"
            @click="createScreenshot"
            :loading="screenshotLoader"
          >Use current frame as thumbnail</v-btn>
        </v-col>

        <v-col class="d-flex" cols="12" sm="6" md="8">
          <v-divider v-if="$vuetify.breakpoint.smAndUp" class="mr-2 d-inline-block" vertical />

          <div>
            <div class="d-flex align-center">
              <v-icon>mdi-information-outline</v-icon>
              <v-subheader>Info</v-subheader>
              <v-tooltip right v-if="processed">
                <template v-slot:activator="{ on }">
                  <v-icon v-on="on">mdi-check</v-icon>
                </template>
                Processing done
              </v-tooltip>
            </div>
            <div v-if="currentScene.meta.duration" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Video duration</v-subheader>
              {{ videoDuration }}
            </div>
            <div v-if="currentScene.path" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Filesystem path</v-subheader>
              {{ currentScene.path}}
            </div>
            <div v-if="currentScene.meta.dimensions.width" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Video dimensions</v-subheader>
              {{ currentScene.meta.dimensions.width }}x{{ currentScene.meta.dimensions.height }}
            </div>
            <div v-if="currentScene.meta.fps" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Framerate</v-subheader>
              {{ currentScene.meta.fps }} fps
            </div>
            <div v-if="currentScene.meta.size" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Video size</v-subheader>
              {{ (currentScene.meta.size / 1000 / 1000).toFixed(0) }} MB
            </div>
            <div class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">View counter</v-subheader>
              {{ currentScene.watches.length }}
              <v-btn
                :class="`${$vuetify.theme.dark ? 'black--text' : ''}`"
                fab
                color="primary"
                class="mx-3"
                x-small
                @click="watchScene"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
              <v-btn
                :disabled="!currentScene || !currentScene.watches.length"
                :class="`${$vuetify.theme.dark ? 'black--text' : ''}`"
                fab
                color="primary"
                x-small
                @click="unwatchScene"
              >
                <v-icon>mdi-minus</v-icon>
              </v-btn>
            </div>
            <div v-if="currentScene.watches.length" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Last time watched</v-subheader>
              {{ new Date(currentScene.watches[currentScene.watches.length - 1]).toLocaleString() }}
            </div>

            <div v-if="currentScene.availableFields.length">
              <v-subheader>Custom data</v-subheader>
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
                :cols="12"
                :sm="12"
                :md="6"
                :lg="4"
                :xl="3"
                :fields="currentScene.availableFields"
                v-model="editCustomFields"
                @change="hasUpdatedFields = true"
              />
            </div>

            <div class="text-center mt-3">
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
      <v-divider></v-divider>
      <v-row>
        <v-col cols="12" sm="6">
          <h1 class="font-weight-light text-center">Starring</h1>
          <ActorGrid
            :cols="6"
            :sm="6"
            :md="4"
            :lg="4"
            :xl="3"
            :value="actors"
            :sceneDate="currentScene.releaseDate"
          />
        </v-col>
        <v-col cols="12" sm="6" class="d-flex">
          <v-divider v-if="$vuetify.breakpoint.smAndUp" class="mr-2 d-inline-block" vertical />
          <div v-if="movies.length" style="width: 100%">
            <h1 class="font-weight-light text-center">Featured in</h1>
            <v-row class="pa-2">
              <v-col
                class="pa-1"
                v-for="(movie, i) in movies"
                :key="movie._id"
                cols="6"
                sm="6"
                md="6"
                lg="4"
                xl="4"
              >
                <MovieCard
                  :showSceneCount="false"
                  :showActors="false"
                  :showLabels="false"
                  :showRating="false"
                  :movie="movie"
                  style="height: 100%"
                  v-model="movies[i]"
                />
              </v-col>
            </v-row>
          </div>
        </v-col>
      </v-row>

      <div class="d-flex align-center">
        <v-spacer></v-spacer>
        <h1 class="font-weight-light mr-3">{{ images.length }} Images</h1>
        <v-btn @click="openUploadDialog" icon>
          <v-icon>mdi-upload</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
      </div>
      <div v-if="images.length">
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
                        light
                      >
                        <v-icon>mdi-image</v-icon>
                      </v-btn>
                    </template>
                    <span>Set as scene thumbnail</span>
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
      <v-card :loading="labelEditLoader" v-if="currentScene">
        <v-card-title>Select labels for '{{ currentScene.name }}'</v-card-title>

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

    <v-dialog scrollable v-model="markerLabelSelectorDialog" max-width="400px">
      <v-card v-if="currentScene">
        <v-card-title>Select marker labels</v-card-title>

        <v-text-field
          clearable
          color="primary"
          hide-details
          class="px-5 mb-2"
          label="Find labels..."
          v-model="markerLabelSearchQuery"
        />

        <v-card-text style="max-height: 400px">
          <LabelSelector
            :searchQuery="markerLabelSearchQuery"
            :items="allLabels"
            v-model="selectedMarkerLabels"
          />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            @click="markerLabelSelectorDialog = false"
            text
            color="primary"
            class="text-none"
          >OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <infinite-loading v-if="currentScene" :identifier="infiniteId" @infinite="infiniteHandler">
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
      v-if="currentScene"
      :persistent="isUploading"
      scrollable
      v-model="uploadDialog"
      max-width="400px"
    >
      <ImageUploader
        :labels="currentScene.labels.map(l => l._id)"
        :name="currentScene.name"
        :actors="currentScene.actors.map(a => a._id)"
        :scene="currentScene._id"
        @update-state="isUploading = $event"
        @uploaded="images.unshift($event)"
      />
    </v-dialog>

    <v-dialog v-model="thumbnailDialog" max-width="600px">
      <v-card v-if="currentScene" :loading="thumbnailLoader">
        <v-card-title>Set thumbnail for '{{ currentScene.name }}'</v-card-title>
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
              @change="changeCrop"
            ></cropper>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!thumbnailDisplay"
            class="text-none"
            color="primary"
            text
            @click="uploadThumbnail"
          >Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="markerDialog" max-width="400px">
      <v-card v-if="currentScene">
        <v-card-title>Create marker at {{ currentTimeFormatted() }}</v-card-title>
        <v-card-text>
          <v-combobox
            clearable
            :items="allLabels.map(l => l.name)"
            placeholder="Marker title"
            color="primary"
            v-model="markerName"
          ></v-combobox>

          <v-btn
            @click="markerLabelSelectorDialog = true"
            text
            color="primary"
            class="text-none mb-2"
          >{{ selectedMarkerLabels.length ? `Selected ${selectedMarkerLabels.length} ${selectedMarkerLabels.length == 1 ? 'label' : 'labels'}` : 'Select labels' }}</v-btn>

          <Rating @input="markerRating = $event" class="px-2" :value="markerRating" />
          <v-checkbox hide-details color="primary" v-model="markerFavorite" label="Favorite?"></v-checkbox>
          <v-checkbox hide-details color="primary" v-model="markerBookmark" label="Bookmark?"></v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!markerName || !markerName.length"
            color="primary"
            text
            @click="createMarker"
            class="text-none"
          >Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import sceneFragment from "../fragments/scene";
import studioFragment from "../fragments/studio";
import { sceneModule } from "../store/scene";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import movieFragment from "../fragments/movie";
import ActorCard from "../components/ActorCard.vue";
import MovieCard from "../components/MovieCard.vue";
import moment from "moment";
import LabelSelector from "../components/LabelSelector.vue";
import Lightbox from "../components/Lightbox.vue";
import ImageCard from "../components/ImageCard.vue";
import InfiniteLoading from "vue-infinite-loading";
import { Cropper } from "vue-advanced-cropper";
import ImageUploader from "../components/ImageUploader.vue";
import { actorModule } from "../store/actor";
import IActor from "../types/actor";
import IImage from "../types/image";
import IMovie from "../types/movie";
import ILabel from "../types/label";
import { contextModule } from "../store/context";
import { watch, unwatch } from "../util/scene";
import MarkerItem from "../components/MarkerItem.vue";
import hotkeys from "hotkeys-js";
import CustomFieldSelector from "../components/CustomFieldSelector.vue";
import ActorGrid from "../components/ActorGrid.vue";
import VideoPlayer from "../components/VideoPlayer.vue";

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
    MovieCard,
    ActorGrid,
    ActorCard,
    LabelSelector,
    Lightbox,
    ImageCard,
    InfiniteLoading,
    Cropper,
    ImageUploader,
    MarkerItem,
    CustomFieldSelector,
    VideoPlayer
  },
  beforeRouteLeave(_to, _from, next) {
    sceneModule.setCurrent(null);
    next();
  }
})
export default class SceneDetails extends Vue {
  $refs!: {
    player: VideoPlayer;
  };

  actors = [] as IActor[];
  images = [] as IImage[];
  movies = [] as IMovie[];
  lightboxIndex = null as number | null;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  screenshotLoader = false;

  infiniteId = 0;
  page = 0;

  thumbnailDialog = false;
  thumbnailLoader = false;
  thumbnailDisplay = null as string | null;
  selectedThumbnail = null as File | null;
  crop: ICropCoordinates = { left: 0, top: 0, width: 0, height: 0 };

  uploadDialog = false;
  isUploading = false;

  markers = [] as { _id: string; name: string; time: number }[];
  markerName = "" as string | null;
  markerRating = null as number | null;
  markerFavorite = false;
  markerBookmark = false;
  markerDialog = false;
  markerLabelSelectorDialog = false;
  selectedMarkerLabels = [] as number[];
  markerLabelSearchQuery = "";

  autoPaused = false;
  manuallyStarted = false;

  labelSearchQuery = "";

  editCustomFields = {} as any;
  hasUpdatedFields = false;

  pluginLoader = false;

  processed = false;

  runPlugins() {
    if (!this.currentScene) return;

    this.pluginLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          runScenePlugins(ids: $ids) {
            processed
            preview {
              _id
            }
            ...SceneFragment
            actors {
              ...ActorFragment
              thumbnail {
                _id
                color
              }
            }
            studio {
              ...StudioFragment
            }
            movies {
              ...MovieFragment
              scenes {
                ...SceneFragment
              }
              actors {
                ...ActorFragment
              }
            }
            markers {
              _id
              name
              time
              labels {
                _id
                name
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
        ${movieFragment}
      `,
      variables: {
        ids: [this.currentScene._id]
      }
    })
      .then(res => {
        sceneModule.setCurrent(res.data.runScenePlugins[0]);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.pluginLoader = false;
      });
  }

  updateCustomFields() {
    if (!this.currentScene) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            customFields
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          customFields: this.editCustomFields
        }
      }
    })
      .then(res => {
        sceneModule.setCustomFields(res.data.updateScenes[0].customFields);
        this.hasUpdatedFields = false;
      })
      .catch(err => {
        console.error(err);
      });
  }

  createScreenshot() {
    this.screenshotLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation($id: String!, $sec: Float!) {
          screenshotScene(id: $id, sec: $sec) {
            _id
          }
        }
      `,
      variables: {
        // @ts-ignore
        id: this.currentScene._id,
        sec: this.$refs.player.currentProgress()
      }
    })
      .then(res => {
        sceneModule.setThumbnail(res.data.screenshotScene._id);
      })
      .finally(() => {
        this.screenshotLoader = false;
      });
  }

  removeMarker(id: string) {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeMarkers(ids: $ids)
        }
      `,
      variables: {
        ids: [id]
      }
    }).then(res => {
      this.markers = this.markers.filter(m => m._id != id);
    });
  }

  createMarker() {
    if (!this.currentScene) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $scene: String!
          $name: String!
          $time: Int!
          $rating: Int
          $favorite: Boolean
          $bookmark: Long
          $labels: [String!]
        ) {
          createMarker(
            scene: $scene
            name: $name
            time: $time
            rating: $rating
            favorite: $favorite
            bookmark: $bookmark
            labels: $labels
          ) {
            _id
            name
            time
            rating
            favorite
            bookmark
            labels {
              _id
              name
            }
          }
        }
      `,
      variables: {
        scene: this.currentScene._id,
        name: this.markerName,
        time: Math.floor(this.$refs.player.currentProgress()),
        rating: this.markerRating,
        favorite: this.markerFavorite,
        bookmark: this.markerBookmark ? Date.now() : null,
        labels: this.selectedMarkerLabels
          .map(i => this.allLabels[i])
          .map(l => l._id)
      }
    }).then(res => {
      this.markers.unshift(res.data.createMarker);

      this.markers.sort((a, b) => a.time - b.time);
      this.markerName = "";
      this.markerDialog = false;
    });
  }

  formatTime(secs: number) {
    return moment()
      .startOf("day")
      .seconds(secs)
      .format("H:mm:ss");
  }

  currentTimeFormatted() {
    if (this.$refs.player)
      return this.formatTime(this.$refs.player.currentProgress());
  }

  openMarkerDialog() {
    if (!this.allLabels.length) this.loadLabels();
    this.$refs.player.pause();
    this.markerDialog = true;
  }

  async unwatchScene() {
    if (this.currentScene) await unwatch(this.currentScene);
  }

  async watchScene() {
    if (this.currentScene) await watch(this.currentScene);
  }

  get aspectRatio() {
    return contextModule.sceneAspectRatio;
  }

  get videoPath() {
    if (this.currentScene)
      return `${serverBase}/scene/${
        this.currentScene._id
      }?password=${localStorage.getItem("password")}`;
  }

  @Watch("currentScene.actors", { deep: true })
  onActorChange(newVal: any[]) {
    this.actors = newVal;
  }

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
    if (!this.currentScene) return;

    this.thumbnailLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $crop: Crop
          $actors: [String!]
          $labels: [String!]
          $scene: String
          $compress: Boolean
        ) {
          uploadImage(
            file: $file
            name: $name
            crop: $crop
            actors: $actors
            labels: $labels
            scene: $scene
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
        name: this.currentScene.name + " (thumbnail)",
        scene: this.currentScene._id,
        crop: {
          left: this.crop.left,
          top: this.crop.top,
          width: this.crop.width,
          height: this.crop.height
        },
        actors: this.currentScene.actors.map(a => a._id),
        labels: this.currentScene.labels.map(a => a._id),
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

  get currentScene() {
    return sceneModule.current;
  }

  async fetchPage() {
    if (!this.currentScene) return;

    try {
      const query = `page:${this.page} sortDir:asc sortBy:addedOn scenes:${this.currentScene._id}`;

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

  setAsThumbnail(id: string) {
    if (!this.currentScene) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          thumbnail: id
        }
      }
    })
      .then(res => {
        sceneModule.setThumbnail(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentScene) return;

    this.labelEditLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            labels {
              _id
              name
              aliases
            }
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          labels: this.selectedLabels
            .map(i => this.allLabels[i])
            .map(l => l._id)
        }
      }
    })
      .then(res => {
        sceneModule.setLabels(res.data.updateScenes[0].labels);
        this.labelSelectorDialog = false;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.labelEditLoader = false;
      });
  }

  async loadLabels() {
    const res = await ApolloClient.query({
      query: gql`
        {
          getLabels {
            _id
            name
            aliases
          }
        }
      `
    });

    this.allLabels = res.data.getLabels;
  }

  openLabelSelector() {
    if (!this.currentScene) return;

    if (!this.allLabels.length) {
      this.loadLabels()
        .then(res => {
          if (!this.currentScene) return;
          this.selectedLabels = this.currentScene.labels.map(l =>
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

  get videoDuration() {
    if (this.currentScene)
      return this.formatTime(this.currentScene.meta.duration);
    return "";
  }

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }

  rate($event) {
    if (!this.currentScene) return;

    const rating = $event;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      sceneModule.setRating(rating);
    });
  }

  get labelNames() {
    if (!this.currentScene) return [];
    return this.currentScene.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.currentScene && this.currentScene.thumbnail)
      return `${serverBase}/image/${
        this.currentScene.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return `${serverBase}/broken`;
  }

  get studioLogo() {
    if (
      this.currentScene &&
      this.currentScene.studio &&
      this.currentScene.studio.thumbnail
    )
      return `${serverBase}/image/${
        this.currentScene.studio.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  onLoad() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getSceneById(id: $id) {
            processed
            preview {
              _id
            }
            ...SceneFragment
            actors {
              ...ActorFragment
              thumbnail {
                _id
                color
              }
            }
            studio {
              ...StudioFragment
            }
            movies {
              ...MovieFragment
              scenes {
                ...SceneFragment
              }
              actors {
                ...ActorFragment
              }
            }
            studio {
              _id
              name
              thumbnail {
                _id
              }
            }
            markers {
              _id
              name
              time
              labels {
                _id
                name
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
        ${movieFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      if (!res.data.getSceneById) return this.$router.replace("/scenes");

      sceneModule.setCurrent(res.data.getSceneById);

      this.processed = res.data.getSceneById.processed;
      this.actors = res.data.getSceneById.actors;
      this.movies = res.data.getSceneById.movies;
      this.markers = res.data.getSceneById.markers;
      this.markers.sort((a, b) => a.time - b.time);
      this.editCustomFields = res.data.getSceneById.customFields;
    });
  }

  beforeMount() {
    this.onLoad();
  }

  goToPreviousMarker() {
    const progress = this.$refs.player.currentProgress();
    const prevMarkers = this.markers.filter(m => m.time < progress - 5);
    if (prevMarkers.length) {
      const prevMarker = prevMarkers.pop() as {
        _id: string;
        name: string;
        time: number;
      };
      this.$refs.player.seek(prevMarker.time, prevMarker.name);
    } else this.$refs.player.seek(0);
  }

  goToNextMarker() {
    const progress = this.$refs.player.currentProgress();
    const nextMarker = this.markers.find(m => m.time > progress);
    if (nextMarker) this.$refs.player.seek(nextMarker.time, nextMarker.name);
  }

  destroyed() {
    hotkeys.unbind("b");
    hotkeys.unbind("n");
    hotkeys.unbind("*");
  }

  mounted() {
    hotkeys("n", () => {
      this.goToNextMarker();
      return false;
    });

    hotkeys("b", () => {
      this.goToPreviousMarker();
      return false;
    });

    hotkeys("*", ev => {
      if (ev.keyCode == 37) this.$refs.player.seekRel(-5);
      else if (ev.keyCode == 39) this.$refs.player.seekRel(5);
      else if (ev.keyCode == 145) {
        this.$refs.player.panic();
      }
    });

    window.onblur = () => {
      if (
        this.$refs.player &&
        !this.$refs.player.isPaused() &&
        !document.hasFocus() &&
        contextModule.scenePauseOnUnfocus
      ) {
        this.$refs.player.pause();
        this.autoPaused = true;
        this.$refs.player.notice("Auto pause", 4000);
      }
    };

    window.onfocus = () => {
      if (
        document.hasFocus() &&
        this.$refs.player &&
        contextModule.scenePauseOnUnfocus &&
        this.autoPaused &&
        this.manuallyStarted
      ) {
        this.$refs.player.play();
        this.$refs.player.notice("", 0);
        this.autoPaused = false;
      }
    };

    document.addEventListener(
      "visibilitychange",
      () => {
        if (this.$refs.player && contextModule.scenePauseOnUnfocus) {
          const isPaused = this.$refs.player.isPaused();

          if (document.hidden) {
            if (!isPaused) {
              this.$refs.player.pause();
              this.autoPaused = true;
              this.$refs.player.notice("Auto pause", 4000);
            }
          } else if (this.autoPaused && this.manuallyStarted) {
            this.$refs.player.play();
            this.autoPaused = false;
            this.$refs.player.notice("");
          }
        }
      },
      false
    );
  }
}
</script>

<style lang="scss" scoped>
</style>
