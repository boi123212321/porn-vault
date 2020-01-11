<template>
  <v-container fluid>
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

    <v-navigation-drawer style="z-index: 14" v-model="drawer" :permanent="$vuetify.breakpoint.mdAndUp" clipped app>
      <v-container>
        <v-text-field clearable color="accent" v-model="query" label="Search query"></v-text-field>

        <v-subheader>Labels</v-subheader>
        <v-chip-group
          active-class="accent--text"
          :items="allLabels"
          column
          v-model="selectedLabels"
          multiple
        >
          <div style="max-height:40vh; overflow-y:scroll">
            <v-chip label small v-for="label in allLabels" :key="label._id">{{ label.name }}</v-chip>
          </div>
        </v-chip-group>
        <v-select
          hide-details
          color="accent"
          item-text="text"
          item-value="value"
          v-model="sortBy"
          placeholder="Sort by..."
          :items="sortByItems"
        ></v-select>
        <v-select
          :disabled="sortBy == 'relevance'"
          hide-details
          color="accent"
          item-text="text"
          item-value="value"
          v-model="sortDir"
          placeholder="Sort direction"
          :items="sortDirItems"
        ></v-select>
        <v-checkbox hide-details v-model="favoritesOnly" label="Show favorites only"></v-checkbox>
        <v-checkbox hide-details v-model="bookmarksOnly" label="Show bookmarks only"></v-checkbox>

        <v-rating
          half-increments
          @input="ratingFilter = $event * 2"
          :value="ratingFilter / 2"
          class="pb-0 pa-2"
          background-color="grey"
          color="amber"
          dense
          hide-details
        ></v-rating>
        <div class="pl-3 mt-1 med--text caption hover" @click="ratingFilter = 0">Reset rating filter</div>
      </v-container>
    </v-navigation-drawer>

    <div v-if="!fetchLoader">
      <div class="d-flex align-center">
        <h1 class="font-weight-light mr-3">Scenes</h1>
        <!--  <v-btn class="mr-3" @click="openCreateDialog" icon>
          <v-icon>mdi-plus</v-icon>
        </v-btn>-->
        <v-btn @click="openUploadDialog" icon>
          <v-icon>mdi-upload</v-icon>
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
          <scene-card v-model="scenes[i]" style="height: 100%">
            <template v-slot:action>
              <v-checkbox
                color="accent"
                :input-value="selectedScenes.includes(scene._id)"
                @change="selectScene(scene._id)"
                @click.native.stop.prevent
                class="mt-0"
                hide-details
                :contain="true"
              ></v-checkbox>
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
              color="accent"
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
              color="accent"
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
            color="accent"
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
          <v-btn @click="labelSelectorDialog = false" text color="accent" class="text-none">OK</v-btn>
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

@Component({
  components: {
    SceneCard,
    LabelSelector,
    InfiniteLoading,
    ActorSelector,
    SceneUploader
  }
})
export default class SceneList extends Vue {
  scenes = [] as IScene[];
  fetchLoader = false;

  waiting = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[]; // TODO: try to retrieve from localStorage

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

  get drawer() {
    return contextModule.showFilters;
  }

  set drawer(val: boolean) {
    contextModule.toggleFilters(val);
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

  async fetchPage() {
    try {
      let include = "";

      if (this.selectedLabels.length)
        include =
          "include:" +
          this.selectedLabels.map(i => this.allLabels[i]._id).join(",");

      const query = `query:'${this.query || ""}' ${include} page:${
        this.page
      } sortDir:${this.sortDir} sortBy:${this.sortBy} favorite:${
        this.favoritesOnly ? "true" : "false"
      } bookmark:${this.bookmarksOnly ? "true" : "false"} rating:${
        this.ratingFilter
      }`;

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
    document.title = "Scenes";
  }
}
</script>