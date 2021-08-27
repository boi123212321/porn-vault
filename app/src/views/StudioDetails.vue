<template>
  <v-container fluid>
    <div v-if="currentStudio">
      <BindFavicon />
      <!-- TODO: allow studio favicons -->
      <BindTitle :value="currentStudio.name" />

      <v-row>
        <v-col cols="12" sm="6">
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
                  style="width: 50vw; max-width: 400px"
                  eager
                  :src="thumbnail"
                  class="hover"
                >
                  <v-fade-transition>
                    <v-overlay v-if="hover" absolute color="primary">
                      <v-icon x-large>mdi-upload</v-icon>
                    </v-overlay>
                  </v-fade-transition>
                </v-img>
              </template>
            </v-hover>
            <v-spacer></v-spacer>
          </div>
        </v-col>
        <v-col cols="12" sm="6">
          <div v-if="currentStudio.parent">
            Part of
            <router-link class="primary--text" :to="`/studio/${currentStudio.parent._id}`">{{
              currentStudio.parent.name
            }}</router-link>
          </div>
          <div v-if="currentStudio.description" class="med--text pa-2">
            {{ currentStudio.description }}
          </div>
          <div v-if="currentStudio.url" class="med--text pa-2">
            <a :href="currentStudio.url" target="_blank" rel="noopener noreferrer">
            {{ currentStudio.url }}
            </a>
          </div>
          <div class="py-1">
            <b>{{ currentStudio.numScenes }}</b> scenes
          </div>
          <div class="py-1">
            Avg. scene rating: <b>{{ (currentStudio.averageRating / 2).toFixed(1) }}</b>
            <v-icon small>mdi-star</v-icon>
          </div>

          <div class="pt-5 pa-2">
            <div class="d-flex align-center">
              <v-icon>mdi-label</v-icon>
              <v-subheader>Labels</v-subheader>
            </div>
            <label-group
              :limit="999"
              :item="currentStudio._id"
              :value="currentStudio.labels"
              @input="updateStudioLabels"
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

          <div class="text-center mt-2">
            <v-btn
              color="primary"
              :loading="pluginLoader"
              text
              class="text-none"
              @click="runPlugins"
              >Run plugins</v-btn
            >
          </div>

          <div class="text-center mt-2">
            <v-btn
              color="primary"
              :loading="attachUnmatchedScenesLoader"
              text
              class="text-none"
              @click="attachUnmatchedScenes"
              >Find unmatched scenes</v-btn
            >
          </div>
        </v-col>
      </v-row>

      <v-tabs v-model="activeTab" background-color="transparent" color="primary" centered grow>
        <v-tab>Substudios</v-tab>
        <v-tab>Scenes</v-tab>
        <v-tab>Movies</v-tab>
        <v-tab>{{ actorPlural }}</v-tab>
      </v-tabs>

      <div class="pa-2" v-if="activeTab == 0">
        <v-row v-if="currentStudio.substudios.length">
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
        <div class="mt-3 subtitle-1 text-center" v-else>
          No substudios found for {{ currentStudio.name }}
        </div>
      </div>

      <div class="pa-2" v-if="activeTab == 1">
        <v-row>
          <v-col cols="12">
            <h1 v-if="currentStudio.numScenes" class="text-center font-weight-light">
              {{ currentStudio.numScenes }} scenes
            </h1>

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
            <div class="text-center">
              <v-btn
                class="mt-3 text-none"
                color="primary"
                text
                @click="loadScenePage"
                v-if="moreScenes"
                >Load more</v-btn
              >
            </div>
          </v-col>
        </v-row>
      </div>

      <div class="pa-2" v-if="activeTab == 2">
        <v-row>
          <v-col cols="12">
            <h1 v-if="numMovies >= 0" class="text-center font-weight-light">
              {{ numMovies }} movies
            </h1>

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
            <div class="text-center">
              <v-btn
                class="mt-3 text-none"
                color="primary"
                text
                @click="loadMoviePage"
                v-if="moreMovies"
                >Load more</v-btn
              >
            </div>
          </v-col>
        </v-row>
      </div>

      <div v-if="activeTab == 3">
        <v-row>
          <v-col cols="12">
            <h1 v-if="numActors >= 0" class="text-center font-weight-light">
              {{ numActors }} featured actors
            </h1>

            <v-row>
              <v-col
                class="pa-1"
                v-for="(actor, i) in actors"
                :key="actor._id"
                cols="12"
                sm="6"
                md="3"
                lg="2"
                xl="2"
              >
                <actor-card style="height: 100%" v-model="actors[i]" />
              </v-col>
            </v-row>
            <div class="text-center">
              <v-btn
                class="mt-3 text-none"
                color="primary"
                text
                @click="loadActorPage"
                v-if="moreActors"
                >Load more</v-btn
              >
            </div>
          </v-col>
        </v-row>
      </div>
    </div>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card :loading="labelEditLoader" v-if="currentStudio">
        <v-card-title>Edit studio labels</v-card-title>

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

    <v-dialog v-model="thumbnailDialog" max-width="400px">
      <v-card v-if="currentStudio" :loading="thumbnailLoader">
        <v-card-title>Set studio logo</v-card-title>
        <v-card-text>
          <v-file-input
            accept=".png,.jpg,.jpeg"
            color="primary"
            placeholder="Select an image"
            v-model="selectedThumbnail"
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadThumbnail" text class="text-none" color="primary">Upload</v-btn>
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
import { studioModule } from "@/store/studio";
import actorFragment from "@/fragments/actor";
import imageFragment from "@/fragments/image";
import movieFragment from "@/fragments/movie";
import Lightbox from "@/components/Lightbox.vue";
import SceneCard from "@/components/Cards/Scene.vue";
import MovieCard from "@/components/Cards/Movie.vue";
import ActorCard from "@/components/Cards/Actor.vue";
import IActor from "@/types/actor";
import ILabel from "@/types/label";
import studioFragment from "@/fragments/studio";
import IScene from "@/types/scene";
import IMovie from "@/types/movie";
import StudioCard from "@/components/Cards/Studio.vue";
import LabelSelector from "@/components/LabelSelector.vue";
import { contextModule } from "@/store/context";

