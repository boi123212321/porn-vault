<template>
  <v-container fluid>
    <BindFavicon />

    <div v-if="currentScene">
      <BindTitle :value="currentScene.name" />
      <div class="d-flex pb-2">
        <div class="d-flex align-center text-center pa-2" style="flex-grow: 1; width: 100%">
          <div class="mx-auto" :style="{ maxWidth: theaterMode ? null : '1100px', width: '100%' }">
            <VideoPlayer
              maxHeight="85vh"
              ref="player"
              :sources="sources"
              :poster="thumbnail"
              :duration="currentScene.meta.duration"
              :dimensions="currentScene.meta.dimensions"
              :markers="markers"
              :preview="preview"
              :theaterMode="theaterMode"
              :showTheaterMode="$vuetify.breakpoint.mdAndUp"
              @theaterMode="setTheaterMode"
              @play="manuallyStarted = true"
            />
          </div>
        </div>
        <template v-if="!theaterMode && $vuetify.breakpoint.mdAndUp">
          <v-divider vertical />
          <div class="py-2" style="width: 400px; max-width: 400px">
            <div class="text-center">
              <v-btn class="text-none" color="primary" text @click="openMarkerDialog"
                >Create marker</v-btn
              >
            </div>
            <div class="mt-3">
              <MarkerItem
                :labels="allLabels"
                style="width: 100%"
                @jump="
                  $refs.player.seek(marker.time, marker.name);
                  $refs.player.play();
                "
                @delete="removeMarker(marker._id)"
                v-model="markers[i]"
                v-for="(marker, i) in markers"
                :key="marker._id"
              />
            </div>
          </div>
        </template>
      </div>

      <v-row v-if="theaterMode || !$vuetify.breakpoint.mdAndUp">
        <v-col
          cols="12"
          :sm="theaterMode ? 12 : 12"
          :md="theaterMode ? 12 : 4"
          :lg="theaterMode ? 12 : 2"
          :xl="theaterMode ? 12 : 1"
        >
          <div class="text-center">
            <v-btn class="text-none" color="primary" text @click="openMarkerDialog"
              >Create marker</v-btn
            >
          </div>
          <div class="mt-3">
            <MarkerItem
              :labels="allLabels"
              style="width: 100%"
              @jump="
                $refs.player.seek(marker.time, marker.name);
                $refs.player.play();
              "
              @delete="removeMarker(marker._id)"
              v-model="markers[i]"
              v-for="(marker, i) in markers"
              :key="marker._id"
            />
          </div>
        </v-col>
      </v-row>
      <v-divider></v-divider>
      <div class="mt-2 d-flex">
        <v-spacer></v-spacer>
        <router-link v-if="currentScene.studio" :to="`/studio/${currentScene.studio._id}`">
          <v-img v-if="studioLogo" contain v-ripple max-width="200px" :src="studioLogo"></v-img>
          <span v-else>{{ currentScene.studio.name }}</span>
        </router-link>
      </div>
      <v-row>
        <v-col cols="12" sm="6" md="4">
          <div v-if="currentScene.releaseDate">
            <div class="d-flex align-center">
              <v-icon>mdi-calendar</v-icon>
              <v-subheader>Release Date</v-subheader>
            </div>
            <div class="med--text pa-2">
              {{ new Date(currentScene.releaseDate).toDateString(undefined, { timeZone: "UTC" }) }}
            </div>
          </div>
          <div v-if="currentScene.addedOn">
            <div class="d-flex align-center">
              <v-icon>mdi-calendar-check</v-icon>
              <v-subheader>Added to collection</v-subheader>
            </div>
            <div class="med--text pa-2">
              {{ new Date(currentScene.addedOn).toDateString(undefined, { timeZone: "UTC" }) }}
            </div>
          </div>


          <div v-if="currentScene.description">
            <div class="d-flex align-center">
              <v-icon>mdi-text</v-icon>
              <v-subheader>Description</v-subheader>
            </div>
            <div class="pa-2 med--text" v-if="currentScene.description">
              {{ currentScene.description }}
            </div>
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
            <label-group
              :limit="999"
              :item="currentScene._id"
              :value="currentScene.labels"
              @input="updateSceneLabels"
            >
              <v-chip
                label
                color="primary"
                v-ripple
                @click="openLabelSelector"
                small
                :class="`mr-1 mb-1 hover ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
                >+ Add</v-chip
              >
            </label-group>
          </div>
          <v-divider />
          <v-btn text class="mt-2 text-none" color="primary" @click="openThumbnailDialog"
            >Change thumbnail</v-btn
          >
          <br />
          <v-btn
            text
            class="mt-2 text-none"
            color="primary"
            @click="createScreenshot"
            :loading="screenshotLoader"
            >Use current frame as thumbnail</v-btn
          >
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
            <div
              style="word-break: break-all"
              v-if="currentScene.path"
              class="px-2 d-flex align-center"
            >
              <v-subheader style="min-width: 150px">Filesystem path</v-subheader>
              {{ currentScene.path }}
            </div>
            <div v-if="currentScene.meta.dimensions.width" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Video dimensions</v-subheader>
              {{ currentScene.meta.dimensions.width }}x{{ currentScene.meta.dimensions.height }}
            </div>
            <div v-if="currentScene.meta.fps" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Framerate</v-subheader>
              {{ Math.floor(currentScene.meta.fps) }} fps
            </div>
            <div v-if="currentScene.meta.size" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Video size</v-subheader>
              {{ Math.round(currentScene.meta.size / 1000 / 1000) }} MB ({{
                currentScene.meta.size
              }}
              bytes)
            </div>
            <div v-if="currentScene.meta.bitrate" class="px-2 d-flex align-center">
              <v-subheader style="min-width: 150px">Bitrate</v-subheader>
              {{ Math.round(currentScene.meta.bitrate / 1000) }} KBps
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
                  >Update</v-btn
                >
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
                >Run plugins</v-btn
              >
              <v-btn
                color="primary"
                :loading="runFFProbeLoader"
                text
                class="text-none"
                @click="runFFProbe"
                >Run FFProbe</v-btn
              >
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
        <h1 v-if="numImages >= 0" class="font-weight-light mr-3">{{ numImages }} images</h1>
        <v-btn v-if="numImages >= 0" @click="openUploadDialog" icon>
          <v-icon>mdi-upload</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
      </div>
      <div>
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
              <ImageCard @click="lightboxIndex = index" width="100%" height="100%" :image="image">
                <template v-slot:action>
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        v-on="on"
                        @click.native.stop="setAsThumbnail(image._id)"
                        class="elevation-2 mb-2"
                        icon
                        style="background: #fafafa"
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

          <div class="text-center">
            <v-btn
              class="mt-3 text-none"
              color="primary"
              text
              @click="loadImagePage"
              v-if="moreImages"
              >Load more</v-btn
            >
          </div>

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
        <v-card-title>Select scene labels</v-card-title>

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
          <v-btn @click="selectedLabels = []" text class="text-none">Clear</v-btn>
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
          <v-btn @click="selectedMarkerLabels = []" text class="text-none">Clear</v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="markerLabelSelectorDialog = false" text color="primary" class="text-none"
            >OK</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="currentScene"
      :persistent="isUploading"
      scrollable
      v-model="uploadDialog"
      max-width="400px"
    >
      <ImageUploader
        :labels="currentScene.labels.map((l) => l._id)"
        :name="currentScene.name"
        :actors="currentScene.actors.map((a) => a._id)"
        :scene="currentScene._id"
        @update-state="isUploading = $event"
        @uploaded="images.unshift($event)"
      />
    </v-dialog>

    <v-dialog v-model="thumbnailDialog" max-width="600px">
      <v-card v-if="currentScene" :loading="thumbnailLoader">
        <v-card-title>Set scene thumbnail</v-card-title>
        <v-card-text>
          <v-file-input
            accept=".png, .jpg, .jpeg"
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
            >Upload</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="markerDialog" max-width="400px">
      <v-card v-if="currentScene">
        <v-card-title>Create marker at {{ currentTimeFormatted() }}</v-card-title>
        <v-card-text>
          <v-combobox
            clearable
            :items="allLabels.map((l) => l.name)"
            placeholder="Marker title"
            color="primary"
            v-model="markerName"
          ></v-combobox>

          <v-btn
            @click="markerLabelSelectorDialog = true"
            text
            color="primary"
            class="text-none mb-2"
            >{{
              selectedMarkerLabels.length
                ? `Selected ${selectedMarkerLabels.length} ${
                    selectedMarkerLabels.length == 1 ? "label" : "labels"
                  }`
                : "Select labels"
            }}</v-btn
          >

          <ActorSelector v-model="selectedMarkerActors" />

          <Rating @input="markerRating = $event" class="px-2" :value="markerRating" />

          <v-checkbox
            hide-details
            color="primary"
            v-model="markerFavorite"
            label="Favorite?"
          ></v-checkbox>

          <v-checkbox
            hide-details
            color="primary"
            v-model="markerBookmark"
            label="Bookmark?"
          ></v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!markerName || !markerName.length"
            color="primary"
            text
            @click="createMarker"
            class="text-none"
            >Create</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog scrollable v-model="ffprobeDialog" max-width="400px">
      <v-card :loading="runFFProbeLoader">
        <v-card-title
          >FFProbe metadata
          <v-spacer></v-spacer>
          <v-btn icon @click="copyFFProbeData" v-if="ffprobeData">
            <v-icon>mdi-content-copy</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text style="max-height: 400px" class="ffprobe-data" v-if="ffprobeData">
          {{ ffprobeData }}
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="ffprobeDialog = false" text class="text-none">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient from "@/apollo";
import gql from "graphql-tag";
import sceneFragment from "@/fragments/scene";
import studioFragment from "@/fragments/studio";
import { sceneModule } from "@/store/scene";
import actorFragment from "@/fragments/actor";
import imageFragment from "@/fragments/image";
import movieFragment from "@/fragments/movie";
import MovieCard from "@/components/Cards/Movie.vue";
import moment from "moment";
import ActorSelector from "@/components/ActorSelector.vue";
import LabelSelector from "@/components/LabelSelector.vue";
import Lightbox from "@/components/Lightbox.vue";
import ImageCard from "@/components/Cards/Image.vue";
import { Cropper } from "vue-advanced-cropper";
import ImageUploader from "@/components/ImageUploader.vue";
import IActor from "@/types/actor";
import IImage from "@/types/image";
import IMovie from "@/types/movie";
import ILabel from "@/types/label";
import { contextModule } from "@/store/context";
import { watch, unwatch } from "@/util/scene";
import MarkerItem from "@/components/MarkerItem.vue";
import hotkeys from "hotkeys-js";
import CustomFieldSelector from "@/components/CustomFieldSelector.vue";
import ActorGrid from "@/components/ActorGrid.vue";
import VideoPlayer from "@/components/VideoPlayer.vue";
import { copy } from "@/util/object";
import IScene, { SceneSource } from "@/types/scene";

