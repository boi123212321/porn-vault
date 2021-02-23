<template>
  <v-container fluid>
    <BindFavicon />
    <BindTitle value="Movies" />
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
          class="mb-2"
          hide-details
          clearable
          color="primary"
          :value="searchState.query"
          @input="searchStateManager.onValueChanged('query', $event)"
          label="Search query"
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

        <Divider icon="mdi-account">Actors</Divider>

        <ActorSelector
          :value="searchState.selectedActors"
          @input="searchStateManager.onValueChanged('selectedActors', $event)"
          :multiple="true"
        />

        <Divider icon="mdi-camera">Studio</Divider>

        <StudioSelector
          :value="searchState.selectedStudio"
          @input="searchStateManager.onValueChanged('selectedStudio', $event)"
          :multiple="false"
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
    <v-alert class="mb-3" v-if="skippedMoviesWarning" dense text dismissible type="warning"
      >These movies already exist and were skipped: <b>{{ skippedMoviesWarning }}</b></v-alert
    >

    <div class="text-center" v-if="fetchError">
      <div>There was an error</div>
      <v-btn class="mt-2" @click="loadPage">Try again</v-btn>
    </div>
    <div v-else>
      <div class="mb-2 d-flex align-center">
        <div class="mr-3">
          <span class="display-1 font-weight-bold mr-2">{{ fetchLoader ? "-" : numResults }}</span>
          <span class="title font-weight-regular">movies found</span>
        </div>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="openCreateDialog" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
          <span>Add movie</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" @click="bulkImportDialog = true" icon>
              <v-icon>mdi-file-import</v-icon>
            </v-btn>
          </template>
          <span>Bulk add movies</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" :loading="fetchingRandom" @click="getRandom" icon>
              <v-icon>mdi-shuffle-variant</v-icon>
            </v-btn>
          </template>
          <span>Get random movie</span>
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
          v-for="(movie, i) in movies"
          :key="movie._id"
          cols="6"
          sm="6"
          md="4"
          lg="3"
          xl="2"
        >
          <MovieCard
            :showLabels="showCardLabels"
            :movie="movie"
            style="height: 100%"
            v-model="movies[i]"
          />
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

    <v-dialog scrollable v-model="createMovieDialog" max-width="400px">
      <v-card :loading="addMovieLoader">
        <v-card-title>Add new movie</v-card-title>
        <v-card-text style="max-height: 90vh">
          <v-form v-model="validCreation">
            <v-text-field
              :rules="movieNameRules"
              :error-messages="movieNameErrors"
              color="primary"
              v-model="createMovieName"
              placeholder="Name"
            />
            <SceneSelector :multiple="true" class="mb-2" v-model="createMovieScenes" />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" :disabled="!validCreation" color="primary" @click="addMovie"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :persistent="bulkLoader" scrollable v-model="bulkImportDialog" max-width="400px">
      <v-card :loading="bulkLoader">
        <v-card-title>Bulk import movie names</v-card-title>

        <v-card-text style="max-height: 400px">
          <v-textarea
            color="primary"
            v-model="moviesBulkText"
            auto-grow
            :rows="3"
            placeholder="Movie names"
            persistent-hint
            hint="1 movie name per line"
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
            :disabled="!moviesBulkImport.length"
            >Add {{ moviesBulkImport.length }} movies</v-btn
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
import actorFragment from "@/fragments/actor";
import { contextModule } from "@/store/context";
import SceneSelector from "@/components/SceneSelector.vue";
import IActor from "@/types/actor";
import IScene from "@/types/scene";
import ILabel from "@/types/label";
import MovieCard from "@/components/Cards/Movie.vue";
import IMovie from "@/types/movie";
import movieFragment from "@/fragments/movie";
import DrawerMixin from "@/mixins/drawer";
import { mixins } from "vue-class-component";
import StudioSelector from "@/components/StudioSelector.vue";
import ActorSelector from "@/components/ActorSelector.vue";
import { checkMovieExist } from "../api/search";
import { SearchStateManager, isQueryDifferent } from "../util/searchState";
import { Route } from "vue-router";
import { Dictionary } from "vue-router/types/router";

