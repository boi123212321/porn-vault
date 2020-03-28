<template>
  <v-container fluid>
    <BindTitle value="Scenes" />
    <v-banner app sticky v-if="selectedScenes.length">
      {{ selectedScenes.length }} scenes selected
      <template v-slot:actions>
        <v-btn text @click="selectedScenes = []" class="text-none">Deselect</v-btn>
        <v-btn
          @click="deleteSelectedScenesDialog = true"
          text
          class="text-none"
          color="error"
        >Delete</v-btn>
      </template>
    </v-banner>

    <v-navigation-drawer style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-text-field clearable color="primary" v-model="query" label="Search query"></v-text-field>

        <v-subheader>
          Labels
          <span style="white-space: pre" class="hover" @click="resetLabels">{{ " (reset)" }}</span>
        </v-subheader>
        <div style="max-height: 30vh; overflow-y: scroll">
          <div
            @click="onLabelClick(label)"
            :class="labelClasses(label)"
            class="hover mb-1"
            v-for="label in allLabels"
            :key="label._id"
          >{{ label.name }}</div>
        </div>

        <v-subheader>Filter by actor(s)</v-subheader>
        <ActorSelector v-model="selectedActors" :multiple="true" />
        <v-subheader>Filter by duration</v-subheader>
        <v-range-slider hide-details :max="durationMax" v-model="durationRange" color="primary"></v-range-slider>
        <div class="med--text text-center">{{ durationRange[0] }} min - {{ durationRange[1] }} min</div>

        <v-checkbox hide-details v-model="favoritesOnly" label="Show favorites only"></v-checkbox>
        <v-checkbox hide-details v-model="bookmarksOnly" label="Show bookmarks only"></v-checkbox>

        <Rating @input="ratingFilter = $event" :value="ratingFilter" class="pb-0 pa-2" />

        <v-select
          hide-details
          color="primary"
          item-text="text"
          item-value="value"
          v-model="sortBy"
          placeholder="Sort by..."
          :items="sortByItems"
        ></v-select>
        <v-select
          :disabled="sortBy == 'relevance'"
          hide-details
          color="primary"
          item-text="text"
          item-value="value"
          v-model="sortDir"
          placeholder="Sort direction"
          :items="sortDirItems"
        ></v-select>
      </v-container>
    </v-navigation-drawer>

    <div v-if="!fetchLoader">
      <div class="d-flex align-center">
        <h1 class="font-weight-light mr-3">Scenes</h1>
        <!--  <v-btn class="mr-3" @click="openCreateDialog" icon>
          <v-icon>mdi-plus</v-icon>
        </v-btn>-->
        <!-- <v-btn class="mr-3" @click="openUploadDialog" icon>
          <v-icon>mdi-upload</v-icon>
        </v-btn>-->
        <v-btn :loading="fetchingRandom" @click="getRandom" icon>
          <v-icon>mdi-shuffle-variant</v-icon>
        </v-btn>
      </div>
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
          <scene-card
            :class="selectedScenes.length && !selectedScenes.includes(scene._id) ? 'not-selected' : ''"
            :showLabels="showCardLabels"
            v-model="scenes[i]"
            style="height: 100%"
          >
            <template v-slot:action="{ hover }">
              <v-fade-transition>
                <v-checkbox
                  v-if="hover || selectedScenes.includes(scene._id)"
                  color="primary"
                  :input-value="selectedScenes.includes(scene._id)"
                  @change="selectScene(scene._id)"
                  @click.native.stop.prevent
                  class="mt-0"
                  hide-details
                  :contain="true"
                ></v-checkbox>
              </v-fade-transition>
            </template>
          </scene-card>
        </v-col>
      </v-row>
    </div>
    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <v-dialog scrollable v-model="createSceneDialog" max-width="400px">
      <v-card :loading="addSceneLoader">
        <v-card-title>Add new scene</v-card-title>
        <v-card-text style="max-height: 90vh">
          <v-form v-model="validCreation">
            <v-text-field
              :rules="sceneNameRules"
              color="primary"
              v-model="createSceneName"
              placeholder="Name"
            />

            <ActorSelector class="mb-2" v-model="createSceneActors" />

            <v-chip
              label
              @click:close="createSelectedLabels.splice(i, 1)"
              class="mr-1 mb-1"
              close
              small
              outlined
              v-for="(name, i) in labelNames(createSelectedLabels)"
              :key="name"
            >{{ name }}</v-chip>
            <v-chip
              label
              :class="`mr-1 mb-1 ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
              @click="openLabelSelectorDialog"
              color="primary"
              dark
              small
            >+ Select labels</v-chip>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            class="text-none"
            :disabled="!validCreation"
            color="primary"
            @click="addScene"
          >Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card>
        <v-card-title>Select labels for '{{ createSceneName }}'</v-card-title>

        <v-card-text style="max-height: 400px">
          <LabelSelector :items="allLabels" v-model="createSelectedLabels" />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="labelSelectorDialog = false" text color="primary" class="text-none">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :persistent="isUploadingScene" v-model="uploadDialog" max-width="400px">
      <SceneUploader @update-state="isUploadingScene = $event" @uploaded="scenes.unshift($event)" />
    </v-dialog>

    <v-dialog v-model="deleteSelectedScenesDialog" max-width="400px">
      <v-card>
        <v-card-title>Really delete {{ selectedScenes.length }} scenes?</v-card-title>
        <v-card-text></v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn class="text-none" color="error" text @click="deleteSelection">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <infinite-loading :identifier="infiniteId" @infinite="infiniteHandler">
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
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import SceneCard from "../components/SceneCard.vue";
import sceneFragment from "../fragments/scene";
import actorFragment from "../fragments/actor";
import studioFragment from "../fragments/studio";
import LabelSelector from "../components/LabelSelector.vue";
import { contextModule } from "../store/context";
import InfiniteLoading from "vue-infinite-loading";
import ActorSelector from "../components/ActorSelector.vue";
import SceneUploader from "../components/SceneUploader.vue";
import IScene from "../types/scene";
import IActor from "../types/actor";
import ILabel from "../types/label";
import moment from "moment";
import DrawerMixin from "../mixins/drawer";
import { mixins } from "vue-class-component";

