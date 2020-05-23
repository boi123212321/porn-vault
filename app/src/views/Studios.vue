<template>
  <v-container fluid>
    <BindTitle value="Studios" />
    <v-navigation-drawer v-if="showSidenav" style="z-index: 14" v-model="drawer" clipped app>
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
          <span class="title font-weight-regular">studios found</span>
        </div>

        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="bulkImportDialog = true" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Add studio</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :loading="fetchingRandom" @click="getRandom" icon>
              <v-icon>mdi-shuffle-variant</v-icon>
            </v-btn>
          </template>
          <span>Get random studio</span>
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
import { studioModule } from "../store/studio";

@Component({
  components: {
    InfiniteLoading,
    StudioCard
  }
})
export default class StudioList extends mixins(DrawerMixin) {
  get showSidenav() {
    return contextModule.showSidenav;
  }

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.sortBy === "$shuffle") this.loadPage(this.page);
    return seed;
  }

  studios = [] as any[];

  fetchLoader = false;
  fetchError = false;
  fetchingRandom = false;

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
      this.refreshPage();
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
    studioModule.resetPagination();
  }

  query = localStorage.getItem("pm_studioQuery") || "";

  set page(page: number) {
    studioModule.setPage(page);
  }

  get page() {
    return studioModule.page;
  }

  get numResults() {
    return studioModule.numResults;
  }

  get numPages() {
    return studioModule.numPages;
  }

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
      value: "name"
    },
    {
      text: "# scenes",
      value: "numScenes"
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
    studioModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_studioFavorite", "" + newVal);
    studioModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_studioBookmark", "" + newVal);
    studioModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_studioSortDir", newVal);
    studioModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_studioSortBy", newVal);
    studioModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_studioQuery", newVal || "");

    this.waiting = true;
    studioModule.resetPagination();

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
        this.$router.push(`/studio/${result.items[0]._id}`);
      })
      .catch(err => {
        this.fetchingRandom = false;
      });
  }

  async fetchPage(page: number, take = 24, random?: boolean, seed?: string) {
    try {
      let include = "";
      let exclude = "";

      if (this.selectedLabels.include.length)
        include = "include:" + this.selectedLabels.include.join(",");

      if (this.selectedLabels.exclude.length)
        exclude = "exclude:" + this.selectedLabels.exclude.join(",");

      const query = `query:'${this.query ||
        ""}' take:${take} ${include} ${exclude} page:${this.page - 1} sortDir:${
        this.sortDir
      } sortBy:${random ? "$shuffle" : this.sortBy} favorite:${
        this.favoritesOnly ? "true" : "false"
      } bookmark:${this.bookmarksOnly ? "true" : "false"} rating:${
        this.ratingFilter
      }`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String, $seed: String) {
            getStudios(query: $query, seed: $seed) {
              items {
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
              numItems
              numPages
            }
          }
          ${studioFragment}
        `,
        variables: {
          query,
          seed: seed || localStorage.getItem("pm_seed") || "default"
        }
      });

      return result.data.getStudios;
    } catch (err) {
      throw err;
    }
  }

  loadPage(page: number) {
    this.fetchLoader = true;

    this.fetchPage(page)
      .then(result => {
        this.fetchError = false;
        studioModule.setPagination({
          numResults: result.numItems,
          numPages: result.numPages
        });
        this.studios = result.items;
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
    this.loadPage(studioModule.page);
  }

  mounted() {
    if (!this.studios.length) this.refreshPage();
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