interface ICropCoordinates {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ICropResult {
  coordinates: ICropCoordinates;
}

export const pageDataQuery = `
processed
preview {
  _id
  meta {
    dimensions {
      width
      height
    }
  }
}
...SceneFragment
availableStreams {
  label
  mimeType
  streamType
  transcode
}
actors {
  ...ActorFragment
  thumbnail {
    _id
    color
  }
}
studio {
  ...StudioFragment
  thumbnail {
    _id
  }
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
  favorite
  bookmark
  rating
  actors {
    ...ActorFragment
    avatar {
      _id
    }
  }
  labels {
    _id
    name
    color
  }
  thumbnail {
    _id
  }
}
`;

const LS_THEATER_MODE = "theater_mode";

@Component({
  components: {
    MovieCard,
    ActorGrid,
    LabelSelector,
    Lightbox,
    ImageCard,
    Cropper,
    ImageUploader,
    MarkerItem,
    CustomFieldSelector,
    VideoPlayer,
    ActorSelector,
  },
  beforeRouteLeave(_to, _from, next) {
    sceneModule.setCurrent(null);
    next();
  },
})
export default class SceneDetails extends Vue {
  $refs!: {
    player: VideoPlayer;
  };

  theaterMode = localStorage.getItem(LS_THEATER_MODE) === "true";

