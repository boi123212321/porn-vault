<template>
  <div>
    <div v-if="currentStudio">
      <div class="text-center" v-if="!currentStudio.thumbnail">
        <v-btn @click="openThumbnailDialog">Upload logo</v-btn>
      </div>
      <div class="d-flex" v-else>
        <v-spacer></v-spacer>
        <v-hover>
          <template v-slot:default="{ hover }">
            <v-img
              @click="openThumbnailDialog"
              v-ripple
              style="width: 50vw; max-width: 400px;"
              eager
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
        <v-spacer></v-spacer>
      </div>
      <div class="mt-3" v-if="currentStudio.parent">
        Part of
        <router-link
          class="accent--text"
          :to="`/studio/${currentStudio.parent._id}`"
        >{{ currentStudio.parent.name }}</router-link>
      </div>

      <div v-if="currentStudio.description" class="med--text pa-2">{{ currentStudio.description }}</div>

      <div class="pt-5 pa-2">
        <div class="d-flex align-center">
          <v-icon>mdi-label</v-icon>
          <v-subheader>Labels</v-subheader>
        </div>
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
          :class="`mr-1 mb-1 hover ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
        >+ Add</v-chip>
      </div>

      <v-row>
        <v-col
          class="pa-1"
          v-for="studio in currentStudio.substudios"
          :key="studio._id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          xl="2"
        >
          <studio-card :studio="studio" style="height: 100%" />
        </v-col>
      </v-row>

      <v-row v-if="movies.length">
        <v-col cols="12">
          <h1 class="text-center font-weight-light">{{ movies.length }} movies</h1>

          <v-row>
            <v-col
              class="pa-1"
              v-for="movie in movies"
              :key="movie._id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
              xl="2"
            >
              <movie-card
                @rate="rateScene(movie._id, $event)"
                @bookmark="bookmarkScene(movie._id, $event)"
                @favorite="favoriteScene(movie._id, $event)"
                :movie="movie"
                style="height: 100%"
              />
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <v-row v-if="scenes.length">
        <v-col cols="12">
          <h1 class="text-center font-weight-light">{{ scenes.length }} scenes</h1>

          <v-row>
            <v-col
              class="pa-1"
              v-for="scene in scenes"
              :key="scene._id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
              xl="2"
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
    </div>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentStudio">
        <v-card-title>Select labels for '{{ currentStudio.name }}'</v-card-title>

        <v-card-text style="max-height: 400px">
          <LabelSelector :items="allLabels" v-model="selectedLabels" />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editLabels" text color="accent" class="text-none">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="thumbnailDialog" max-width="400px">
      <v-card v-if="currentStudio" :loading="thumbnailLoader">
        <v-card-title>Set logo for '{{ currentStudio.name }}'</v-card-title>
        <v-card-text>
          <v-file-input color="accent" placeholder="Select an image" v-model="selectedThumbnail"></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadThumbnail" text class="text-none" color="accent">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <infinite-loading v-if="currentStudio" :identifier="infiniteId" @infinite="infiniteHandler">
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
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import sceneFragment from "../fragments/scene";
import { studioModule } from "../store/studio";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import movieFragment from "../fragments/movie";
import moment from "moment";
import Lightbox from "../components/Lightbox.vue";
import SceneCard from "../components/SceneCard.vue";
import MovieCard from "../components/MovieCard.vue";
import InfiniteLoading from "vue-infinite-loading";
import { actorModule } from "../store/actor";
import IActor from "../types/actor";
import IImage from "../types/image";
import ILabel from "../types/label";
import studioFragment from "../fragments/studio";
import IScene from "../types/scene";
import IMovie from "../types/movie";
import StudioCard from "../components/StudioCard.vue";
import LabelSelector from "../components/LabelSelector.vue";

@Component({
  components: {
    Lightbox,
    SceneCard,
    MovieCard,
    InfiniteLoading,
    StudioCard,
    LabelSelector
  },
  beforeRouteLeave(_to, _from, next) {
    studioModule.setCurrent(null);
    next();
  }
})
export default class StudioDetails extends Vue {
  movies = [] as IMovie[];
  scenes = [] as IScene[];
  lightboxIndex = null as number | null;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  infiniteId = 0;
  page = 0;

