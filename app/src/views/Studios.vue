<template>
  <v-container fluid>
    <v-navigation-drawer
      style="z-index: 14"
      v-model="drawer"
      :permanent="$vuetify.breakpoint.mdAndUp"
      clipped
      app
    >
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
        <h1 class="font-weight-light mr-3">Studios</h1>
        <!-- <v-btn class="mr-3" @click="openCreateDialog" icon>
          <v-icon>mdi-plus</v-icon>
        </v-btn>-->
        <v-btn @click="bulkImportDialog = true" icon>
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
      <v-row>
        <v-col
          class="pa-1"
          v-for="studio in studios"
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
    </div>
    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <v-dialog :persistent="bulkLoader" scrollable v-model="bulkImportDialog" max-width="400px">
      <v-card :loading="bulkLoader">
        <v-card-title>Create studio(s)</v-card-title>

        <v-card-text style="max-height: 400px">
          <v-textarea
            color="accent"
            v-model="studiosBulkText"
            auto-grow
            :rows="3"
            placeholder="Studio names"
            persistent-hint
            hint="1 studio name per line"
          ></v-textarea>
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            @click="runBulkImport"
            text
            color="accent"
            class="text-none"
            :disabled="!studiosBulkImport.length"
          >Add {{ studiosBulkImport.length }} studios</v-btn>
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
import { contextModule } from "../store/context";
import InfiniteLoading from "vue-infinite-loading";
import ILabel from "../types/label";
import studioFragment from "../fragments/studio";
import StudioCard from "../components/StudioCard.vue";

@Component({
  components: {
    InfiniteLoading,
    StudioCard
  }
})
export default class StudioList extends Vue {
  studios = [] as any[];
  fetchLoader = false;

  studiosBulkText = "" as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  async runBulkImport() {
    this.bulkLoader = true;

    try {
      for (const name of this.studiosBulkImport) {
        await this.createStudioWithName(name);
      }
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.studiosBulkText = "";
    this.bulkLoader = false;
  }

  get studiosBulkImport() {
    if (this.studiosBulkText)
      return this.studiosBulkText.split("\n").filter(Boolean);
    return [];
  }

  waiting = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[]; // TODO: try to retrieve from localStorage

  /* validCreation = false;
  createStudioDialog = false;
  createStudioName = "";
  labelSelectorDialog = false;
  addStudioLoader = false;

  studioNameRules = [v => (!!v && !!v.length) || "Invalid studio name"]; */

  query = localStorage.getItem("pm_studioQuery") || "";

  page = 0;

  sortDir = localStorage.getItem("pm_studioSortDir") || "desc";
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

  sortBy = localStorage.getItem("pm_studioSortBy") || "relevance";
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
    }
  ];

  favoritesOnly = localStorage.getItem("pm_studioFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_studioBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_studioRating") || "0");

  infiniteId = 0;
  resetTimeout = null as NodeJS.Timeout | null;

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

  async createStudioWithName(name: string) {
    try {
      const res = await ApolloClient.mutate({
        mutation: gql`
          mutation($name: String!) {
            addStudio(name: $name) {
              ...StudioFragment
            }
          }
          ${studioFragment}
        `,
        variables: {
          name
        }
      });

      this.studios.unshift(res.data.addStudio);
    } catch (error) {
      console.error(error);
    }
  }

  /* addStudio() {
    this.addStudioLoader = true;

    this.createStudioWithName(this.createStudioName)
      .then(res => {
        this.createStudioDialog = false;
        this.createStudioName = "";
      })
      .catch(() => {})
      .finally(() => {
        this.addStudioLoader = false;
      });
  } */

  /* openCreateDialog() {
    this.createStudioDialog = true;
  } */

  /* favorite(id: any, favorite: boolean) {
    const index = this.studios.findIndex(sc => sc._id == id);

    if (index > -1) {
      const studio = this.studios[index];
      studio.favorite = favorite;
      Vue.set(this.studios, index, studio);
    }
  }

  bookmark(id: any, bookmark: boolean) {
    const index = this.studios.findIndex(sc => sc._id == id);

    if (index > -1) {
      const studio = this.studios[index];
      studio.bookmark = bookmark;
      Vue.set(this.studios, index, studio);
    }
  } */

  studioLabels(studio: any) {
    return studio.labels.map(l => l.name).sort();
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    localStorage.setItem("pm_studioRating", newVal.toString());
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_studioFavorite", "" + newVal);
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_studioBookmark", "" + newVal);
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_studioSortDir", newVal);
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_studioSortBy", newVal);
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("selectedLabels")
  onLabelChange() {
    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_studioQuery", newVal || "");

    this.waiting = true;
    this.page = 0;
    this.studios = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.studios.push(...items);
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
            getStudios(query: $query) {
              ...StudioFragment
            }
          }
          ${studioFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getStudios;
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
    document.title = "Studios";
  }
}
</script>