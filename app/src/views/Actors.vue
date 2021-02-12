<template>
  <v-container fluid>
    <BindFavicon />
    <BindTitle value="Actors" />
    <v-navigation-drawer v-if="showSidenav" style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-btn
          :disabled="refreshed"
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
          v-model="query"
          label="Search query"
          class="mb-2"
          hide-details
        ></v-text-field>

        <div class="d-flex align-center">
          <v-btn
            :color="favoritesOnly ? 'red' : undefined"
            icon
            @click="favoritesOnly = !favoritesOnly"
          >
            <v-icon>{{ favoritesOnly ? "mdi-heart" : "mdi-heart-outline" }}</v-icon>
          </v-btn>

          <v-btn
            :color="bookmarksOnly ? 'primary' : undefined"
            icon
            @click="bookmarksOnly = !bookmarksOnly"
          >
            <v-icon>{{ bookmarksOnly ? "mdi-bookmark" : "mdi-bookmark-outline" }}</v-icon>
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
          color="primary"
          item-text="text"
          item-value="value"
          v-model="sortBy"
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
          :disabled="sortBy == 'relevance' || sortBy == '$shuffle'"
          hide-details
          color="primary"
          item-text="text"
          item-value="value"
          v-model="sortDir"
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
          v-model="countryFilter"
          :items="countries"
          item-text="name"
          item-value="alpha2"
          clearable
        ></v-autocomplete>

        <div class="mt-3 text-center">
          <v-btn @click="customDialog = true" text class="text-center text-none" color="primary">{{
            customFilter.length ? `${customFilter.length} custom filters` : "Filter custom fields"
          }}</v-btn>
        </div>
      </v-container>
    </v-navigation-drawer>
    <v-alert class="mb-3" v-if="skippedActorsWarning" dense text dismissible type="warning"
      >These actors already exist and were skipped: <b>{{ skippedActorsWarning }}</b></v-alert
    >

    <div class="text-center" v-if="fetchError">
      <div>There was an error</div>
      <v-btn class="mt-2" @click="loadPage(page)">Try again</v-btn>
    </div>
    <div v-else>
      <div class="mb-2 d-flex align-center">
        <div class="mr-3">
          <span class="display-1 font-weight-bold mr-2">{{ fetchLoader ? "-" : numResults }}</span>
          <span class="title font-weight-regular">actors found</span>
        </div>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="openCreateDialog" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Add actor</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="bulkImportDialog = true" icon>
              <v-icon>mdi-file-import</v-icon>
            </v-btn>
          </template>
          <span>Bulk add actors</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :loading="fetchingRandom" @click="getRandom" icon>
              <v-icon>mdi-shuffle-variant</v-icon>
            </v-btn>
          </template>
          <span>Get random actor</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :disabled="sortBy != '$shuffle'" @click="rerollSeed" icon>
              <v-icon>mdi-dice-3-outline</v-icon>
            </v-btn>
          </template>
          <span>Reshuffle</span>
        </v-tooltip>
        <v-spacer></v-spacer>
        <div>
          <v-pagination
            v-if="!fetchLoader && $vuetify.breakpoint.mdAndUp"
            @input="loadPage"
            v-model="page"
            :total-visible="7"
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
        @input="loadPage"
        v-model="page"
        :total-visible="7"
        :disabled="fetchLoader"
        :length="numPages"
      ></v-pagination>
    </div>

    <v-dialog v-model="createActorDialog" max-width="400px">
      <v-card :loading="addActorLoader">
        <v-card-title>Add new actor/actress</v-card-title>
        <v-card-text>
          <v-form v-model="validCreation">
            <v-text-field
              :rules="actorNameRules"
              :error-messages="createActorErrors"
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
        <v-card-title>Bulk import actor names</v-card-title>

        <v-card-text style="max-height: 400px">
          <v-textarea
            color="primary"
            v-model="actorsBulkText"
            auto-grow
            :rows="3"
            placeholder="Actor names"
            persistent-hint
            hint="1 actor name per line"
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
            >Add {{ actorsBulkImport.length }} actors</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog scrollable max-width="750px" v-model="customDialog">
      <v-card v-if="customDialog">
        <v-card-title>Filter custom fields</v-card-title>
        <v-card-text style="max-height: 500px">
          <CustomFieldFilter v-model="customFilter" :fields="fields" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="onCustomChange" text color="primary" class="text-none">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "@/apollo";
