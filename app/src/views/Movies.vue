<template>
  <v-container fluid>
    <BindTitle value="Movies" />
    <v-navigation-drawer v-if="showSidenav" style="z-index: 14" v-model="drawer" clipped app>
      <v-container>
        <v-text-field
          solo
          flat
          single-line
          class="mb-2"
          hide-details
          clearable
          color="primary"
          v-model="query"
          label="Search query"
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
        @input="loadPage"
        v-model="page"
        :total-visible="7"
        :disabled="fetchLoader"
        :length="numPages"
      ></v-pagination>
    </div>

    <v-dialog scrollable v-model="createMovieDialog" max-width="400px">
      <v-card :loading="addMovieLoader">
        <v-card-title>Add new movie</v-card-title>
        <v-card-text style="max-height: 90vh">
          <v-form v-model="validCreation">
            <v-text-field
              :rules="movieNameRules"
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
          <v-btn
            text
            class="text-none"
            :disabled="!validCreation"
            color="primary"
            @click="addMovie"
          >Add</v-btn>
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
          >Add {{ moviesBulkImport.length }} movies</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import actorFragment from "../fragments/actor";
import { contextModule } from "../store/context";
import InfiniteLoading from "vue-infinite-loading";
import SceneSelector from "../components/SceneSelector.vue";
import IScene from "../types/scene";
import IActor from "../types/actor";
import ILabel from "../types/label";
import MovieCard from "../components/MovieCard.vue";
import IMovie from "../types/movie";
import movieFragment from "../fragments/movie";
import DrawerMixin from "../mixins/drawer";
import { mixins } from "vue-class-component";
import { movieModule } from "../store/movie";

@Component({
  components: {
    InfiniteLoading,
    SceneSelector,
    MovieCard
  }
})
export default class MovieList extends mixins(DrawerMixin) {
  get showSidenav() {
    return contextModule.showSidenav;
  }

  rerollSeed() {
    const seed = Math.random().toString(36);
    localStorage.setItem("pm_seed", seed);
    if (this.sortBy === "$shuffle") this.loadPage(this.page);
    return seed;
  }

  movies = [] as IMovie[];

  fetchLoader = false;
  fetchError = false;
  fetchingRandom = false;

  moviesBulkText = "" as string | null;
  bulkImportDialog = false;
  bulkLoader = false;

  get showCardLabels() {
    return contextModule.showCardLabels;
  }

  async runBulkImport() {
    this.bulkLoader = true;

    try {
      for (const name of this.moviesBulkImport) {
        await this.createMovieWithName(name);
      }
      this.refreshPage();
      this.bulkImportDialog = false;
    } catch (error) {
      console.error(error);
    }

    this.moviesBulkText = "";
    this.bulkLoader = false;
  }

  get moviesBulkImport() {
    if (this.moviesBulkText)
      return this.moviesBulkText.split("\n").filter(Boolean);
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
    include: this.tryReadLabelsFromLocalStorage("pm_movieInclude"),
    exclude: this.tryReadLabelsFromLocalStorage("pm_movieExclude")
  };

  onSelectedLabelsChange(val: any) {
    localStorage.setItem("pm_movieInclude", val.include.join(","));
    localStorage.setItem("pm_movieExclude", val.exclude.join(","));
    movieModule.resetPagination();
  }

  validCreation = false;
  createMovieDialog = false;
  createMovieName = "";
  createMovieScenes = [] as IScene[];
  addMovieLoader = false;

  movieNameRules = [v => (!!v && !!v.length) || "Invalid movie name"];

  query = localStorage.getItem("pm_movieQuery") || "";

  set page(page: number) {
    movieModule.setPage(page);
  }

  get page() {
    return movieModule.page;
  }

  get numResults() {
    return movieModule.numResults;
  }

  get numPages() {
    return movieModule.numPages;
  }

  sortDir = localStorage.getItem("pm_movieSortDir") || "desc";
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

  sortBy = localStorage.getItem("pm_movieSortBy") || "relevance";
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
      text: "Duration",
      value: "duration"
    },
    {
      text: "Bookmarked",
      value: "bookmark"
    },
    {
      text: "# scenes",
      value: "numScenes"
    },
    {
      text: "Random",
      value: "$shuffle"
    }
  ];

  favoritesOnly = localStorage.getItem("pm_movieFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_movieBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_movieRating") || "0");

  resetTimeout = null as NodeJS.Timeout | null;

  openCreateDialog() {
    this.createMovieDialog = true;
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
          name
        }
      })
        .then(res => {
          resolve(res.data.addMovie);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  addMovie() {
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
        scenes: this.createMovieScenes.map(a => a._id)
      }
    })
      .then(res => {
        this.refreshPage();
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
    return movie.labels.map(l => l.name).sort();
  }

  movieActorNames(movie: any) {
    return movie.actors.map(a => a.name).join(", ");
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    localStorage.setItem("pm_movieRating", newVal.toString());
    movieModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_movieFavorite", "" + newVal);
    movieModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_movieBookmark", "" + newVal);
    movieModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_movieSortDir", newVal);
    movieModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_movieSortBy", newVal);
    movieModule.resetPagination();
    this.loadPage(this.page);
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_movieQuery", newVal || "");

    this.waiting = true;
    movieModule.resetPagination();

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.loadPage(this.page);
    }, 500);
  }

  @Watch("selectedLabels")
  onLabelChange() {
    movieModule.resetPagination();
    this.loadPage(this.page);
  }

  getRandom() {
    this.fetchingRandom = true;
    this.fetchPage(1, 1, true, Math.random().toString())
      .then(result => {
        // @ts-ignore
        this.$router.push(`/movie/${result.items[0]._id}`);
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
          query,
          seed: seed || localStorage.getItem("pm_seed") || "default"
        }
      });

      return result.data.getMovies;
    } catch (err) {
      throw err;
    }
  }

  loadPage(page: number) {
    this.fetchLoader = true;

    this.fetchPage(page)
      .then(result => {
        this.fetchError = false;
        movieModule.setPagination({
          numResults: result.numItems,
          numPages: result.numPages
        });
        this.movies = result.items;
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
    this.loadPage(movieModule.page);
  }

  mounted() {
    if (!this.movies.length) this.refreshPage();
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