@Component({
  components: {
    Lightbox,
    SceneCard,
    MovieCard,
    ActorCard,
    StudioCard,
    LabelSelector,
  },
  beforeRouteLeave(_to, _from, next) {
    studioModule.setCurrent(null);
    next();
  },
})
export default class StudioDetails extends Vue {
  movies = [] as IMovie[];
  scenes = [] as IScene[];
  actors = [] as IActor[];
  lightboxIndex = null as number | null;

  labelSelectorDialog = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[];
  labelEditLoader = false;

  pluginLoader = false;
  attachUnmatchedScenesLoader = false;

  scenePage = 0;
  moreScenes = true;

  numMovies = -1;
  moviePage = 0;
  moreMovies = true;

  numActors = -1;
  actorPage = 0;
  moreActors = true;

  thumbnailDialog = false;
  thumbnailLoader = false;
  selectedThumbnail = null as File | null;

  labelSearchQuery = "";

  activeTab = 0;

  get actorPlural() {
    return contextModule.actorPlural;
  }

  uploadThumbnail() {
    if (!this.currentStudio) {
      return;
    }

    this.thumbnailLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation ($file: Upload!, $name: String, $studio: String, $lossless: Boolean) {
          uploadImage(file: $file, name: $name, studio: $studio, lossless: $lossless) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.selectedThumbnail,
        name: this.currentStudio.name + " (thumbnail)",
        studio: this.currentStudio._id,
        lossless: true,
      },
    })
      .then((res) => {
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

  get currentStudio() {
    return studioModule.current;
  }

  async fetchActorPage() {
    if (!this.currentStudio) {
      return;
    }

    const result = await ApolloClient.query({
      query: gql`
        query ($query: ActorSearchQuery!) {
          getActors(query: $query) {
            numItems
            items {
              ...ActorFragment
              thumbnail {
                _id
                color
              }
              labels {
                _id
                name
                color
              }
            }
          }
        }
        ${actorFragment}
      `,
      variables: {
        query: {
          page: this.actorPage,
          studios: [this.currentStudio._id],
          sortDir: "desc",
          sortBy: "addedOn",
        },
      },
    });

    this.numActors = result.data.getActors.numItems;
    return result.data.getActors.items;
  }

  async fetchMoviePage() {
    if (!this.currentStudio) {
      return;
    }

    const result = await ApolloClient.query({
      query: gql`
        query ($query: MovieSearchQuery!) {
          getMovies(query: $query) {
            numItems
            items {
              ...MovieFragment
              actors {
                ...ActorFragment
              }
              scenes {
                ...SceneFragment
              }
              studio {
                ...StudioFragment
              }
            }
          }
        }
        ${movieFragment}
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
      `,
      variables: {
        query: {
          page: this.moviePage,
          studios: [this.currentStudio._id],
          sortDir: "desc",
          sortBy: "addedOn",
        },
      },
    });

    this.numMovies = result.data.getMovies.numItems;
    return result.data.getMovies.items;
  }

  async fetchScenePage() {
    if (!this.currentStudio) {
      return;
    }

    const result = await ApolloClient.query({
      query: gql`
        query ($query: SceneSearchQuery!) {
          getScenes(query: $query) {
            items {
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
        }
        ${sceneFragment}
        ${actorFragment}
      `,
      variables: {
        query: {
          page: this.scenePage,
          studios: [this.currentStudio._id],
          sortDir: "desc",
          sortBy: "addedOn",
        },
      },
    });

    return result.data.getScenes.items;
  }

  runPlugins() {
    if (!this.currentStudio) {
      return;
    }

    this.pluginLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation ($id: String!) {
          runStudioPlugins(id: $id) {
            ...StudioFragment
            numScenes
            labels {
              _id
              name
              color
            }
            thumbnail {
              _id
            }
            parent {
              _id
              name
              labels {
                _id
                name
                color
              }
            }
            substudios {
              ...StudioFragment
              numScenes
              labels {
                _id
                name
                color
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${studioFragment}
      `,
      variables: {
        id: this.currentStudio._id,
      },
    })
      .then((res) => {
        studioModule.setCurrent(res.data.runStudioPlugins);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.pluginLoader = false;
      });
  }

  attachUnmatchedScenes() {
    if (!this.currentStudio) {
      return;
    }
    this.attachUnmatchedScenesLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation ($id: String!) {
          attachStudioToUnmatchedScenes(id: $id) {
            ...StudioFragment
            numScenes
            labels {
              _id
              name
              color
            }
            thumbnail {
              _id
            }
            parent {
              _id
              name
              labels {
                _id
                name
                color
              }
            }
            substudios {
              ...StudioFragment
              numScenes
              labels {
                _id
                name
                color
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${studioFragment}
      `,
      variables: {
        id: this.currentStudio._id,
      },
    })
      .then((res) => {
        studioModule.setCurrent(res.data.attachStudioToUnmatchedScenes);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.attachUnmatchedScenesLoader = false;
      });
  }

  loadActorPage() {
    this.fetchActorPage().then((items) => {
      if (items.length) {
        this.actorPage++;
        this.actors.push(...items);
      } else {
        this.moreActors = false;
      }
    });
  }

  loadMoviePage() {
    this.fetchMoviePage().then((items) => {
      if (items.length) {
        this.moviePage++;
        this.movies.push(...items);
      } else {
        this.moreMovies = false;
      }
    });
  }

  loadScenePage() {
    this.fetchScenePage().then((items) => {
      if (items.length) {
        this.scenePage++;
        this.scenes.push(...items);
      } else {
        this.moreScenes = false;
      }
    });
  }

  setAsThumbnail(id: string) {
    if (!this.currentStudio) {
      return;
    }

    ApolloClient.mutate({
      mutation: gql`
        mutation ($ids: [String!]!, $opts: StudioUpdateOpts!) {
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
          thumbnail: id,
        },
      },
    })
      .then((res) => {
        studioModule.setThumbnail(id);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  updateStudioLabels(labels: ILabel[]) {
    if (!this.currentStudio) {
      return Promise.reject();
    }

    return ApolloClient.mutate({
      mutation: gql`
        mutation ($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
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
        ids: [this.currentStudio._id],
        opts: {
          labels: labels.map((l) => l._id),
        },
      },
    })
      .then((res) => {
        studioModule.setLabels(res.data.updateStudios[0].labels);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  editLabels() {
    if (!this.currentStudio) {
      return;
    }

    this.labelEditLoader = true;
    return this.updateStudioLabels(this.selectedLabels.map((i) => this.allLabels[i]))
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
    if (!this.currentStudio) {
      return;
    }

    if (!this.allLabels.length) {
      this.loadLabels()
        .then(() => {
          if (!this.currentStudio) {
            return;
          }

          this.selectedLabels = this.currentStudio.labels.map((l) =>
            this.allLabels.findIndex((k) => k._id == l._id)
          );
          this.labelSelectorDialog = true;
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      this.labelSelectorDialog = true;
    }
  }

  get thumbnail() {
    if (this.currentStudio && this.currentStudio.thumbnail)
      return `/api/media/image/${this.currentStudio.thumbnail._id}?password=${localStorage.getItem(
        "password"
      )}`;
    return "/assets/broken.png";
  }

  @Watch("$route.params.id")
  onRouteChange() {
    studioModule.setCurrent(null);
    this.movies = [];
    this.scenes = [];
    this.selectedLabels = [];
    this.scenePage = 0;
    this.onLoad();
  }

  @Watch("activeTab")
  onTabChange(val: number) {
    if (val === 1 && !this.scenes.length) {
      this.loadScenePage();
    }
    if (val === 2 && !this.movies.length) {
      this.loadMoviePage();
    }
    if (val === 3 && !this.actors.length) {
      this.loadActorPage();
    }
  }

  onLoad() {
    ApolloClient.query({
      query: gql`
        query ($id: String!) {
          getStudioById(id: $id) {
            ...StudioFragment
            numScenes
            averageRating
            labels {
              _id
              name
              color
            }
            thumbnail {
              _id
            }
            parent {
              _id
              name
              labels {
                _id
                name
                color
              }
            }
            substudios {
              ...StudioFragment
              numScenes
              labels {
                _id
                name
                color
              }
              thumbnail {
                _id
              }
            }
          }
        }
        ${studioFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id,
      },
    }).then((res) => {
      studioModule.setCurrent(res.data.getStudioById);
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