import gql from "graphql-tag";
import ActorCard from "@/components/Cards/Actor.vue";
import LabelSelector from "@/components/LabelSelector.vue";
import actorFragment from "@/fragments/actor";
import { contextModule } from "@/store/context";
import IActor from "@/types/actor";
import ILabel from "@/types/label";
import DrawerMixin from "@/mixins/drawer";
import { mixins } from "vue-class-component";
import { actorModule } from "@/store/actor";
import CustomFieldFilter from "@/components/CustomFieldFilter.vue";
import countries from "@/util/countries";

@Component({
  components: {
    ActorCard,
    LabelSelector,
    CustomFieldFilter,
  },
})
export default class ActorList extends mixins(DrawerMixin) {
  countryFilter = localStorage.getItem("pm_actorNationality") || null;

  get countries() {
    return countries;
  }

  get showSidenav() {
    return contextModule.showSidenav;
  }

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.sortBy === "$shuffle") this.loadPage(this.page);
    return seed;
  }

  actors = [] as IActor[];

  fields = [] as any[];
  fetchLoader = false;
  fetchError = false;
  fetchingRandom = false;

  actorsBulkText = "" as string | null;
  skippedActorsWarning = null as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  customFilter = (() => {
    const itemStr = localStorage.getItem("pm_actorCustomFilter");
    if (itemStr) {
      return JSON.parse(itemStr);
    }
    return [];
  })() as any[];
  customDialog = false;

  onCustomChange() {
    localStorage.setItem("pm_actorCustomFilter", JSON.stringify(this.customFilter));
    this.resetPagination();
    this.refreshPage();
  }

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  async runBulkImport() {
    this.bulkLoader = true;

    let skippedActors: string[] = [];
    this.skippedActorsWarning = null;

    try {
      for (const name of this.actorsBulkImport) {
        if (await this.checkActorExist(name)) {
          skippedActors.push(name);
        } else {
          await this.createActorWithName(name);
        }
      }

      this.refreshPage();
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.actorsBulkText = "";
    this.bulkLoader = false;

    // triggers warning alert if any actors were skipped because they already existed
    if (skippedActors.length > 0) {
      this.skippedActorsWarning = skippedActors.join(", ");
    }
  }

  get actorsBulkImport() {
    if (this.actorsBulkText) return this.actorsBulkText.split("\n").filter(Boolean);
    return [];
  }

  tryReadLabelsFromLocalStorage(key: string) {
    return (localStorage.getItem(key) || "").split(",").filter(Boolean) as string[];
  }

  allLabels = [] as ILabel[];
  selectedLabels = {
    include: this.tryReadLabelsFromLocalStorage("pm_actorInclude"),
    exclude: this.tryReadLabelsFromLocalStorage("pm_actorExclude"),
  };

  onSelectedLabelsChange(val: any) {
    localStorage.setItem("pm_actorInclude", val.include.join(","));
    localStorage.setItem("pm_actorExclude", val.exclude.join(","));
    this.refreshed = false;
  }

  validCreation = false;
  createActorDialog = false;
  createActorName = "";
  createActorErrors = [] as string[];
  createActorAliases = [] as string[];
  createSelectedLabels = [] as number[];
  labelSelectorDialog = false;
  addActorLoader = false;

  actorNameRules = [(v) => (!!v && !!v.length) || "Invalid actor name"];

  query = localStorage.getItem("pm_actorQuery") || "";

  set page(page: number) {
    actorModule.setPage(page);
  }

  get page() {
    return actorModule.page;
  }

  get numResults() {
    return actorModule.numResults;
  }

  get numPages() {
    return actorModule.numPages;
  }

  sortDir = localStorage.getItem("pm_actorSortDir") || "desc";
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
        rating: "Sorts by actor rating",
        averageRating: "Sort by average scene rating",
        score: "Sorts by computed score",
        numScenes: "Sorts by number of scenes",
        numViews: "Sorts by number of views",
        age: "Sorts by actor age",
        bookmark: "Sorts by bookmark date",
        $shuffle: "Shuffles actors",
      }[this.sortBy] || "Missing description"
    );
  }

  sortBy = localStorage.getItem("pm_actorSortBy") || "relevance";
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

  favoritesOnly = localStorage.getItem("pm_actorFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_actorBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_actorRating") || "0");

  createActorWithName(name: string) {
    return new Promise<void>((resolve, reject) => {
      ApolloClient.mutate({
        mutation: gql`
          mutation($name: String!) {
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

  @Watch("createActorName", {})
  onCreateActorNameChange(newVal: number) {
    this.createActorErrors = [];
  }

  async addActor() {
    if (await this.checkActorExist(this.createActorName)) {
      this.createActorErrors = ["This actor already exists."];
      return;
    }

    this.addActorLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($name: String!, $aliases: [String!], $labels: [String!]) {
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
        this.refreshPage();
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

  async checkActorExist(name: string) {
    const result = await ApolloClient.query({
      query: gql`
        query($query: ActorSearchQuery!, $seed: String) {
          getActors(query: $query, seed: $seed) {
            items {
              name
            }
            numItems
          }
        }
      `,
      variables: {
        query: {
          query: name,
          sortBy: "relevance",
        },
        seed: localStorage.getItem("pm_seed") || "default",
      },
    });

    // Verify that the highest relevance ES result is an exact name match
    if (result.data.getActors.items.length > 0 && result.data.getActors.items[0].name === name) {
      return true;
    } else {
      return false;
    }
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
      return `${serverBase}/media/image/${actor.thumbnail._id}?password=${localStorage.getItem(
        "password"
      )}`;
    return "";
  }

  refreshed = true;

  resetPagination() {
    actorModule.resetPagination();
    this.refreshed = true;
    this.loadPage(this.page).catch(() => {
      this.refreshed = false;
    });
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    localStorage.setItem("pm_actorRating", newVal.toString());
    this.refreshed = false;
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_actorFavorite", "" + newVal);
    this.refreshed = false;
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_actorBookmark", "" + newVal);
    this.refreshed = false;
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_actorSortDir", newVal);
    this.refreshed = false;
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_actorSortBy", newVal);
    this.refreshed = false;
  }

  @Watch("countryFilter")
  onNationalityChange() {
    if (this.countryFilter) {
      localStorage.setItem("pm_actorNationality", this.countryFilter);
    } else {
      localStorage.removeItem("pm_actorNationality");
    }
    this.refreshed = false;
  }

  @Watch("selectedLabels")
  onLabelChange() {
    this.refreshed = false;
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    localStorage.setItem("pm_actorQuery", newVal || "");
    this.refreshed = false;
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
    let sortDir = this.sortDir;

    // Flip sort direction
    if (this.sortBy === "bornOn") {
      sortDir = sortDir === "desc" ? "asc" : "desc";
    }

    const result = await ApolloClient.query({
      query: gql`
        query($query: ActorSearchQuery!, $seed: String) {
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
          query: this.query || "",
          include: this.selectedLabels.include,
          exclude: this.selectedLabels.exclude,
          nationality: this.countryFilter || null,
          take,
          page: page - 1,
          sortDir,
          sortBy: random ? "$shuffle" : this.sortBy,
          favorite: this.favoritesOnly,
          bookmark: this.bookmarksOnly,
          rating: this.ratingFilter,
          custom: this.customFilter,
        },
        seed: seed || localStorage.getItem("pm_seed") || "default",
      },
    });

    return result.data.getActors;
  }

  refreshPage() {
    this.loadPage(actorModule.page);
  }

  loadPage(page: number) {
    this.fetchLoader = true;

    return this.fetchPage(page)
      .then((result) => {
        this.fetchError = false;
        actorModule.setPagination({
          numResults: result.numItems,
          numPages: result.numPages,
        });
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

  mounted() {
    if (!this.actors.length) this.refreshPage();
  }

  beforeMount() {
    ApolloClient.query({
      query: gql`
        {
          getLabels {
            _id
            name
            aliases
            color
          }
          getCustomFields {
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
          this.selectedLabels.include = [];
          this.selectedLabels.exclude = [];
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
</script>