@Component({
  components: {
    SceneCard,
    LabelSelector,
    InfiniteLoading,
    ActorSelector,
    SceneUploader
  }
})
export default class SceneList extends mixins(DrawerMixin) {
  scenes = [] as IScene[];
  fetchLoader = false;
  fetchingRandom = false;

  selectedActors = (() => {
    const fromLocalStorage = localStorage.getItem("pm_sceneActors");
    if (fromLocalStorage) return JSON.parse(fromLocalStorage);
    return [];
  })() as IActor[];

  get selectedActorIds() {
    return this.selectedActors.map(ac => ac._id);
  }

  waiting = false;
  allLabels = [] as ILabel[];
  include = (localStorage.getItem("pm_sceneInclude") || "")
    .split(",")
    .filter(Boolean) as string[];
  exclude = (localStorage.getItem("pm_sceneExclude") || "")
    .split(",")
    .filter(Boolean) as string[];

  validCreation = false;
  createSceneDialog = false;
  createSceneName = "";
  createSceneActors = [] as IActor[];
  createSelectedLabels = [] as number[];
  labelSelectorDialog = false;
  addSceneLoader = false;

  sceneNameRules = [v => (!!v && !!v.length) || "Invalid scene name"];

  query = localStorage.getItem("pm_sceneQuery") || "";
  page = 0;

  durationMax =
    parseInt(localStorage.getItem("pm_durationFilterMax") || "180") || 180;
  durationRange = [
    parseInt(localStorage.getItem("pm_durationMin") || "0") || 0,
    parseInt(
      localStorage.getItem("pm_durationMax") || this.durationMax.toString()
    ) || this.durationMax
  ];

  sortDir = localStorage.getItem("pm_sceneSortDir") || "desc";
  sortDirItems = [
    {
      text: "Ascending",
      value: "asc"
    },
    {
      text: "Descending",
      value: "desc"
    }
  ];

  sortBy = localStorage.getItem("pm_sceneSortBy") || "relevance";
  sortByItems = [
    {
      text: "Relevance",
      value: "relevance"
    },
    {
      text: "A-Z",
      value: "alpha"
    },
    {
      text: "Added to collection",
      value: "addedOn"
    },
    {
      text: "Rating",
      value: "rating"
    },
    {
      text: "Views",
      value: "views"
    },
    {
      text: "Duration",
      value: "duration"
    },
    {
      text: "Resolution",
      value: "resolution"
    },
    {
      text: "Size",
      value: "size"
    },
    {
      text: "Release date",
      value: "date"
    },
    {
      text: "Bookmarked",
      value: "bookmark"
    }
  ];

