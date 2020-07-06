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

    <v-navigation-drawer v-if="showSidenav" style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-text-field
          solo
          flat
          class="mb-2"
          hide-details
          clearable
          color="primary"
          v-model="query"
          label="Search query"
          single-line
        ></v-text-field>

        <div class="d-flex align-center">
          <v-btn
            :color="favoritesOnly ? 'red' : undefined"
            icon
            @click="favoritesOnly = !favoritesOnly"
          >
            <v-icon>{{ favoritesOnly ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
          </v-btn>

          <v-btn
            :color="bookmarksOnly ? 'primary' : undefined"
            icon
            @click="bookmarksOnly = !bookmarksOnly"
          >
            <v-icon>{{ bookmarksOnly ? 'mdi-bookmark' : 'mdi-bookmark-outline' }}</v-icon>
          </v-btn>

          <v-spacer></v-spacer>

          <Rating @input="ratingFilter = $event" :value="ratingFilter" />
        </div>

        <Divider icon="mdi-label">Labels</Divider>

        <LabelFilter
          @change="onSelectedLabelsChange"
          class="mt-0"
          v-model="selectedLabels"
          :items="allLabels"
        />

        <Divider icon="mdi-account">Actors</Divider>

        <ActorSelector v-model="selectedActors" :multiple="true" />

        <Divider icon="mdi-clock">Duration</Divider>

        <v-range-slider hide-details :max="durationMax" v-model="durationRange" color="primary"></v-range-slider>
        <div class="body-1 med--text text-center">
          <span class="font-weight-bold">{{ durationRange[0] }}</span>
          min -
          <span class="font-weight-bold">{{ durationRange[1] }}</span> min
        </div>

        <Divider icon="mdi-sort">Sort</Divider>

        <v-select
          solo
          flat
          single-line
          hide-details
          color="primary"
          item-text="text"
          item-value="value"
          v-model="sortBy"
          placeholder="Sort by..."
          :items="sortByItems"
          class="mt-0 pt-0 mb-2"
        ></v-select>
        <v-select
          solo
          flat
          single-line
          :disabled="sortBy == 'relevance' || sortBy == '$shuffle'"
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

    <div class="text-center" v-if="fetchError">
      <div>There was an error</div>
      <v-btn class="mt-2" @click="loadPage(page)">Try again</v-btn>
    </div>
    <div v-else>
      <div class="mb-2 d-flex align-center">
        <div class="mr-3">
          <span class="display-1 font-weight-bold mr-2">{{ fetchLoader ? "-" : numResults }}</span>
          <span class="title font-weight-regular">scenes found</span>
        </div>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :loading="fetchingRandom" @click="getRandom" icon>
              <v-icon>mdi-shuffle-variant</v-icon>
            </v-btn>
          </template>
          <span>Get random scene</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :disabled="sortBy != '$shuffle'" @click="rerollSeed" icon>
              <v-icon>mdi-dice-3-outline</v-icon>
            </v-btn>
          </template>
          <span>Reshuffle</span>
        </v-tooltip>
      </div>
      <v-row v-if="!fetchLoader && numResults">
        <v-col
          v-for="(scene, i) in scenes"
          :key="scene._id"
          class="pa-1"
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
      <NoResults v-else-if="!fetchLoader && !numResults" />
      <Loading v-else />
    </div>
    <div class="mt-3" v-if="numResults && numPages > 1">
      <v-pagination
        @input="loadPage"
        v-model="page"
        :total-visible="7"
        :disabled="fetchLoader"
        :length="numPages"
      ></v-pagination>
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

    <!-- <v-dialog :persistent="isUploadingScene" v-model="uploadDialog" max-width="400px">
      <SceneUploader @update-state="isUploadingScene = $event" @uploaded="scenes.unshift($event)" />
    </v-dialog>-->

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
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "@/apollo";
import gql from "graphql-tag";
import SceneCard from "@/components/SceneCard.vue";
import sceneFragment from "@/fragments/scene";
import actorFragment from "@/fragments/actor";
import studioFragment from "@/fragments/studio";
import LabelSelector from "@/components/LabelSelector.vue";
import { contextModule } from "@/store/context";
import InfiniteLoading from "vue-infinite-loading";
import ActorSelector from "@/components/ActorSelector.vue";
import SceneUploader from "@/components/SceneUploader.vue";
import IScene from "@/types/scene";
import IActor from "@/types/actor";
import ILabel from "@/types/label";
import moment from "moment";
import DrawerMixin from "@/mixins/drawer";
import { mixins } from "vue-class-component";
import { sceneModule } from "@/store/scene";

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
  get showSidenav() {
    return contextModule.showSidenav;
  }

  scenes = [] as IScene[];

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.sortBy === "$shuffle") this.loadPage(this.page);
    return seed;
  }

  fetchLoader = false;
  fetchError = false;
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

  tryReadLabelsFromLocalStorage(key: string) {
    return (localStorage.getItem(key) || "")
      .split(",")
      .filter(Boolean) as string[];
  }

  selectedLabels = {
    include: this.tryReadLabelsFromLocalStorage("pm_sceneInclude"),
    exclude: this.tryReadLabelsFromLocalStorage("pm_sceneExclude")
  };

  onSelectedLabelsChange(val: any) {
    localStorage.setItem("pm_sceneInclude", val.include.join(","));
    localStorage.setItem("pm_sceneExclude", val.exclude.join(","));

    sceneModule.resetPagination();
  }

  validCreation = false;
  createSceneDialog = false;
  createSceneName = "";
  createSceneActors = [] as IActor[];
  createSelectedLabels = [] as number[];
  labelSelectorDialog = false;
  addSceneLoader = false;

  sceneNameRules = [v => (!!v && !!v.length) || "Invalid scene name"];

  query = localStorage.getItem("pm_sceneQuery") || "";

  set page(page: number) {
    sceneModule.setPage(page);
  }

  get page() {
    return sceneModule.page;
  }

  get numResults() {
    return sceneModule.numResults;
  }

  get numPages() {
    return sceneModule.numPages;
  }

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
      value: "name"
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
      value: "numViews"
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
      value: "releaseDate"
    },
    {
      text: "Bookmarked",
      value: "bookmark"
    },
    {
      text: "Random",
      value: "$shuffle"
    }
  ];

  favoritesOnly = localStorage.getItem("pm_sceneFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_sceneBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_sceneRating") || "0");

  resetTimeout = null as NodeJS.Timeout | null;

  uploadDialog = false;
  isUploadingScene = false;

  selectedScenes = [] as string[];
  deleteSelectedScenesDialog = false;

  labelClasses(label: ILabel) {
    if (this.selectedLabels.include.includes(label._id))
      return "font-weight-bold primary--text";
    else if (this.selectedLabels.exclude.includes(label._id))
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
        this.refreshPage();
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
    sceneModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_sceneFavorite", "" + newVal);
    sceneModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_sceneBookmark", "" + newVal);
    sceneModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_sceneSortDir", newVal);
    sceneModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_sceneSortBy", newVal);
    sceneModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("selectedLabels")
  onLabelChange() {
    sceneModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("selectedActorIds", { deep: true })
  onSelectedActorsChange(newVal: string[]) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_sceneActors", JSON.stringify(this.selectedActors));

    this.waiting = true;
    sceneModule.resetPagination();

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.loadPage(this.page);
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
    sceneModule.resetPagination();

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.loadPage(this.page);
    }, 500);
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_sceneQuery", newVal || "");

    this.waiting = true;
    sceneModule.resetPagination();

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.loadPage(this.page);
    }, 500);
  }

  getRandom() {
    this.fetchingRandom = true;
    this.fetchPage(1, 1, true, Math.random().toString())
      .then(result => {
        // @ts-ignore
        this.$router.push(`/scene/${result.items[0]._id}`);
      })
      .catch(err => {
        this.fetchingRandom = false;
      });
  }

  async fetchPage(page: number, take = 24, random?: boolean, seed?: string) {
    try {
      let include = "";
      let exclude = "";
      let actors = "";

      if (this.selectedLabels.include.length)
        include = "include:" + this.selectedLabels.include.join(",");

      if (this.selectedLabels.exclude.length)
        exclude = "exclude:" + this.selectedLabels.exclude.join(",");

      if (this.selectedActorIds.length)
        actors = "actors:" + this.selectedActorIds.join(",");

      const query = `query:'${this.query ||
        ""}' take:${take} ${actors} ${include} ${exclude} page:${page -
        1} sortDir:${this.sortDir} sortBy:${
        random ? "$shuffle" : this.sortBy
      }  favorite:${this.favoritesOnly ? "true" : "false"} bookmark:${
        this.bookmarksOnly ? "true" : "false"
      } rating:${this.ratingFilter} duration.min:${this.durationRange[0] *
        60} duration.max:${this.durationRange[1] * 60}`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String, $seed: String) {
            getScenes(query: $query, seed: $seed) {
              items {
                ...SceneFragment
                actors {
                  ...ActorFragment
                }
                studio {
                  ...StudioFragment
                }
              }
              numItems
              numPages
            }
          }
          ${sceneFragment}
          ${actorFragment}
          ${studioFragment}
        `,
        variables: {
          query,
          seed: seed || localStorage.getItem("pm_seed") || "default"
        }
      });

      return result.data.getScenes;
    } catch (err) {
      throw err;
    }
  }

  loadPage(page: number) {
    this.fetchLoader = true;
    this.selectedScenes = [];

    this.fetchPage(page)
      .then(result => {
        this.fetchError = false;
        sceneModule.setPagination({
          numResults: result.numItems,
          numPages: result.numPages
        });
        this.scenes = result.items;
      })
      .catch(err => {
        console.error(err);
        this.fetchError = true;
      })
      .finally(() => {
        this.fetchLoader = false;
      });
  }

  refreshPage() {
    this.loadPage(sceneModule.page);
  }

  mounted() {
    if (!this.scenes.length) this.refreshPage();
  }

  beforeMount() {
    ApolloClient.query({
      query: gql`
        {
          getLabels(type: "scene") {
            _id
            name
            aliases
          }
        }
      `
    })
      .then(res => {
        this.allLabels = res.data.getLabels;
        if (!this.allLabels.length) {
          this.selectedLabels.include = [];
          this.selectedLabels.exclude = [];
        }
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