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
        <h1 class="font-weight-light mr-3">Actors</h1>
        <v-btn @click="openCreateDialog" icon>
          <v-icon>mdi-plus</v-icon>
        </v-btn>
        <v-btn @click="bulkImportDialog = true" icon>
          <v-icon>mdi-file-import</v-icon>
        </v-btn>
      </div>
      <v-row>
        <v-col
          class="pa-1"
          v-for="(actor, i) in actors"
          :key="actor._id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          xl="2"
        >
          <actor-card v-model="actors[i]" style="height: 100%" />
        </v-col>
      </v-row>
    </div>

    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <v-dialog v-model="createActorDialog" max-width="400px">
      <v-card :loading="addActorLoader">
        <v-card-title>Add new actor/actress</v-card-title>
        <v-card-text>
          <v-form v-model="validCreation">
            <v-text-field
              :rules="actorNameRules"
              color="accent"
              v-model="createActorName"
              placeholder="Name"
            />

            <v-combobox
              color="accent"
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
          <v-btn @click="labelSelectorDialog = false" text color="accent" class="text-none">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :persistent="bulkLoader" scrollable v-model="bulkImportDialog" max-width="400px">
      <v-card :loading="bulkLoader">
        <v-card-title>Bulk import actor names</v-card-title>

        <v-card-text style="max-height: 400px">
          <v-textarea
            color="accent"
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
            color="accent"
            class="text-none"
            :disabled="!actorsBulkImport.length"
          >Add {{ actorsBulkImport.length }} actors</v-btn>
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
import ActorCard from "../components/ActorCard.vue";
import LabelSelector from "../components/LabelSelector.vue";
import actorFragment from "../fragments/actor";
import { contextModule } from "../store/context";
import InfiniteLoading from "vue-infinite-loading";
import IActor from "../types/actor";
import ILabel from "../types/label";

@Component({
  components: {
    ActorCard,
    LabelSelector,
    InfiniteLoading
  }
})
export default class SceneList extends Vue {
  actors = [] as IActor[];
  fetchLoader = false;

  actorsBulkText = "" as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  async runBulkImport() {
    this.bulkLoader = true;

    try {
      for (const name of this.actorsBulkImport) {
        await this.createActorWithName(name);
      }
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

  waiting = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[]; // TODO: try to retrieve from localStorage

  validCreation = false;
  createActorDialog = false;
  createActorName = "";
  createActorAliases = [] as string[];
  createSelectedLabels = [] as number[];
  labelSelectorDialog = false;
  addActorLoader = false;

  actorNameRules = [v => (!!v && !!v.length) || "Invalid actor name"];

  query = localStorage.getItem("pm_actorQuery") || "";
  page = 0;

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
    }
  ];

  favoritesOnly = localStorage.getItem("pm_actorFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_actorBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_actorRating") || "0");

  infiniteId = 0;
  resetTimeout = null as NodeJS.Timeout | null;

  get drawer() {
    return contextModule.showFilters;
  }

  set drawer(val: boolean) {
    contextModule.toggleFilters(val);
  }

  createActorWithName(name: string) {
    return new Promise((resolve, reject) => {
      ApolloClient.mutate({
        mutation: gql`
          mutation($name: String!) {
            addActor(name: $name) {
              ...ActorFragment
            }
          }
          ${actorFragment}
        `,
        variables: {
          name
        }
      })
        .then(res => {
          this.actors.unshift(res.data.addActor);
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
        this.actors.unshift(res.data.addActor);
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
    this.page = 0;
    this.actors = [];
    this.infiniteId++;
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_actorFavorite", "" + newVal);
    this.page = 0;
    this.actors = [];
    this.infiniteId++;
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_actorBookmark", "" + newVal);
    this.page = 0;
    this.actors = [];
    this.infiniteId++;
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_actorSortDir", newVal);
    this.page = 0;
    this.actors = [];
    this.infiniteId++;
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_actorSortBy", newVal);
    this.page = 0;
    this.actors = [];
    this.infiniteId++;
  }

  @Watch("selectedLabels")
  onLabelChange() {
    this.page = 0;
    this.actors = [];
    this.infiniteId++;
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_actorQuery", newVal || "");

    this.waiting = true;
    this.page = 0;
    this.actors = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.actors.push(...items);
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
            getActors(query: $query) {
              ...ActorFragment
            }
          }
          ${actorFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getActors;
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
    document.title = "Actors";
  }
}
</script>