  thumbnailDialog = false;
  thumbnailLoader = false;
  selectedThumbnail = null as File | null;

  uploadThumbnail() {
    if (!this.currentStudio) return;

    this.thumbnailLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation(
          $file: Upload!
          $name: String
          $studio: String
          $lossless: Boolean
        ) {
          uploadImage(
            file: $file
            name: $name
            studio: $studio
            lossless: $lossless
          ) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.selectedThumbnail,
        name: this.currentStudio.name + " (thumbnail)",
        studio: this.currentStudio._id,
        lossless: true
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.setAsThumbnail(image._id);
        this.thumbnailDialog = false;
        this.selectedThumbnail = null;
      })
      .finally(() => {
        this.thumbnailLoader = false;
      });
  }

  openThumbnailDialog() {
    this.thumbnailDialog = true;
  }

  /* removeImage(index: number) {
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
  } */

  get currentStudio() {
    return studioModule.current;
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

  async fetchPage() {
    if (!this.currentStudio) return;

    try {
      const query = `page:${this.page} sortDir:asc sortBy:addedOn studios:${this.currentStudio._id}`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getScenes(query: $query) {
              ...SceneFragment
              actors {
                ...ActorFragment
              }
              studio {
                _id
                name
              }
            }
          }
          ${sceneFragment}
          ${actorFragment}
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

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.scenes.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  setAsThumbnail(id: string) {
    if (!this.currentStudio) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          thumbnail: id
        }
      }
    })
      .then(res => {
        studioModule.setThumbnail(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentStudio) return;

    this.labelEditLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            labels {
              _id
              name
              aliases
            }
          }
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          labels: this.selectedLabels
            .map(i => this.allLabels[i])
            .map(l => l._id)
        }
      }
    })
      .then(res => {
        studioModule.setLabels(res.data.updateStudios[0].labels);
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
    if (!this.currentStudio) return;

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
          if (!this.currentStudio) return;

          this.allLabels = res.data.getLabels;
          this.selectedLabels = this.currentStudio.labels.map(l =>
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

  /* imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  } */

  /*  rateActor(id: any, rating: number) {
    const index = this.actors.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.actors[index];
      actor.rating = rating;
      Vue.set(this.actors, index, actor);
    }
  }

  favoriteActor(id: any, favorite: boolean) {
    const index = this.actors.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.actors[index];
      actor.favorite = favorite;
      Vue.set(this.actors, index, actor);
    }
  }

  bookmarkActor(id: any, bookmark: boolean) {
    const index = this.actors.findIndex(sc => sc._id == id);

    if (index > -1) {
      const actor = this.actors[index];
      actor.bookmark = bookmark;
      Vue.set(this.actors, index, actor);
    }
  } */

  get labelNames() {
    if (!this.currentStudio) return [];
    return this.currentStudio.labels.map(l => l.name).sort();
  }

  get thumbnail() {
    if (this.currentStudio && this.currentStudio.thumbnail)
      return `${serverBase}/image/${
        this.currentStudio.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  @Watch("$route.params.id")
  onRouteChange() {
    studioModule.setCurrent(null);
    this.movies = [];
    this.scenes = [];
    this.selectedLabels = [];
    this.page = 0;
    this.onLoad();
  }

  onLoad() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getStudioById(id: $id) {
            ...StudioFragment
            movies {
              ...MovieFragment
              actors {
                ...ActorFragment
              }
              scenes {
                ...SceneFragment
                actors {
                  ...ActorFragment
                }
                studio {
                  ...StudioFragment
                }
              }
              studio {
                ...StudioFragment
              }
            }
            substudios {
              ...StudioFragment
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
      studioModule.setCurrent(res.data.getStudioById);
      this.movies = res.data.getStudioById.movies;
      document.title = res.data.getStudioById.name;
    });
  }

  beforeMount() {
    this.onLoad();
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