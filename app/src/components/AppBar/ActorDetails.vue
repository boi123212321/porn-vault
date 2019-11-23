<template>
  <div v-if="currentActor" style="width:100%" class="d-flex align-center">
    <v-btn color="black" class="mr-1" icon @click="$router.go(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <v-toolbar-title class="mr-1 title">{{ currentActor.name }}</v-toolbar-title>

    <v-btn @click="favorite" class="mr-1" icon>
      <v-icon
        :color="currentActor.favorite ? 'red' : 'black'"
      >{{ currentActor.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
    </v-btn>

    <v-btn @click="bookmark" icon>
      <v-icon
        color="black"
      >{{ currentActor.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
    </v-btn>

    <v-spacer></v-spacer>

    <v-btn icon @click="openEditDialog">
      <v-icon color="black">mdi-pencil</v-icon>
    </v-btn>

    <v-btn @click="openRemoveDialog" icon>
      <v-icon color="black">mdi-delete-forever</v-icon>
    </v-btn>

    <v-dialog scrollable v-model="editDialog" max-width="400px">
      <v-card>
        <v-card-title>Edit '{{ currentActor.name }}'</v-card-title>
        <v-card-text style="max-height: 400px">
          <v-form v-model="validEdit">
            <v-text-field
              :rules="actorNameRules"
              color="accent"
              v-model="editName"
              placeholder="Name"
            />

            <v-combobox
              color="accent"
              multiple
              chips
              v-model="editAliases"
              placeholder="Alias names"
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            depressed
            @click="editActor"
            color="primary"
            class="black--text"
            :disabled="!validEdit"
          >Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card :loading="removeLoader">
        <v-card-title>Really delete '{{ currentActor.name }}'?</v-card-title>
        <v-card-text>Scene and images featuring {{ currentActor.name }} will stay in your collection.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="error" @click="remove">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { actorModule } from "../../store/actor";
import ApolloClient, { serverBase } from "../../apollo";
import gql from "graphql-tag";

@Component({
  components: {}
})
export default class App extends Vue {
  validEdit = false;
  editDialog = false;
  editName = "";
  editAliases = [] as string[];

  actorNameRules = [v => (!!v && !!v.length) || "Invalid actor name"];

  removeDialog = false;
  removeLoader = false;

  remove() {
    if (!this.currentActor) return;

    this.removeLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeActors(ids: $ids)
        }
      `,
      variables: {
        ids: [this.currentActor._id]
      }
    })
      .then(res => {
        this.removeDialog = false;
        this.$router.replace("/actors");
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

  editActor() {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            name
            aliases
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          name: this.editName,
          aliases: this.editAliases
        }
      }
    })
      .then(res => {
        actorModule.setName(this.editName);
        actorModule.setAliases(this.editAliases);
        this.editDialog = false;
      })
      .catch(err => {
        console.error(err);
      });
  }

  openEditDialog() {
    if (!this.currentActor) return;
    this.editName = this.currentActor.name;
    this.editAliases = this.currentActor.aliases;
    this.editDialog = true;
  }

  favorite() {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          favorite: !this.currentActor.favorite
        }
      }
    })
      .then(res => {
        actorModule.setFavorite(res.data.updateActors[0].favorite);
      })
      .catch(err => {
        console.error(err);
      });
  }

  bookmark() {
    if (!this.currentActor) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: ActorUpdateOpts!) {
          updateActors(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          bookmark: !this.currentActor.bookmark
        }
      }
    })
      .then(res => {
        actorModule.setBookmark(res.data.updateActors[0].bookmark);
      })
      .catch(err => {
        console.error(err);
      });
  }

  get currentActor() {
    return actorModule.current;
  }
}
</script>