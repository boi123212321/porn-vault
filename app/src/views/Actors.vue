<template>
  <v-container fluid>
    <BindTitle value="Actors" />
    <v-navigation-drawer v-if="showSidenav" style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-text-field
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

        <!-- <CustomFieldFilter :fields="fields" /> -->
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
            @click="addActor"
          >Add</v-btn>
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
          <v-spacer></v-spacer>
          <v-btn @click="labelSelectorDialog = false" text color="primary" class="text-none">OK</v-btn>
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
          >Add {{ actorsBulkImport.length }} actors</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "@/apollo";
import gql from "graphql-tag";
import ActorCard from "@/components/Cards/Actor.vue";
import LabelSelector from "@/components/LabelSelector.vue";
import actorFragment from "@/fragments/actor";
import { contextModule } from "@/store/context";
import InfiniteLoading from "vue-infinite-loading";
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
    InfiniteLoading,
    CustomFieldFilter
  }
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
  bulkImportDialog = false;
  bulkLoader = false;

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  async runBulkImport() {
    this.bulkLoader = true;

    try {
      for (const name of this.actorsBulkImport) {
        await this.createActorWithName(name);
      }
      this.refreshPage();
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.actorsBulkText = "";
    this.bulkLoader = false;
  }

  get actorsBulkImport() {
    if (this.actorsBulkText)
      return this.actorsBulkText.split("\n").filter(Boolean);
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
    include: this.tryReadLabelsFromLocalStorage("pm_actorInclude"),
    exclude: this.tryReadLabelsFromLocalStorage("pm_actorExclude")
  };

  onSelectedLabelsChange(val: any) {
    localStorage.setItem("pm_actorInclude", val.include.join(","));
    localStorage.setItem("pm_actorExclude", val.exclude.join(","));
    actorModule.resetPagination();
  }

  validCreation = false;
  createActorDialog = false;
  createActorName = "";
  createActorAliases = [] as string[];
  createSelectedLabels = [] as number[];
  labelSelectorDialog = false;
  addActorLoader = false;

  actorNameRules = [v => (!!v && !!v.length) || "Invalid actor name"];

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
      value: "asc"
    },
    {
      text: "Descending",
      value: "desc"
    }
  ];

  sortBy = localStorage.getItem("pm_actorSortBy") || "relevance";
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
      text: "# scenes",
      value: "numScenes"
    },
    {
      text: "Views",
      value: "numViews"
    },
    {
      text: "Age",
      value: "age"
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

  favoritesOnly = localStorage.getItem("pm_actorFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_actorBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_actorRating") || "0");

  resetTimeout = null as NodeJS.Timeout | null;

  createActorWithName(name: string) {
    return new Promise((resolve, reject) => {
      ApolloClient.mutate({
        mutation: gql`
          mutation($name: String!) {
            addActor(name: $name) {
              ...ActorFragment
              labels {
                _id
                name
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
          name
        }
      })
        .then(res => {
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  addActor() {
    this.addActorLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($name: String!, $aliases: [String!], $labels: [String!]) {
          addActor(name: $name, aliases: $aliases, labels: $labels) {
            ...ActorFragment
            labels {
              _id
              name
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
        labels: this.labelIDs(this.createSelectedLabels)
      }
    })
      .then(res => {
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

  labelIDs(indices: number[]) {
    return indices.map(i => this.allLabels[i]).map(l => l._id);
  }

  labelNames(indices: number[]) {
    return indices.map(i => this.allLabels[i].name);
  }

  openCreateDialog() {
    this.createActorDialog = true;
  }

  actorLabels(actor: any) {
    return actor.labels.map(l => l.name);
  }

  actorActorNames(actor: any) {
    return actor.actors.map(a => a.name).join(", ");
  }

  actorThumbnail(actor: any) {
    if (actor.thumbnail)
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    localStorage.setItem("pm_actorRating", newVal.toString());
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_actorFavorite", "" + newVal);
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_actorBookmark", "" + newVal);
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_actorSortDir", newVal);
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_actorSortBy", newVal);
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("countryFilter")
  onNationalityChange() {
    if (this.countryFilter) {
      localStorage.setItem("pm_actorNationality", this.countryFilter);
    } else {
      localStorage.removeItem("pm_actorNationality");
    }
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("selectedLabels")
  onLabelChange() {
    actorModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_actorQuery", newVal || "");

    this.waiting = true;
    actorModule.resetPagination();

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
        this.$router.push(`/actor/${result.items[0]._id}`);
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
        ""}' ${include} ${exclude} nationality:${this.countryFilter ||
        null} take:${take} page:${page - 1} sortDir:${this.sortDir} sortBy:${
        random ? "$shuffle" : this.sortBy
      } favorite:${this.favoritesOnly ? "true" : "false"} bookmark:${
        this.bookmarksOnly ? "true" : "false"
      } rating:${this.ratingFilter}`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String, $seed: String) {
            getActors(query: $query, seed: $seed) {
              items {
                ...ActorFragment
                labels {
                  _id
                  name
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
          query,
          seed: seed || localStorage.getItem("pm_seed") || "default"
        }
      });

      return result.data.getActors;
    } catch (err) {
      throw err;
    }
  }

  refreshPage() {
    this.loadPage(actorModule.page);
  }

  loadPage(page: number) {
    this.fetchLoader = true;

    this.fetchPage(page)
      .then(result => {
        this.fetchError = false;
        actorModule.setPagination({
          numResults: result.numItems,
          numPages: result.numPages
        });
        this.actors = result.items;
      })
      .catch(err => {
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
          getLabels(type: "actor") {
            _id
            name
            aliases
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
      `
    })
      .then(res => {
        this.fields = res.data.getCustomFields;
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
