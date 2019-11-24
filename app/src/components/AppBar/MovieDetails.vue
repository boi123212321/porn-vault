<template>
  <div style="width:100%" v-if="currentMovie" class="d-flex align-center">
    <v-btn class="mr-1" icon @click="$router.go(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <v-toolbar-title class="mr-1 title">{{ currentMovie.name }}</v-toolbar-title>

    <v-btn @click="favorite" class="mr-1" icon>
      <v-icon
        :color="currentMovie.favorite ? 'error' : undefined"
      >{{ currentMovie.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
    </v-btn>

    <v-btn @click="bookmark" icon>
      <v-icon>{{ currentMovie.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
    </v-btn>

    <v-spacer></v-spacer>

    <v-btn icon @click="openEditDialog">
      <v-icon>mdi-pencil</v-icon>
    </v-btn>

    <v-btn @click="openRemoveDialog" icon>
      <v-icon>mdi-delete-forever</v-icon>
    </v-btn>

    <v-dialog v-model="editDialog" max-width="600px">
      <v-card>
        <v-form v-model="validEdit">
          <v-card-title>Edit '{{ currentMovie.name }}'</v-card-title>
          <v-card-text style="max-width: 600px">
            <v-text-field
              color="accent"
              :rules="movieNameRules"
              v-model="editName"
              placeholder="Movie name"
            />
            <v-textarea
              auto-grow
              :rows="2"
              color="accent"
              v-model="editDescription"
              placeholder="Movie description"
            />
            <SceneSelector :multiple="true" v-model="editScenes" />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="accent"
              class="text-none"
              text
              :disabled="!validEdit"
              @click="editMovie"
            >Edit</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card :loading="removeLoader">
        <v-card-title>Really delete '{{ currentMovie.name }}'?</v-card-title>
        <v-card-text>Images of {{ currentMovie.name }} will stay in your collection.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn class="text-none" text color="error" @click="remove">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { movieModule } from "../../store/movie";
import ApolloClient, { serverBase } from "../../apollo";
import gql from "graphql-tag";
import SceneSelector from "../SceneSelector.vue";
import IActor from "../../types/actor";
import IScene from "../../types/scene";
import actorFragment from "../../fragments/actor";
import sceneFragment from "../../fragments/scene";
import movieFragment from "../../fragments/movie";

@Component({
  components: {
    SceneSelector
  }
})
export default class MovieToolbar extends Vue {
  editDialog = false;
  validEdit = false;
  editName = "";
  editDescription = "";
  editScenes = [] as IScene[];

  movieNameRules = [v => (!!v && !!v.length) || "Invalid movie name"];

  removeDialog = false;
  removeLoader = false;

  editMovie() {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
            ...MovieFragment
            scenes {
              ...SceneFragment
              actors {
                ...ActorFragment
              }
            }
            actors {
              ...ActorFragment
            }
          }
        }
        ${movieFragment}
        ${sceneFragment}
        ${actorFragment}
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          name: this.editName,
          description: this.editDescription,
          scenes: this.editScenes.map(a => a._id)
        }
      }
    })
      .then(res => {
        movieModule.setName(this.editName);
        movieModule.setDescription(this.editDescription);
        movieModule.setActors(res.data.updateMovies[0].actors);
        movieModule.setScenes(res.data.updateMovies[0].scenes);
        movieModule.setDuration(res.data.updateMovies[0].duration);
        movieModule.setSize(res.data.updateMovies[0].size);
        this.editDialog = false;
      })
      .catch(err => {
        console.error(err);
      });
  }

  openEditDialog() {
    if (!this.currentMovie) return;

    this.editName = this.currentMovie.name;
    this.editDescription = this.currentMovie.description || "";
    this.editScenes = JSON.parse(JSON.stringify(this.currentMovie.scenes));
    this.editDialog = true;
  }

  remove() {
    if (!this.currentMovie) return;

    this.removeLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeMovies(ids: $ids)
        }
      `,
      variables: {
        ids: [this.currentMovie._id]
      }
    })
      .then(res => {
        this.removeDialog = false;
        this.$router.replace("/movies");
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        this.removeLoader = false;
      });
  }

  openRemoveDialog() {
    this.removeDialog = true;
  }

  favorite() {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          favorite: !this.currentMovie.favorite
        }
      }
    }).then(res => {
      movieModule.setFavorite(res.data.updateMovies[0].favorite);
    });
  }

  bookmark() {
    if (!this.currentMovie) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: MovieUpdateOpts!) {
          updateMovies(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.currentMovie._id],
        opts: {
          bookmark: !this.currentMovie.bookmark
        }
      }
    }).then(res => {
      movieModule.setBookmark(res.data.updateMovies[0].bookmark);
    });
  }

  get currentMovie() {
    return movieModule.current;
  }
}
</script>