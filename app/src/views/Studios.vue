<template>
  <v-container fluid>
    <BindFavicon />
    <BindTitle value="Studios" />

    <v-navigation-drawer v-if="showSidenav" style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-btn
          :disabled="searchStateManager.refreshed"
          class="text-none mb-2"
          block
          color="primary"
          text
          @click="resetPagination"
          >Refresh</v-btn
        >

        <v-text-field
          @keydown.enter="resetPagination"
          solo
          flat
          single-line
          hide-details
          clearable
          color="primary"
          :value="searchState.query"
          @input="searchStateManager.onValueChanged('query', $event)"
          label="Search query"
          class="mb-2"
        ></v-text-field>

        <div class="d-flex align-center">
          <v-btn
            :color="searchState.favoritesOnly ? 'red' : undefined"
            icon
            @click="searchStateManager.onValueChanged('favoritesOnly', !searchState.favoritesOnly)"
          >
            <v-icon>{{ searchState.favoritesOnly ? "mdi-heart" : "mdi-heart-outline" }}</v-icon>
          </v-btn>

          <v-btn
            :color="searchState.bookmarksOnly ? 'primary' : undefined"
            icon
            @click="searchStateManager.onValueChanged('bookmarksOnly', !searchState.bookmarksOnly)"
          >
            <v-icon>{{
              searchState.bookmarksOnly ? "mdi-bookmark" : "mdi-bookmark-outline"
            }}</v-icon>
          </v-btn>

          <v-spacer></v-spacer>
        </div>

        <Divider icon="mdi-label">Labels</Divider>

        <LabelFilter
          @input="searchStateManager.onValueChanged('selectedLabels', $event)"
          class="mt-0"
          :value="searchState.selectedLabels"
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
          :value="searchState.sortBy"
          @change="searchStateManager.onValueChanged('sortBy', $event)"
          placeholder="Sort by..."
          :items="sortByItems"
          class="mt-0 pt-0 mb-2"
        ></v-select>
        <v-select
          solo
          flat
          single-line
          :disabled="searchState.sortBy == 'relevance' || searchState.sortBy == '$shuffle'"
          hide-details
          color="primary"
          item-text="text"
          item-value="value"
          :value="searchState.sortDir"
          @change="searchStateManager.onValueChanged('sortDir', $event)"
          placeholder="Sort direction"
          :items="sortDirItems"
        ></v-select>
      </v-container>
    </v-navigation-drawer>
    <v-alert class="mb-3" v-if="nameConflictsWarning" dense text dismissible type="warning">{{
      nameConflictsWarning
    }}</v-alert>

    <div class="text-center" v-if="fetchError">
      <div>There was an error</div>
      <v-btn class="mt-2" @click="loadPage">Try again</v-btn>
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
            <v-btn v-on="on" :disabled="searchState.sortBy != '$shuffle'" @click="rerollSeed" icon>
              <v-icon>mdi-dice-3-outline</v-icon>
            </v-btn>
          </template>
          <span>Reshuffle</span>
        </v-tooltip>
        <v-spacer></v-spacer>
        <div>
          <v-pagination
            v-if="!fetchLoader && $vuetify.breakpoint.mdAndUp"
            :value="searchState.page"
            @input="onPageChange"
            :total-visible="9"
            :disabled="fetchLoader"
            :length="numPages"
          ></v-pagination>
        </div>
      </div>
      <v-row v-if="!fetchLoader && numResults">
        <v-col
          class="pa-1"
          v-for="studio in studios"
          :key="studio._id"
          cols="6"
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
        :value="searchState.page"
        @input="onPageChange"
        :total-visible="9"
        :disabled="fetchLoader"
        :length="numPages"
      ></v-pagination>
      <div class="text-center mt-3">
        <v-text-field
          @keydown.enter="onPageChange(jumpPage)"
          :disabled="fetchLoader"
          solo
          flat
          color="primary"
          v-model.number="jumpPage"
          placeholder="Page #"
          class="d-inline-block mr-2"
          style="width: 60px"
          hide-details
        >
        </v-text-field>
        <v-btn
          :disabled="fetchLoader"
          color="primary"
          class="text-none"
          text
          @click="onPageChange(jumpPage)"
          >Load</v-btn
        >
      </div>
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
            >Add {{ studiosBulkImport.length }} studios</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "@/apollo";