  favoritesOnly = localStorage.getItem("pm_sceneFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_sceneBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_sceneRating") || "0");

  infiniteId = 0;
  resetTimeout = null as NodeJS.Timeout | null;

  uploadDialog = false;
  isUploadingScene = false;

  selectedScenes = [] as string[];
  deleteSelectedScenesDialog = false;

  resetLabels() {
    this.include = [];
    this.exclude = [];

    this.page = 0;
    this.scenes = [];
    this.infiniteId++;

    localStorage.removeItem("pm_sceneInclude");
    localStorage.removeItem("pm_sceneExclude");
  }

  onLabelClick(label: ILabel) {
    if (this.exclude.includes(label._id))
      this.exclude = this.exclude.filter(i => i !== label._id);
    else if (this.include.includes(label._id)) {
      this.exclude.push(label._id);
      this.include = this.include.filter(i => i !== label._id);
    } else {
      this.include.push(label._id);
    }

    localStorage.setItem("pm_sceneInclude", this.include.join(","));
    localStorage.setItem("pm_sceneExclude", this.exclude.join(","));

    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  labelClasses(label: ILabel) {
    if (this.include.includes(label._id))
      return "font-weight-bold primary--text";
    else if (this.exclude.includes(label._id))
      return "font-weight-bold error--text";
    return "";
  }

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  selectScene(id: string) {
    if (this.selectedScenes.includes(id))
      this.selectedScenes = this.selectedScenes.filter(i => i != id);
    else this.selectedScenes.push(id);
  }

  deleteSelection() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeScenes(ids: $ids)
        }
      `,
      variables: {
        ids: this.selectedScenes
      }
    })
      .then(res => {
        for (const id of this.selectedScenes) {
          this.scenes = this.scenes.filter(scene => scene._id != id);
        }
        this.selectedScenes = [];
        this.deleteSelectedScenesDialog = false;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {});
  }

  openUploadDialog() {
    this.uploadDialog = true;
  }

  labelIDs(indices: number[]) {
    return indices.map(i => this.allLabels[i]).map(l => l._id);
  }

  labelNames(indices: number[]) {
    return indices.map(i => this.allLabels[i].name);
  }

  openLabelSelectorDialog() {
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
          this.allLabels = res.data.getLabels;
          this.labelSelectorDialog = true;
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      this.labelSelectorDialog = true;
    }
  }

  addScene() {
    this.addSceneLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($name: String!, $labels: [String!], $actors: [String!]) {
          addScene(name: $name, labels: $labels, actors: $actors) {
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
        name: this.createSceneName,
        actors: this.createSceneActors.map(a => a._id),
        labels: this.labelIDs(this.createSelectedLabels)
      }
    })
      .then(res => {
        this.scenes.unshift(res.data.addScene);
        this.createSceneDialog = false;
        this.createSceneName = "";
        this.createSceneActors = [];
        this.createSelectedLabels = [];
      })
      .catch(() => {})
      .finally(() => {
        this.addSceneLoader = false;
      });
  }

  openCreateDialog() {
    this.createSceneDialog = true;
  }

  sceneLabels(scene: any) {
    return scene.labels.map(l => l.name).sort();
  }

  sceneActorNames(scene: any) {
    return scene.actors.map(a => a.name).join(", ");
  }

  sceneThumbnail(scene: any) {
    if (scene.thumbnail)
      return `${serverBase}/image/${
        scene.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    localStorage.setItem("pm_sceneRating", newVal.toString());
    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_sceneFavorite", "" + newVal);
    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_sceneBookmark", "" + newVal);
    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_sceneSortDir", newVal);
    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_sceneSortBy", newVal);
    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  @Watch("selectedLabels")
  onLabelChange() {
    this.page = 0;
    this.scenes = [];
    this.infiniteId++;
  }

  @Watch("selectedActorIds", { deep: true })
  onSelectedActorsChange(newVal: string[]) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_sceneActors", JSON.stringify(this.selectedActors));

    this.waiting = true;
    this.page = 0;
    this.scenes = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  @Watch("durationRange")
  onDurationRangeChange(newVal: number) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem(
      "pm_durationMin",
      (this.durationRange[0] || "").toString()
    );
    localStorage.setItem(
      "pm_durationMax",
      (this.durationRange[1] || "").toString()
    );

    this.waiting = true;
    this.page = 0;
    this.scenes = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_sceneQuery", newVal || "");

    this.waiting = true;
    this.page = 0;
    this.scenes = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  infiniteHandler($state) {
    this.fetchPage()
      .then(items => {
        if (items.length) {
          this.page++;
          this.scenes.push(...items);
          $state.loaded();
        } else {
          $state.complete();
        }
      })
      .catch(err => {
        $state.error();
      });
  }

  getRandom() {
    this.fetchingRandom = true;
    this.fetchPage(1)
      .then(scenes => {
        // @ts-ignore
        this.$router.push(`/scene/${scenes[0]._id}`);
      })
      .catch(err => {
        this.fetchingRandom = false;
      });
  }

  async fetchPage(random = 0) {
    try {
      let include = "";
      let exclude = "";
      let actors = "";

      if (this.include.length) include = "include:" + this.include.join(",");

      if (this.exclude.length) exclude = "exclude:" + this.exclude.join(",");

      if (this.selectedActorIds.length)
        actors = "actors:" + this.selectedActorIds.join(",");

      const query = `query:'${this.query ||
        ""}' ${actors} ${include} ${exclude} page:${this.page} sortDir:${
        this.sortDir
      } sortBy:${this.sortBy} favorite:${
        this.favoritesOnly ? "true" : "false"
      } bookmark:${this.bookmarksOnly ? "true" : "false"} rating:${
        this.ratingFilter
      } duration.min:${this.durationRange[0] * 60} duration.max:${this
        .durationRange[1] * 60}`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String, $random: Int) {
            getScenes(query: $query, random: $random) {
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
          query,
          random
        }
      });

      return result.data.getScenes;
    } catch (err) {
      throw err;
    }
  }

  beforeMount() {
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
        this.allLabels = res.data.getLabels;
      })
      .catch(err => {
        console.error(err);
      });
  }
}
</script>

<style lang="scss">
.not-selected {
  transition: all 0.15s ease-in-out;
  filter: brightness(0.6);
}
</style>