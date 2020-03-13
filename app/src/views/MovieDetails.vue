<template>
  <v-container fluid>
    <div v-if="currentMovie">
      <BindTitle :value="currentMovie.name" />
      <v-row>
        <v-col cols="12" sm="6" md="4" lg="3" xl="2">
          <v-container>
            <div class="d-flex pa-2">
              <v-img contain style="max-height: 400px" v-if="spineCover" :src="spineCover"></v-img>
              <v-hover style="width: 100%">
                <template v-slot:default="{ hover }">
                  <v-img style="max-height: 400px" contain :aspect-ratio="0.71" :src="frontCover">
                    <v-fade-transition>
                      <v-img
                        eager
                        style="max-height: 400px"
                        contain
                        :aspect-ratio="0.71"
                        :src="backCover"
                        v-if="hover"
                      ></v-img>
                    </v-fade-transition>

                    <template v-slot:placeholder>
                      <v-sheet style="width: 100%; height: 100%;" color="grey" />
                    </template>

                    <v-btn
                      @click="show3d = true"
                      style="background: #000000aa; position: absolute; top: 5px; left: 5px;"
                      icon
                    >
                      <v-icon>mdi-eye</v-icon>
                    </v-btn>
                  </v-img>
                </template>
              </v-hover>
            </div>

            <div class="mt-2 text-center">
              <v-btn color="primary" text small @click="frontCoverDialog = true">Set front cover</v-btn>
              <v-btn color="primary" text small @click="backCoverDialog = true">Set back cover</v-btn>
              <v-btn color="primary" text small @click="spineCoverDialog = true">Set spine cover</v-btn>
            </div>
          </v-container>
        </v-col>
        <v-col cols="12" sm="6" md="8" lg="9" xl="10">
          <div class="d-flex" v-if="currentMovie.studio">
            <v-spacer></v-spacer>
            <router-link :to="`/studio/${currentMovie.studio._id}`">
              <v-img contain v-ripple max-width="150px" :src="studioLogo"></v-img>
            </router-link>
          </div>
          <div v-if="currentMovie.releaseDate">
            <div class="d-flex align-center">
              <v-icon>mdi-calendar</v-icon>
              <v-subheader>Release Date</v-subheader>
            </div>
            <div class="med--text pa-2">{{ new Date(currentMovie.releaseDate).toDateString() }}</div>
          </div>

          <div v-if="currentMovie.description">
            <div class="d-flex align-center">
              <v-icon>mdi-text</v-icon>
              <v-subheader>Description</v-subheader>
            </div>
            <div
              class="pa-2 med--text"
              v-if="currentMovie.description"
            >{{ currentMovie.description }}</div>
          </div>

          <div class="d-flex align-center">
            <v-icon>mdi-star</v-icon>
            <v-subheader>Rating</v-subheader>
          </div>
          <Rating class="px-2" :value="currentMovie.rating" :readonly="true" />
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
          </div>
          <div class="d-flex align-center">
            <v-icon>mdi-information-outline</v-icon>
            <v-subheader>Info</v-subheader>
          </div>
          <div v-if="scenes.length" class="px-2 pt-2 d-flex align-center">
            <v-subheader>Movie duration</v-subheader>
            {{ movieDuration }}
          </div>
          <div v-if="scenes.length" class="px-2 d-flex align-center">
            <v-subheader>Movie size</v-subheader>
            {{ (currentMovie.size /1000/ 1000).toFixed(0) }} MB
          </div>
          <!-- <div class="px-2 pb-2 d-flex align-center">
            <v-subheader>View counter</v-subheader>
            {{ currentMovie.watches.length }}
          </div>
          <div v-if="currentMovie.watches.length" class="px-2 pb-2 d-flex align-center">
            <v-subheader>Last time watched</v-subheader>
            {{ new Date(currentMovie.watches[currentMovie.watches.length - 1]).toLocaleString() }}
          </div>-->
        </v-col>
      </v-row>

      <v-row v-if="scenes.length">
        <v-col cols="12">
          <h1 class="font-weight-light text-center">Scenes</h1>
          <div v-for="(scene, i) in scenes" :key="scene._id" class="mb-2">
            <movie-item :index="i + 1" v-model="scenes[i]"></movie-item>
            <v-divider></v-divider>
          </div>
        </v-col>
      </v-row>

      <v-row v-if="actors.length">
        <v-col cols="12">
          <h1 class="font-weight-light text-center">Starring</h1>

          <v-row>
            <v-col
              class="pa-1"
              v-for="(actor, i) in actors"
              :key="actor._id"
              cols="12"
              sm="6"
              md="4"
              lg="2"
              xl="2"
            >
              <actor-card style="height: 100%" v-model="actors[i]" />
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <div v-if="images.length">
        <div class="d-flex align-center">
          <v-spacer></v-spacer>
          <h1 class="font-weight-light mr-3">{{ images.length }} Images</h1>
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
              <ImageCard @open="lightboxIndex = index" width="100%" height="100%" :image="image"></ImageCard>
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

    <v-dialog v-model="frontCoverDialog" max-width="400px">
      <v-card v-if="currentMovie">
        <v-card-title>Set front cover for '{{ currentMovie.name }}'</v-card-title>
        <v-card-text>
          <v-file-input color="primary" placeholder="Select an image" v-model="frontCoverFile"></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadFrontCover" text class="text-none" color="primary">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="backCoverDialog" max-width="400px">
      <v-card v-if="currentMovie">
        <v-card-title>Set back cover for '{{ currentMovie.name }}'</v-card-title>
        <v-card-text>
          <v-file-input color="primary" placeholder="Select an image" v-model="backCoverFile"></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadBackCover" text class="text-none" color="primary">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="spineCoverDialog" max-width="400px">
      <v-card v-if="currentMovie">
        <v-card-title>Set spine cover for '{{ currentMovie.name }}'</v-card-title>
        <v-card-text>
          <v-file-input color="primary" placeholder="Select an image" v-model="spineCoverFile"></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="uploadSpineCover" text class="text-none" color="primary">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <infinite-loading
      v-if="scenes.length && currentMovie"
      :identifier="infiniteId"
      @infinite="infiniteHandler"
    >
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

    <DVDRenderer v-if="currentMovie" v-model="show3d" :movie="currentMovie._id" />
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import sceneFragment from "../fragments/scene";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import studioFragment from "../fragments/studio";
import MovieItem from "../components/MovieItem.vue";
import ActorCard from "../components/ActorCard.vue";
import moment from "moment";
import SceneSelector from "../components/SceneSelector.vue";
import Lightbox from "../components/Lightbox.vue";
import ImageCard from "../components/ImageCard.vue";
import InfiniteLoading from "vue-infinite-loading";
import { sceneModule } from "../store/scene";
import { actorModule } from "../store/actor";
import IActor from "../types/actor";
import IImage from "../types/image";
import ILabel from "../types/label";
import IScene from "../types/scene";
import { movieModule } from "../store/movie";
import movieFragment from "../fragments/movie";
import DVDRenderer from "@/components/DVDRenderer.vue";

