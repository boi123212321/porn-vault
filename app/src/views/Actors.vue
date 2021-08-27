<template>
  <v-container fluid>
    <BindFavicon />
    <BindTitle @value="actorPlural" />
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
          clearable
          color="primary"
          :value="searchState.query"
          @input="searchStateManager.onValueChanged('query', $event)"
          label="Search query"
          class="mb-2"
          hide-details
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

          <Rating
            @input="searchStateManager.onValueChanged('ratingFilter', $event)"
            :value="searchState.ratingFilter"
          />
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
          color="primary"
          item-text="text"
          item-value="value"
          :value="searchState.sortBy"
          @change="searchStateManager.onValueChanged('sortBy', $event)"
          placeholder="Sort by..."
          :items="sortByItems"
          class="mt-0 pt-0 mb-2"
          :hint="sortDescription"
          persistent-hint
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

        <Divider icon="mdi-flag">Nationality</Divider>

        <v-autocomplete
          placeholder="Filter by nationality"
          hide-details
          color="primary"
          solo
          flat
          single-line
          :value="searchState.countryFilter"
          @change="searchStateManager.onValueChanged('countryFilter', $event)"
          :items="countries"
          item-text="name"
          item-value="alpha2"
          clearable
        ></v-autocomplete>

        <div class="mt-3 text-center">
          <v-btn
            @click="openCustomFilterDialog"
            text
            class="text-center text-none"
            color="primary"
            >{{
              searchState.customFilter.length
                ? `${searchState.customFilter.length} custom filters`
                : "Filter custom fields"
            }}</v-btn
          >
        </div>
      </v-container>
    </v-navigation-drawer>

    <div class="text-center" v-if="fetchError">
      <div>There was an error</div>
      <v-btn class="mt-2" @click="loadPage">Try again</v-btn>
    </div>
    <div v-else>
      <div class="mb-2 d-flex align-center">
        <div class="mr-3">
          <span class="display-1 font-weight-bold mr-2">{{ fetchLoader ? "-" : numResults }}</span>
          <span class="title font-weight-regular">
            <template v-if="numResults === 1">{{ actorSingular.toLowerCase() }}</template>
            <template v-else>{{ actorPlural.toLowerCase() }}</template> found
          </span>
        </div>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="openCreateDialog" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Add {{ actorSingular.toLowerCase() }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="bulkImportDialog = true" icon>
              <v-icon>mdi-file-import</v-icon>
            </v-btn>
          </template>
          <span>Bulk add {{ actorPlural.toLowerCase() }}</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :loading="fetchingRandom" @click="getRandom" icon>
              <v-icon>mdi-shuffle-variant</v-icon>
            </v-btn>
          </template>
          <span>Get random {{ actorSingular.toLowerCase() }}</span>
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
          v-for="(actor, i) in actors"
          :key="actor._id"
          cols="6"
          sm="6"
          md="4"
          lg="3"
          xl="2"
        >
          <actor-card :showLabels="showCardLabels" v-model="actors[i]" style="height: 100%" />
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
          @click="loadPage(page)"
          >Load</v-btn
        >
      </div>
    </div>

    <v-dialog v-model="createActorDialog" max-width="400px">
      <v-card :loading="addActorLoader">
        <v-card-title>Add new {{ actorSingular.toLowerCase() }}</v-card-title>
        <v-card-text>
          <v-form v-model="validCreation">
            <v-text-field
              :rules="actorNameRules"
              color="primary"
              v-model="createActorName"
              placeholder="Name"
            />

            <v-combobox
              color="primary"
              multiple
              chips
              v-model="createActorAliases"
              placeholder="Alias names"
            />

            <v-chip
              label
              @click:close="createSelectedLabels.splice(i, 1)"
              class="mr-1 mb-1"
              close
              small
              outlined
              v-for="(name, i) in labelNames(createSelectedLabels)"
              :key="name"
              >{{ name }}</v-chip
            >
            <v-chip
              label
              :class="`mr-1 mb-1 ${$vuetify.theme.dark ? 'black--text' : 'white--text'}`"
              @click="openLabelSelectorDialog"
              color="primary"
              dark
              small
              >+ Select labels</v-chip
            >
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" :disabled="!validCreation" color="primary" @click="addActor"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog scrollable v-model="labelSelectorDialog" max-width="400px">
      <v-card>
        <v-card-title>Select labels for '{{ createActorName }}'</v-card-title>

        <v-card-text style="max-height: 400px">
          <LabelSelector :items="allLabels" v-model="createSelectedLabels" />
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-btn @click="createSelectedLabels = []" text class="text-none">Clear</v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="labelSelectorDialog = false" text color="primary" class="text-none"
            >OK</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :persistent="bulkLoader" scrollable v-model="bulkImportDialog" max-width="400px">
      <v-card :loading="bulkLoader">
        <v-card-title>Bulk import {{ actorSingular.toLowerCase() }} names</v-card-title>

        <v-card-text style="max-height: 400px">
          <v-textarea
            color="primary"
            v-model="actorsBulkText"
            auto-grow
            :rows="3"
            @placeholder="actorSingular.toLowerCase() + ' names'"
            persistent-hint
            @hint="'1 ' + actorSingular.toLowerCase() + ' name per line'"
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
            :disabled="!actorsBulkImport.length"
            >Add {{ actorsBulkImport.length }} {{ actorPlural.toLowerCase() }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog scrollable max-width="750px" v-model="customDialog">
      <v-card v-if="customDialog">
        <v-card-title>Filter custom fields</v-card-title>
        <v-card-text style="max-height: 500px">
          <CustomFieldFilter v-model="customFilterTemp" :fields="fields" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="customFilterTempInvalid"
            @click="onCustomChange"
            text
            color="primary"
            class="text-none"
            >Apply</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import ApolloClient from "@/apollo";
import gql from "graphql-tag";
import ActorCard from "@/components/Cards/Actor.vue";
import LabelSelector from "@/components/LabelSelector.vue";
import actorFragment from "@/fragments/actor";
import { contextModule } from "@/store/context";
import IActor from "@/types/actor";
import ILabel from "@/types/label";
import DrawerMixin from "@/mixins/drawer";
import { mixins } from "vue-class-component";
import CustomFieldFilter from "@/components/CustomFieldFilter.vue";
import countries from "@/util/countries";
import { SearchStateManager, isQueryDifferent } from "../util/searchState";
import { Dictionary, Route } from "vue-router/types/router";

@Component({
  components: {
    ActorCard,
    LabelSelector,
    CustomFieldFilter,
  },
})
export default class ActorList extends mixins(DrawerMixin) {
  get countries() {
    return countries;
  }

  get showSidenav() {
    return contextModule.showSidenav;
  }

  get actorSingular() {
    return contextModule.actorSingular;
  }

  get actorPlural() {
    return contextModule.actorPlural;
  }

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.searchState.sortBy === "$shuffle") {
      this.loadPage();
    }
    return seed;
  }

  actors = [] as IActor[];

  fields = [] as any[];
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
    ratingFilter: number;
    selectedLabels: { include: string[]; exclude: string[] };
    sortBy: string;
    sortDir: string;
    countryFilter: string;
    customFilter: { id: string; op: string; value: string, type: string }[];
  }>({
    localStorageNamer: (key: string) => `pm_actor${key[0].toUpperCase()}${key.substr(1)}`,
    props: {
      page: {
        default: () => 1,
      },
      query: true,
      favoritesOnly: { default: () => false },
      bookmarksOnly: { default: () => false },
      ratingFilter: { default: () => 0 },
      selectedLabels: { default: () => ({ include: [], exclude: [] }) },
      sortBy: { default: () => "relevance" },
      sortDir: {
        default: () => "desc",
      },
      countryFilter: true,
      customFilter: { default: () => [] },
    },
  });

  jumpPage: string | null = null;

  get searchState() {
    return this.searchStateManager.state;
  }

  actorsBulkText = "" as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  customFilterTemp: { id: string; op: string; value: string, type: string }[] = [];
  customDialog = false;

  get customFilterTempInvalid() {
    return this.customFilterTemp.some( (el) => {
      // no operation selected
      if (!el.op) {
        return true;
      }

      switch(el.type) {
        // if boolean, all values are valid
        case 'BOOLEAN':
          return false;
        // if number, only undefined (initial state) or empty string (entering values then deleting them) are invalid
        case 'NUMBER':
          const val: number = +el.value;
          return typeof el.value === 'undefined' || el.value === '' || isNaN(val);
        default:
          return !el.value;
      }
    });
  }

  openCustomFilterDialog() {
    this.customFilterTemp = [...this.searchState.customFilter];
    this.customDialog = true;
  }

  onCustomChange() {
    this.searchStateManager.onValueChanged("customFilter", [...this.customFilterTemp]);
    this.customDialog = false;
    this.resetPagination();
  }

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  async runBulkImport() {
    this.bulkLoader = true;

    try {
      for (const name of this.actorsBulkImport) {
        await this.createActorWithName(name);
      }
      this.loadPage();
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.actorsBulkText = "";
    this.bulkLoader = false;
  }

  get actorsBulkImport() {
    if (this.actorsBulkText) return this.actorsBulkText.split("\n").filter(Boolean);
    return [];
  }

  allLabels = [] as ILabel[];

  validCreation = false;
  createActorDialog = false;
  createActorName = "";
  createActorAliases = [] as string[];
  createSelectedLabels = [] as number[];
  labelSelectorDialog = false;
  addActorLoader = false;

  actorNameRules = [(v) => (!!v && !!v.length) || "Invalid name"];

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
    this.updateRoute(this.searchStateManager.toQuery(), false, () => {
      // If the query wasn't different, just reset the flag
      this.searchStateManager.refreshed = true;
    });
  }

  updateRoute(query: { [x: string]: string }, replace = false, noChangeCb: Function | null = null) {
    if (isQueryDifferent(query, this.$route.query as Dictionary<string>)) {
      // Only change the current url if the new url will be different to avoid redundant navigation
      const update = {
        name: "actors",
        query, // Always override the current query
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

  get sortDescription() {
    return (
      {
        relevance: "Sorts by relevance",
        addedOn: "Sorts by creation date",
        rating: `Sorts by ${this.actorSingular?.toLowerCase() ?? ""} rating`,
        averageRating: "Sort by average scene rating",
        score: "Sorts by computed score",
        numScenes: "Sorts by number of scenes",
        numViews: "Sorts by number of views",
        bornOn: `Sorts by ${this.actorSingular?.toLowerCase() ?? ""} age`,
        bookmark: "Sorts by bookmark date",
        $shuffle: `Shuffles ${this.actorPlural?.toLowerCase() ?? ""}`,
      }[this.searchState.sortBy] || "Missing description"
    );
  }

  sortByItems = [
    {
      text: "Relevance",
      value: "relevance",
    },
    {
      text: "Added to collection",
      value: "addedOn",
    },
    {
      text: "Alphabetical",
      value: "rawName",
    },
    {
      text: "Last viewed",
      value: "lastViewedOn",
    },
    {
      text: "Age",
      value: "bornOn",
    },
    {
      text: "Rating",
      value: "rating",
    },
    {
      text: "Average rating",
      value: "averageRating",
    },
    {
      text: "Score",
      value: "score",
    },
    {
      text: "# scenes",
      value: "numScenes",
    },
    {
      text: "Views",
      value: "numViews",
    },
    {
      text: "Bookmarked",
      value: "bookmark",
    },
    {
      text: "Random",
      value: "$shuffle",
    },
  ];

  createActorWithName(name: string) {
    return new Promise<void>((resolve, reject) => {
      ApolloClient.mutate({
        mutation: gql`
          mutation ($name: String!) {
            addActor(name: $name) {
              ...ActorFragment
              labels {
                _id
                name
                color
              }
              thumbnail {
                _id
                color
              }
              numScenes
            }
          }
          ${actorFragment}
        `,
        variables: {
          name,
        },
      })
        .then((res) => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  addActor() {
    this.addActorLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation ($name: String!, $aliases: [String!], $labels: [String!]) {
          addActor(name: $name, aliases: $aliases, labels: $labels) {
            ...ActorFragment
            labels {
              _id
              name
              color
            }
            thumbnail {
              _id
              color
            }
            numScenes
          }
        }
        ${actorFragment}
      `,
      variables: {
        name: this.createActorName,
        aliases: this.createActorAliases,
        labels: this.labelIDs(this.createSelectedLabels),
      },
    })
      .then((res) => {
        this.loadPage();
        this.createActorDialog = false;
        this.createActorName = "";
        this.createActorAliases = [];
        this.createSelectedLabels = [];
      })
      .catch(() => {})
      .finally(() => {
        this.addActorLoader = false;
      });
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
              color
            }
          }
        `,
      })
        .then((res) => {
          this.allLabels = res.data.getLabels;
          this.labelSelectorDialog = true;
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      this.labelSelectorDialog = true;
    }
  }

  labelIDs(indices: number[]) {
    return indices.map((i) => this.allLabels[i]).map((l) => l._id);
  }

  labelNames(indices: number[]) {
    return indices.map((i) => this.allLabels[i].name);
  }

  openCreateDialog() {
    this.createActorDialog = true;
  }

  actorLabels(actor: any) {
    return actor.labels.map((l) => l.name);
  }

  actorActorNames(actor: any) {
    return actor.actors.map((a) => a.name).join(", ");
  }

  actorThumbnail(actor: any) {
    if (actor.thumbnail)
      return `/api/media/image/${actor.thumbnail._id}?password=${localStorage.getItem("password")}`;
    return "";
  }

  resetPagination() {
    this.searchStateManager.onValueChanged("page", 1);
    this.updateRoute(this.searchStateManager.toQuery(), false, () => {
      // If the query wasn't different, just reset the flag
      this.searchStateManager.refreshed = true;
    });
  }

  getRandom() {
    this.fetchingRandom = true;
    this.fetchPage(1, 1, true, Math.random().toString())
      .then((result) => {
        // @ts-ignore
        this.$router.push(`/actor/${result.items[0]._id}`);
      })
      .catch((err) => {
        this.fetchingRandom = false;
      });
  }

  async fetchPage(page: number, take = 24, random?: boolean, seed?: string) {
    let sortDir = this.searchState.sortDir;

    // Flip sort direction
    if (this.searchState.sortBy === "bornOn") {
      sortDir = sortDir === "desc" ? "asc" : "desc";
    }

    const result = await ApolloClient.query({
      query: gql`
        query ($query: ActorSearchQuery!, $seed: String) {
          getActors(query: $query, seed: $seed) {
            items {
              ...ActorFragment
              labels {
                _id
                name
                color
              }
              thumbnail {
                _id
                color
              }
              altThumbnail {
                _id
              }
              numScenes
            }
            numItems
            numPages
          }
        }
        ${actorFragment}
      `,
      variables: {
        query: {
          query: this.searchState.query || "",
          include: this.searchState.selectedLabels.include,
          exclude: this.searchState.selectedLabels.exclude,
          nationality: this.searchState.countryFilter || null,
          take,
          page: page - 1,
          sortDir,
          sortBy: random ? "$shuffle" : this.searchState.sortBy,
          favorite: this.searchState.favoritesOnly,
          bookmark: this.searchState.bookmarksOnly,
          rating: this.searchState.ratingFilter,
          custom: this.searchState.customFilter,
        },
        seed: seed || localStorage.getItem("pm_seed") || "default",
      },
    });

    return result.data.getActors;
  }

  loadPage() {
    this.fetchLoader = true;

    return this.fetchPage(this.searchState.page)
      .then((result) => {
        this.searchStateManager.refreshed = true;
        this.fetchError = false;
        this.numResults = result.numItems;
        this.numPages = result.numPages;
        this.actors = result.items;
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
    this.updateRoute(this.searchStateManager.toQuery(), true, () => {
      // If the query wasn't different, there will be no route change
      // => manually trigger loadPage
      this.loadPage();
    });

    ApolloClient.query({
      query: gql`
        {
          getLabels {
            _id
            name
            aliases
            color
          }
          getCustomFields(target: ACTORS) {
            _id
            name
            type
            values
            unit
            target
          }
        }
      `,
    })
      .then((res) => {
        this.fields = res.data.getCustomFields;
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