  actors = [] as IActor[];
  images = [] as IImage[];
  movies = [] as IMovie[];
  lightboxIndex = null as number | null;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  screenshotLoader = false;

  imagePage = 0;
  moreImages = true;
  numImages = -1;

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
  selectedMarkerActors = [] as IActor[];
  markerLabelSearchQuery = "";

  autoPaused = false;
  manuallyStarted = false;

  labelSearchQuery = "";

  editCustomFields = {} as any;
  hasUpdatedFields = false;

  pluginLoader = false;

  processed = false;

  ffprobeDialog = false;
  runFFProbeLoader = false;
  ffprobeData: string | null = null;

  runPlugins() {
    if (!this.currentScene) {
      return;
    }

    this.pluginLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($id: String!) {
          runScenePlugins(id: $id) {
            ${pageDataQuery}
          }
        }
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
        ${movieFragment}
      `,
      variables: {
        id: this.currentScene._id,
      },
    })
      .then((res) => {
        sceneModule.setCurrent(res.data.runScenePlugins);
        this.markers = res.data.runScenePlugins.markers;
        this.markers.sort((a, b) => a.time - b.time);
        this.actors = res.data.runScenePlugins.actors;
        this.movies = res.data.runScenePlugins.movies;
        this.editCustomFields = res.data.runScenePlugins.customFields;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.pluginLoader = false;
      });
  }

  runFFProbe() {
    if (!this.currentScene) {
      return;
    }

    this.runFFProbeLoader = true;
    this.ffprobeData = null;
    this.ffprobeDialog = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation($id: String!) {
          runFFProbe(id: $id) {
            ffprobe
            scene {
              ${pageDataQuery}
            }
          }
        }
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
        ${movieFragment}
      `,
      variables: {
        id: this.currentScene._id,
      },
    })
      .then((res) => {
        sceneModule.setCurrent(res.data.runFFProbe.scene);
        this.ffprobeData = JSON.stringify(JSON.parse(res.data.runFFProbe.ffprobe), null, 2);
        this.ffprobeDialog = true;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.runFFProbeLoader = false;
      });
  }

  copyFFProbeData() {
    if (!this.ffprobeData) {
      return;
    }

    navigator.clipboard.writeText(this.ffprobeData).then(
      () => {
        /* clipboard successfully set */
      },
      () => {
        /* clipboard write failed */
      }
    );
  }

  updateCustomFields() {
    if (!this.currentScene) {
      return;
    }

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
          customFields: this.editCustomFields,
        },
      },
    })
      .then((res) => {
        sceneModule.setCustomFields(res.data.updateScenes[0].customFields);
        this.hasUpdatedFields = false;
      })
      .catch((err) => {
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
        sec: this.$refs.player.currentProgress(),
      },
    })
      .then((res) => {
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
        ids: [id],
      },
    }).then((res) => {
      this.markers = this.markers.filter((m) => m._id != id);
    });
  }

  createMarker() {
    if (!this.currentScene) {
      return;
    }

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
          $actors: [String!]
        ) {
          createMarker(
            scene: $scene
            name: $name
            time: $time
            rating: $rating
            favorite: $favorite
            bookmark: $bookmark
            labels: $labels
            actors: $actors
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
              color
            }
            actors {
              ...ActorFragment
            }
          }
        }
        ${actorFragment}
      `,
      variables: {
        scene: this.currentScene._id,
        name: this.markerName,
        time: Math.floor(this.$refs.player.currentProgress()),
        rating: this.markerRating,
        favorite: this.markerFavorite,
        bookmark: this.markerBookmark ? Date.now() : null,
        labels: this.selectedMarkerLabels.map((i) => this.allLabels[i]).map((l) => l._id),
        actors: this.selectedMarkerActors.map((ac) => ac._id),
      },
    }).then((res) => {
      this.markers.unshift(res.data.createMarker);
      this.markers.sort((a, b) => a.time - b.time);
      this.markerName = "";
      this.markerDialog = false;
    });
  }

  formatTime(secs: number) {
    return moment().startOf("day").seconds(secs).format("H:mm:ss");
  }

  currentTimeFormatted() {
    if (this.$refs.player) {
      return this.formatTime(this.$refs.player.currentProgress());
    }
  }

  openMarkerDialog() {
    if (!this.allLabels.length) {
      this.loadLabels();
    }
    this.$refs.player.pause();
    this.markerDialog = true;
  }

  async unwatchScene() {
    if (this.currentScene) {
      await unwatch(this.currentScene);
    }
  }

  async watchScene() {
    if (this.currentScene) {
      await watch(this.currentScene);
    }
  }

  get aspectRatio() {
    return contextModule.sceneAspectRatio;
  }

  get sources(): SceneSource[] {
    if (!this.currentScene) {
      return [];
    }

    return this.currentScene.availableStreams.map((s) => ({
      label: s.label,
      mimeType: s.mimeType,
      streamType: s.streamType,
      transcode: s.transcode,
      url: `/api/media/scene/${this.currentScene!._id}?type=${
        s.streamType
      }&password=${localStorage.getItem("password")}`,
    }));
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
      height: Math.round(crop.coordinates.height),
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
    if (file) {
      this.thumbnailDisplay = await this.readImage(file);
    }
  }

  uploadThumbnail() {
    if (!this.currentScene) {
      return;
    }

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
          height: this.crop.height,
        },
        actors: this.currentScene.actors.map((a) => a._id),
        labels: this.currentScene.labels.map((a) => a._id),
        compress: true,
      },
    })
      .then((res) => {
        const image = res.data.uploadImage;
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
        ids: [this.images[index]._id],
      },
    })
      .then((res) => {
        this.images.splice(index, 1);
        this.lightboxIndex = null;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {});
  }

  updateImage({ index, key, value }: { index: number; key: string; value: any }) {
    const images = this.images[index];
    images[key] = value;
    Vue.set(this.images, index, images);
  }

  get currentScene() {
    return sceneModule.current;
  }

  async fetchImagePage() {
    if (!this.currentScene) {
      return [];
    }

    const result = await ApolloClient.query({
      query: gql`
        query($query: ImageSearchQuery!) {
          getImages(query: $query) {
            numItems
            items {
              ...ImageFragment
              actors {
                ...ActorFragment
                avatar {
                  _id
                  color
                }
              }
              labels {
                _id
                name
                color
              }
              scene {
                _id
                name
              }
            }
          }
        }
        ${imageFragment}
        ${actorFragment}
      `,
      variables: {
        query: {
          query: "",
          page: this.imagePage,
          sortDir: "asc",
          sortBy: "addedOn",
          scenes: [this.currentScene._id],
        },
      },
    });

    this.numImages = result.data.getImages.numItems;
    return result.data.getImages.items;
  }

  loadImagePage() {
    this.fetchImagePage().then((items) => {
      if (items.length) {
        this.imagePage++;
        this.images.push(...items);
      } else {
        this.moreImages = false;
      }
    });
  }

  setAsThumbnail(id: string) {
    if (!this.currentScene) {
      return;
    }

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
          thumbnail: id,
        },
      },
    })
      .then((res) => {
        sceneModule.setThumbnail(id);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  updateSceneLabels(labels: ILabel[]) {
    if (!this.currentScene) {
      return Promise.reject();
    }

    return ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            labels {
              _id
              name
              aliases
              color
            }
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          labels: labels.map((l) => l._id),
        },
      },
    })
      .then((res) => {
        sceneModule.setLabels(res.data.updateScenes[0].labels);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentScene) {
      return;
    }

    this.labelEditLoader = true;
    return this.updateSceneLabels(this.selectedLabels.map((i) => this.allLabels[i]))
      .then((res) => {
        this.labelSelectorDialog = false;
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
            color
          }
        }
      `,
    });

    this.allLabels = res.data.getLabels;
  }

  openLabelSelector() {
    if (!this.currentScene) {
      return;
    }

    this.labelSelectorDialog = true;
  }

  get videoDuration() {
    if (this.currentScene) {
      return this.formatTime(this.currentScene.meta.duration);
    }
    return "";
  }

  imageLink(image: { _id: string }): string {
    return `/api/media/image/${image._id}?password=${localStorage.getItem("password")}`;
  }

  get preview() {
    if (!this.currentScene?.preview) {
      return null;
    }
    return {
      src: this.imageLink(this.currentScene.preview),
      dimensions: this.currentScene.preview.meta?.dimensions,
    };
  }

  rate($event) {
    if (!this.currentScene) {
      return;
    }

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
          rating,
        },
      },
    }).then((res) => {
      sceneModule.setRating(rating);
    });
  }

  get thumbnail() {
    if (this.currentScene && this.currentScene.thumbnail) {
      return this.imageLink(this.currentScene.thumbnail);
    }
    return "/assets/broken.png";
  }

  setTheaterMode(theaterMode: boolean): void {
    this.theaterMode = theaterMode;
    localStorage.setItem(LS_THEATER_MODE, this.theaterMode.toString());
  }

  get studioLogo() {
    if (this.currentScene && this.currentScene.studio && this.currentScene.studio.thumbnail) {
      return this.imageLink(this.currentScene.studio.thumbnail);
    }
    return "";
  }

  async onLoad() {
    await this.loadLabels();

    const res = await ApolloClient.query({
      query: gql`
        query($id: String!) {
          getSceneById(id: $id) {
            ${pageDataQuery}
          }
        }
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
        ${movieFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id,
      },
    });

    if (!res.data.getSceneById) {
      return this.$router.replace("/scenes");
    }

    const scene: IScene & { processed: true; movies: IMovie[]; markers: any[] } =
      res.data.getSceneById;

    sceneModule.setCurrent(scene);

    this.processed = scene.processed;
    this.actors = scene.actors;
    this.movies = scene.movies;
    this.markers = scene.markers;
    this.markers.sort((a, b) => a.time - b.time);
    this.editCustomFields = scene.customFields;

    this.selectedMarkerActors = copy(this.actors);

    if (!this.selectedLabels.length) {
      this.selectedLabels = scene.labels.map((l) =>
        this.allLabels.findIndex((k) => k._id == l._id)
      );
    }

    // TODO: wait for player to mount, get event...?
    setTimeout(() => {
      if (this.$route.query.t) {
        const time = parseInt(<string>this.$route.query.t);
        this.$refs.player.seek(time, <string>this.$route.query.mk_name);
        this.$refs.player.play();
      }
    }, 500);
  }

  beforeMount() {
    this.onLoad();
  }

  goToPreviousMarker() {
    const progress = this.$refs.player.currentProgress();
    const prevMarkers = this.markers.filter((m) => m.time < progress - 5);
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
    const nextMarker = this.markers.find((m) => m.time > progress);
    if (nextMarker) {
      this.$refs.player.seek(nextMarker.time, nextMarker.name);
    }
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

    hotkeys("*", (ev) => {
      const hasModifier = ev.ctrlKey || ev.altKey || ev.shiftKey || ev.metaKey;

      if (ev.key === "ArrowLeft" && !hasModifier) {
        this.$refs.player.seekRel(-contextModule.sceneSeekBackward);
      } else if (ev.key == "ArrowRight" && !hasModifier) {
        this.$refs.player.seekRel(contextModule.sceneSeekForward);
      } else if (ev.key == "f" && !hasModifier) {
        this.$refs.player.toggleFullscreen();
      } else if (ev.key == "k" && !hasModifier) {
        this.$refs.player.togglePlay(true);
      } else if (ev.key == "m" && !hasModifier) {
        this.$refs.player.toggleMute(true);
      } else if (ev.key == "t" && !hasModifier) {
        this.setTheaterMode(!this.theaterMode);
      } else if (ev.key == "ScrollLock") {
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
.ffprobe-data {
  white-space: pre;
}
</style>