@Component({
  components: {
    SceneSelector,
    MovieCard,
    StudioSelector,
    ActorSelector,
  },
})
export default class MovieList extends mixins(DrawerMixin) {
  get showSidenav() {
    return contextModule.showSidenav;
  }

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.searchState.sortBy === "$shuffle") this.loadPage();
    return seed;
  }

  movies = [] as IMovie[];

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
    selectedActors: IActor[];
    selectedStudio: { _id: string; name: string } | null;
    sortBy: string;
    sortDir: string;
  }>({
    localStorageNamer: (key: string) => `pm_movie${key[0].toUpperCase()}${key.substr(1)}`,
    props: {
      page: {
        default: () => 1,
      },
      query: true,
      favoritesOnly: true,
      bookmarksOnly: true,
      ratingFilter: { default: () => 0 },
      selectedActors: {
        default: () => [],
        serialize: (actors: IActor[]) =>
          JSON.stringify(
            actors.map((a) => ({
              _id: a._id,
              name: a.name,
              avatar: a.avatar,
              thumbnail: a.thumbnail,
            }))
          ),
      },
      selectedLabels: { default: () => ({ include: [], exclude: [] }) },
      selectedStudio: {
        serialize: (val: any) => (val ? JSON.stringify({ _id: val._id, name: val.name }) : ""),
      },
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

  moviesBulkText = "" as string | null;
  skippedMoviesWarning = null as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  async runBulkImport() {
    this.bulkLoader = true;

    let skippedMovies: string[] = [];
    this.skippedMoviesWarning = null;

    try {
      for (const name of this.moviesBulkImport) {
        if (await checkMovieExist(name)) {
          skippedMovies.push(name);
        } else {
          await this.createMovieWithName(name);
        }
      }
      this.loadPage();
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.moviesBulkText = "";
    this.bulkLoader = false;

    // triggers warning alert if any movies were skipped because they already existed
    if (skippedMovies.length) {
      this.skippedMoviesWarning = skippedMovies.join(", ");
    }
  }

  get moviesBulkImport() {
    if (this.moviesBulkText) return this.moviesBulkText.split("\n").filter(Boolean);
    return [];
  }

  allLabels = [] as ILabel[];

  get selectedActorIds() {
    return this.searchState.selectedActors.map((ac) => ac._id);
  }

  validCreation = false;
  createMovieDialog = false;
  createMovieName = "";
  createMovieScenes = [] as IScene[];
  addMovieLoader = false;

  movieNameRules = [(v) => (!!v && !!v.length) || "Invalid movie name"];
  movieNameErrors = [] as string[];

  @Watch("createMovieName", {})
  async onCreateMovieNameChange(newVal: string) {
    const existResult = await checkMovieExist(this.createMovieName);
    // Blocking error for name conflicts
    if (existResult) {
      this.movieNameErrors = ["This movie already exists."];
    } else {
      this.movieNameErrors = [];
    }
  }

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
        name: "movies",
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
      text: "Added to collection",
      value: "addedOn",
    },
    {
      text: "Rating",
      value: "rating",
    },
    {
      text: "Duration",
      value: "duration",
    },
    {
      text: "Bookmarked",
      value: "bookmark",
    },
    {
      text: "# scenes",
      value: "numScenes",
    },
    {
      text: "# actors",
      value: "numActors",
    },
    {
      text: "Random",
      value: "$shuffle",
    },
  ];

  openCreateDialog() {
    this.createMovieDialog = true;
    this.movieNameErrors = [];
  }

  createMovieWithName(name: string) {
    return new Promise((resolve, reject) => {
      ApolloClient.mutate({
        mutation: gql`
          mutation($name: String!) {
            addMovie(name: $name) {
              ...MovieFragment
              actors {
                ...ActorFragment
              }
              scenes {
                _id
              }
            }
          }
          ${movieFragment}
          ${actorFragment}
        `,
        variables: {
          name,
        },
      })
        .then((res) => {
          resolve(res.data.addMovie);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async addMovie() {
    this.addMovieLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($name: String!, $scenes: [String!]) {
          addMovie(name: $name, scenes: $scenes) {
            ...MovieFragment
            actors {
              ...ActorFragment
            }
            scenes {
              _id
            }
          }
        }
        ${movieFragment}
        ${actorFragment}
      `,
      variables: {
        name: this.createMovieName,
        scenes: this.createMovieScenes.map((a) => a._id),
      },
    })
      .then((res) => {
        this.loadPage();
        this.createMovieDialog = false;
        this.createMovieName = "";
        this.createMovieScenes = [];
      })
      .catch(() => {})
      .finally(() => {
        this.addMovieLoader = false;
      });
  }

  movieLabels(movie: any) {
    return movie.labels.map((l) => l.name).sort();
  }

  movieActorNames(movie: any) {
    return movie.actors.map((a) => a.name).join(", ");
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
        this.$router.push(`/movie/${result.items[0]._id}`);
      })
      .catch((err) => {
        this.fetchingRandom = false;
      });
  }

  async fetchPage(page: number, take = 24, random?: boolean, seed?: string) {
    const result = await ApolloClient.query({
      query: gql`
        query($query: MovieSearchQuery!, $seed: String) {
          getMovies(query: $query, seed: $seed) {
            items {
              ...MovieFragment
              actors {
                ...ActorFragment
              }
              scenes {
                _id
              }
            }
            numItems
            numPages
          }
        }
        ${movieFragment}
        ${actorFragment}
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
          rating: this.searchState.ratingFilter,
          studios: this.searchState.selectedStudio ? this.searchState.selectedStudio._id : null,
          actors: this.selectedActorIds,
        },
        seed: seed || localStorage.getItem("pm_seed") || "default",
      },
    });

    return result.data.getMovies;
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
        this.movies = result.items;
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
