<template>
  <div v-if="currentActor" style="width:100%" class="d-flex align-center">
    <v-btn class="mr-1" icon @click="$router.go(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <v-toolbar-title v-if="$vuetify.breakpoint.smAndUp" class="d-flex align-center mr-1 title">
      <Flag class="mr-1" v-if="currentActor.nationality" :value="currentActor.nationality.alpha2" />
      <div class="mr-1">{{ currentActor.name }}</div>
      <div class="subtitle-1 med--text" v-if="currentActor.bornOn">({{ age }})</div>
    </v-toolbar-title>

    <v-btn @click="favorite" class="mx-1" icon>
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
              color="primary"
              v-model="editName"
              placeholder="Name"
            />

            <v-textarea
              auto-grow
              color="primary"
              v-model="editDescription"
              placeholder="Actor description"
              :rows="2"
            />

            <DateInput v-if="editDialog" v-model="editBirthDate" />

            <v-combobox
              clearable
              color="primary"
              multiple
              chips
              v-model="editAliases"
              placeholder="Alias names"
            />

            <v-autocomplete
              v-model="editNationality"
              item-value="alpha2"
              item-text="name"
              placeholder="Nationality"
              :items="countries"
              clearable
            ></v-autocomplete>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="editActor"
            color="primary"
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
import IActor from "../../types/actor";
import moment from "moment";
import CustomFieldSelector from "../CustomFieldSelector.vue";
import countries from "../../util/countries";

@Component({
  components: {
    CustomFieldSelector
  }
})
export default class ActorToolbar extends Vue {
  validEdit = false;
  editDialog = false;
  editName = "";
  editAliases = [] as string[];
  editBirthDate = null as number | null;
  editDescription = "";
  editNationality = null as string | null;

  actorNameRules = [v => (!!v && !!v.length) || "Invalid actor name"];

  removeDialog = false;
  removeLoader = false;

  get countries() {
    return countries;
  }

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
            nationality {
              name
              alpha2
              nationality
            }
          }
        }
      `,
      variables: {
        ids: [this.currentActor._id],
        opts: {
          name: this.editName,
          description: this.editDescription,
          aliases: this.editAliases,
          bornOn: this.editBirthDate,
          nationality: this.editNationality
        }
      }
    })
      .then(res => {
        actorModule.setName(this.editName.trim());
        actorModule.setDescription(this.editDescription.trim());
        actorModule.setAliases(this.editAliases);
        actorModule.setBornOn(this.editBirthDate);
        actorModule.setNationality(res.data.updateActors[0].nationality);
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
    this.editDescription = this.currentActor.description || "";
    this.editNationality = this.currentActor.nationality
      ? this.currentActor.nationality.alpha2
      : null;
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
          bookmark: this.currentActor.bookmark ? null : Date.now()
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