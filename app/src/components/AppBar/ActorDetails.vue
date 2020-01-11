<template>
  <div v-if="currentActor" style="width:100%" class="d-flex align-center">
    <v-btn class="mr-1" icon @click="$router.go(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <v-toolbar-title v-if="$vuetify.breakpoint.smAndUp" class="mr-1 title">
      {{ currentActor.name }}
      <span
        class="subtitle-1 med--text"
        v-if="currentActor.bornOn"
      >({{ age }})</span>
    </v-toolbar-title>

    <v-btn @click="favorite" class="mr-1" icon>
      <v-icon
        :color="currentActor.favorite ? 'error' : undefined"
      >{{ currentActor.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
    </v-btn>

    <v-btn @click="bookmark" icon>
      <v-icon>{{ currentActor.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
    </v-btn>

    <v-spacer></v-spacer>

    <v-btn icon @click="openEditDialog">
      <v-icon>mdi-pencil</v-icon>
    </v-btn>

    <v-btn @click="openRemoveDialog" icon>
      <v-icon>mdi-delete-forever</v-icon>
    </v-btn>

    <v-dialog scrollable v-model="editDialog" max-width="600px">
      <v-card>
        <v-card-title>Edit '{{ currentActor.name }}'</v-card-title>
        <v-card-text style="max-height: 600px">
          <v-form v-model="validEdit">
            <v-text-field
              :rules="actorNameRules"
              color="accent"
              v-model="editName"
              placeholder="Name"
            />

            <DateInput v-if="editDialog" v-model="editBirthDate" />

            <v-combobox
              clearable
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
            text
            @click="editActor"
            color="accent"
            class="text-none"
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
          <v-btn class="text-none" text color="error" @click="remove">Delete</v-btn>
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
import DateInput from "../DateInput.vue";
import IActor from "../../types/actor";
import moment from "moment";
import CustomFieldSelector from "../CustomFieldSelector.vue";

@Component({
  components: {
    DateInput,
    CustomFieldSelector
  }
})
export default class ActorToolbar extends Vue {
  validEdit = false;
  editDialog = false;
  editName = "";
  editAliases = [] as string[];
  editBirthDate = null as number | null;

  actorNameRules = [v => (!!v && !!v.length) || "Invalid actor name"];

  removeDialog = false;
  removeLoader = false;

  get age() {
    if (this.currentActor && this.currentActor.bornOn) {
      return moment().diff(this.currentActor.bornOn, "years");
    }
    return -1;
  }

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

  async sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  async editActor() {
    if (!this.currentActor) return;

    await this.sleep(50);

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
          aliases: this.editAliases,
          bornOn: this.editBirthDate
        }
      }
    })
      .then(res => {
        actorModule.setName(this.editName);
        actorModule.setAliases(this.editAliases);
        actorModule.setBornOn(this.editBirthDate);
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
    this.editBirthDate = this.currentActor.bornOn;
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

  mounted() {
    /* window.addEventListener("keydown", ev => {
      if (ev.keyCode === 70) {
        this.favorite();
      } else if (ev.keyCode === 66) {
        this.bookmark();
      }
    }); */
  }
}
</script>