@Component({
  components: {
    ActorCard,
    Lightbox,
    ImageCard,
    InfiniteLoading,
    MovieItem,
    DVDRenderer
  },
  beforeRouteLeave(_to, _from, next) {
    movieModule.setCurrent(null);
    next();
  }
})
export default class MovieDetails extends Vue {
  actors = [] as IActor[];
  scenes = [] as IScene[];
  images = [] as IImage[];
  lightboxIndex = null as number | null;

  infiniteId = 0;
  page = 0;
  show3d = false;

  frontCoverFile = null as File | null;
  frontCoverDialog = false;

  backCoverFile = null as File | null;
  backCoverDialog = false;

  spineCoverFile = null as File | null;
  spineCoverDialog = false;

  @Watch("currentMovie.actors", { deep: true })
  onActorChange(newVal: any[]) {
    this.actors = newVal;
  }

  @Watch("currentMovie.scenes", { deep: true })
  onSceneChange(newVal: any[]) {
    this.scenes = newVal;
    this.images = [];
    this.infiniteId++;
    this.refreshRating();
    this.refreshLabels();
  }

  uploadFrontCover() {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($file: Upload!, $name: String) {
          uploadImage(file: $file, name: $name) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.frontCoverFile,
        name: this.currentMovie.name + " (front cover)"
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsFrontCover(image._id);
        this.frontCoverDialog = false;
        this.frontCoverFile = null;
      })
      .finally(() => {});
  }

  uploadBackCover() {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($file: Upload!, $name: String) {
          uploadImage(file: $file, name: $name) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.backCoverFile,
        name: this.currentMovie.name + " (back cover)"
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsBackCover(image._id);
        this.backCoverDialog = false;
        this.backCoverFile = null;
      })
      .finally(() => {});
  }

  uploadSpineCover() {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($file: Upload!, $name: String) {
          uploadImage(file: $file, name: $name) {
            ...ImageFragment
          }
        }
        ${imageFragment}
      `,
      variables: {
        file: this.spineCoverFile,
        name: this.currentMovie.name + " (spine cover)"
      }
    })
      .then(res => {
        const image = res.data.uploadImage;
        this.images.unshift(image);
        this.setAsSpineCover(image._id);
        this.spineCoverDialog = false;
        this.spineCoverFile = null;
      })
      .finally(() => {});
  }

  setAsFrontCover(id: string) {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
            frontCover {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          frontCover: id
        }
      }
    })
      .then(res => {
        movieModule.setFrontCover(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  setAsBackCover(id: string) {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
            backCover {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          backCover: id
        }
      }
    })
      .then(res => {
        movieModule.setBackCover(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  setAsSpineCover(id: string) {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
            spineCover {
              _id
            }
          }
        }
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          spineCover: id
        }
      }
    })
      .then(res => {
        movieModule.setSpineCover(id);
      })
      .catch(err => {
        console.error(err);
      });
  }

  get frontCover() {
    if (!this.currentMovie) return "";

    if (this.currentMovie.frontCover)
      return `${serverBase}/image/${
        this.currentMovie.frontCover._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  get backCover() {
    if (!this.currentMovie) return "";

    if (this.currentMovie.backCover)
      return `${serverBase}/image/${
        this.currentMovie.backCover._id
      }?password=${localStorage.getItem("password")}`;
    return this.frontCover;
  }

  get spineCover() {
    if (!this.currentMovie) return "";

    if (this.currentMovie.spineCover)
      return `${serverBase}/image/${
        this.currentMovie.spineCover._id
      }?password=${localStorage.getItem("password")}`;
    return null;
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

  get currentMovie() {
    return movieModule.current;
  }

  get movieDuration() {
    if (this.currentMovie && this.currentMovie.duration)
      return moment()
        .startOf("day")
        .seconds(this.currentMovie.duration)
        .format("H:mm:ss");
    return "";
  }

  async fetchPage() {
    if (!this.currentMovie) return [];

    try {
      const query = `page:${
        this.page
      } sortDir:asc sortBy:addedOn scenes:${this.scenes
        .map(s => s._id)
        .join(",")}`;

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

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }

  refreshLabels() {
    if (!this.currentMovie) return;

    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getMovieById(id: $id) {
            labels {
              _id
              name
            }
          }
        }
      `,
      variables: {
        id: this.currentMovie._id
      }
    }).then(res => {
      movieModule.setLabels(res.data.getMovieById.labels);
    });
  }

  refreshRating() {
    if (!this.currentMovie) return;

    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getMovieById(id: $id) {
            rating
          }
        }
      `,
      variables: {
        id: this.currentMovie._id
      }
    }).then(res => {
      movieModule.setRating(res.data.getMovieById.rating);
    });
  }

  get labelNames() {
    if (!this.currentMovie) return [];
    return this.currentMovie.labels.map(l => l.name).sort();
  }

  get studioLogo() {
    if (
      this.currentMovie &&
      this.currentMovie.studio &&
      this.currentMovie.studio.thumbnail
    )
      return `${serverBase}/image/${
        this.currentMovie.studio.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  onLoad() {
    ApolloClient.query({
      query: gql`
        query($id: String!) {
          getMovieById(id: $id) {
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
        }
        ${movieFragment}
        ${sceneFragment}
        ${actorFragment}
        ${studioFragment}
      `,
      variables: {
        id: (<any>this).$route.params.id
      }
    }).then(res => {
      movieModule.setCurrent(res.data.getMovieById);
      this.scenes = res.data.getMovieById.scenes;
      this.actors = res.data.getMovieById.actors;
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
