<template>
  <v-container fluid>
    <BindTitle value="Studios" />
    <v-navigation-drawer style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-text-field
          solo
          flat
          single-line
          hide-details
          clearable
          color="primary"
          v-model="query"
          label="Search query"
          class="mb-2"
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
          <studio-card :showLabels="showCardLabels" :studio="studio" style="height: 100%" />
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
            color="primary"
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
            color="primary"
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
import { mixins } from "vue-class-component";
import DrawerMixin from "../mixins/drawer";

@Component({
  components: {
    InfiniteLoading,
    StudioCard
  }
})
export default class StudioList extends mixins(DrawerMixin) {
  studios = [] as any[];
  fetchLoader = false;

  studiosBulkText = "" as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

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

  tryReadLabelsFromLocalStorage(key: string) {
    return (localStorage.getItem(key) || "")
      .split(",")
      .filter(Boolean) as string[];
  }

  waiting = false;
  allLabels = [] as ILabel[];
  selectedLabels = {
    include: this.tryReadLabelsFromLocalStorage("pm_studioInclude"),
    exclude: this.tryReadLabelsFromLocalStorage("pm_studioExclude")
  };

  onSelectedLabelsChange(val: any) {
    localStorage.setItem("pm_studioInclude", val.include.join(","));
    localStorage.setItem("pm_studioExclude", val.exclude.join(","));

    this.page = 0;
    this.studios = [];
    this.infiniteId++;
  }

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
      text: "# scenes",
      value: "scenes"
    },
    {
      text: "Added to collection",
      value: "addedOn"
    },
    {
      text: "Bookmarked",
      value: "bookmark"
    }
    /* {
      text: "Rating",
      value: "rating"
    } */
  ];

  favoritesOnly = localStorage.getItem("pm_studioFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_studioBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_studioRating") || "0");

  infiniteId = 0;
  resetTimeout = null as NodeJS.Timeout | null;

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
              numScenes
              thumbnail {
                _id
              }
              labels {
                _id
                name
              }
              parent {
                _id
                name
              }
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
    this.fetchPage()
      .then(items => {
        if (items.length) {
          this.page++;
          this.studios.push(...items);
          $state.loaded();
        } else {
          $state.complete();
        }
      })
      .catch(err => {
        $state.error();
      });
  }

  async fetchPage() {
    try {
      let include = "";
      let exclude = "";

      if (this.selectedLabels.include.length)
        include = "include:" + this.selectedLabels.include.join(",");

      if (this.selectedLabels.exclude.length)
        exclude = "exclude:" + this.selectedLabels.exclude.join(",");

      const query = `query:'${this.query || ""}' ${include} ${exclude} page:${
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
              numScenes
              thumbnail {
                _id
              }
              labels {
                _id
                name
              }
              parent {
                _id
                name
              }
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
          getLabels(type: "studio") {
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