import gql from "graphql-tag";
import { contextModule } from "@/store/context";
import ILabel from "@/types/label";
import studioFragment from "@/fragments/studio";
import StudioCard from "@/components/Cards/Studio.vue";
import { mixins } from "vue-class-component";
import DrawerMixin from "@/mixins/drawer";
import { studioModule } from "@/store/studio";
import { checkStudioExist, IDupCheckResults } from "../api/search";
import { isQueryDifferent, SearchStateManager } from "../util/searchState";
import { Dictionary, Route } from "vue-router/types/router";

@Component({
  components: {
    StudioCard,
  },
})
export default class StudioList extends mixins(DrawerMixin) {
  get showSidenav() {
    return contextModule.showSidenav;
  }

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.searchState.sortBy === "$shuffle") this.loadPage();
    return seed;
  }

  studios = [] as any[];

  fetchLoader = false;
  fetchError = false;
  fetchingRandom = false;
  numResults = 0;
  numPages = 0;

  searchStateManager = new SearchStateManager<{
    page: number;
    query: string;
    favoritesOnly: boolean;
    bookmarksOnly: boolean;
    selectedLabels: { include: string[]; exclude: string[] };
    sortBy: string;
    sortDir: string;
  }>({
    localStorageNamer: (key: string) => `pm_studio${key[0].toUpperCase()}${key.substr(1)}`,
    props: {
      page: {
        default: () => 1,
      },
      query: true,
      favoritesOnly: true,
      bookmarksOnly: true,
      selectedLabels: { default: () => ({ include: [], exclude: [] }) },
      sortBy: { default: () => "relevance" },
      sortDir: {
        default: () => "desc",
      },
    },
  });

  jumpPage: string | null = null;

  get searchState() {
    return this.searchStateManager.state;
  }

  studiosBulkText = "" as string | null;
  nameConflictsWarning = null as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  async runBulkImport() {
    this.bulkLoader = true;

    let skippedStudios: string[] = [];
    let aliasConflictStudios: string[] = [];
    this.nameConflictsWarning = null;

    try {
      for (const name of this.studiosBulkImport) {
        const existResult: IDupCheckResults = await checkStudioExist(name);
        if (existResult?.aliasesDup?.length) {
          aliasConflictStudios.push(name);
        }
        if (existResult?.nameDup) {
          skippedStudios.push(name);
        } else {
          await this.createStudioWithName(name);
        }
      }
      this.loadPage();
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.studiosBulkText = "";
    this.bulkLoader = false;

    // Warn of studios that were skipped because they already existed or for which an alias with this name existed
    this.nameConflictsWarning = "";
    if (skippedStudios.length) {
      this.nameConflictsWarning += `These studio already exist and were skipped: ${skippedStudios.join(
        ", "
      )}. `;
    }
    if (aliasConflictStudios.length) {
      this.nameConflictsWarning += `These created studios also exist as alias of other studios: ${aliasConflictStudios.join(
        ", "
      )}. You may want to check for potential duplicates.`;
    }
  }

  get studiosBulkImport() {
    if (this.studiosBulkText) return this.studiosBulkText.split("\n").filter(Boolean);
    return [];
  }

  tryReadLabelsFromLocalStorage(key: string) {
    return (localStorage.getItem(key) || "").split(",").filter(Boolean) as string[];
  }

  allLabels = [] as ILabel[];

  @Watch("$route")
  onRouteChange(to: Route, from: Route) {
    if (isQueryDifferent(to.query as Dictionary<string>, from.query as Dictionary<string>)) {
      // Only update the state and reload, if the query changed => filters changed
      this.searchStateManager.parseFromQuery(to.query as Dictionary<string>);
      this.loadPage();
      return;
    }
  }

  onPageChange(val: number) {
    let page = Number(val);
    if (isNaN(page) || page <= 0 || page > this.numPages) {
      page = 1;
    }
    this.jumpPage = null;
    this.searchStateManager.onValueChanged("page", page);
    this.updateRoute({ page: page.toString() });
  }

  updateRoute(query: { [x: string]: string }, replace = false, noChangeCb: Function | null = null) {
    if (isQueryDifferent(query, this.$route.query as Dictionary<string>)) {
      // Only change the current url if the new url will be different to avoid redundant navigation
      const update = {
        name: "studios",
        query: {
          ...this.$route.query,
          ...query,
        },
      };
      if (replace) {
        this.$router.replace(update);
      } else {
        this.$router.push(update);
      }
    } else {
      noChangeCb?.();
    }
  }

  sortDirItems = [
    {
      text: "Ascending",
      value: "asc",
    },
    {
      text: "Descending",
      value: "desc",
    },
  ];

  sortByItems = [
    {
      text: "Relevance",
      value: "relevance",
    },
    {
      text: "# scenes",
      value: "numScenes",
    },
    {
      text: "Added to collection",
      value: "addedOn",
    },
    {
      text: "Bookmarked",
      value: "bookmark",
    },
    {
      text: "Average rating",
      value: "averageRating",
    },
    /* {
      text: "Rating",
      value: "rating"
    } */
  ];

  labelIDs(indices: number[]) {
    return indices.map((i) => this.allLabels[i]).map((l) => l._id);
  }

  labelNames(indices: number[]) {
    return indices.map((i) => this.allLabels[i].name);
  }

  async createStudioWithName(name: string) {
    try {
      await ApolloClient.mutate({
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
                color
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
          name,
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  studioLabels(studio: any) {
    return studio.labels.map((l) => l.name).sort();
  }

  resetPagination() {
    this.searchState.page = 1;
    this.updateRoute(this.searchStateManager.toQuery());
  }

  getRandom() {
    this.fetchingRandom = true;
    this.fetchPage(1, 1, true, Math.random().toString())
      .then((result) => {
        // @ts-ignore
        this.$router.push(`/studio/${result.items[0]._id}`);
      })
      .catch((err) => {
        this.fetchingRandom = false;
      });
  }

  async fetchPage(page: number, take = 24, random?: boolean, seed?: string) {
    const result = await ApolloClient.query({
      query: gql`
        query($query: StudioSearchQuery!, $seed: String) {
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
                color
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
        query: {
          query: this.searchState.query || "",
          include: this.searchState.selectedLabels.include,
          exclude: this.searchState.selectedLabels.exclude,
          take,
          page: page - 1,
          sortDir: this.searchState.sortDir,
          sortBy: random ? "$shuffle" : this.searchState.sortBy,
          favorite: this.searchState.favoritesOnly,
          bookmark: this.searchState.bookmarksOnly,
        },
        seed: seed || localStorage.getItem("pm_seed") || "default",
      },
    });

    return result.data.getStudios;
  }

  loadPage() {
    this.fetchLoader = true;

    return this.fetchPage(this.searchState.page)
      .then((result) => {
        this.searchStateManager.refreshed = true;
        this.fetchError = false;
        this.fetchError = false;
        this.numResults = result.numItems;
        this.numPages = result.numPages;
        this.studios = result.items;
      })
      .catch((err) => {
        console.error(err);
        this.fetchError = true;
      })
      .finally(() => {
        this.fetchLoader = false;
      });
  }

  beforeMount() {
    this.searchStateManager.initState(this.$route.query as Dictionary<string>);
    this.updateRoute(this.searchStateManager.toQuery(), true, this.loadPage);

    ApolloClient.query({
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
    })
      .then((res) => {
        this.allLabels = res.data.getLabels;
        if (!this.allLabels.length) {
          this.searchState.selectedLabels.include = [];
          this.searchState.selectedLabels.exclude = [];
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
</script>
