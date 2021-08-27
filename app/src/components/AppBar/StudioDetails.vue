<template>
  <div style="width: 100%" v-if="currentStudio" class="d-flex align-center">
    <v-btn class="mr-1" icon @click="$router.go(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <v-toolbar-title v-if="$vuetify.breakpoint.smAndUp" class="mr-1 title">{{
      currentStudio.name
    }}</v-toolbar-title>

    <v-btn @click="favorite" class="mr-1" icon>
      <v-icon :color="currentStudio.favorite ? 'error' : undefined">{{
        currentStudio.favorite ? "mdi-heart" : "mdi-heart-outline"
      }}</v-icon>
    </v-btn>

    <v-btn @click="bookmark" icon>
      <v-icon>{{ currentStudio.bookmark !== null ? "mdi-bookmark-check" : "mdi-bookmark-outline" }}</v-icon>
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
        <v-card-title>Edit '{{ currentStudio.name }}'</v-card-title>
        <v-card-text style="max-height: 600px">
          <v-form v-model="validEdit">
            <v-text-field
              :rules="studioNameRules"
              color="primary"
              v-model="editName"
              placeholder="Name"
            />

            <v-textarea
              auto-grow
              color="primary"
              v-model="editDescription"
              placeholder="Studio description"
              :rows="2"
            />

            <v-text-field
              :rules="urlRules"
              color="primary"
              v-model="editUrl"
              placeholder="URL"
            />

            <v-combobox
              clearable
              color="primary"
              multiple
              chips
              v-model="editAliases"
              placeholder="Alias names"
            />

            <Divider icon="mdi-file-tree">Parent studio</Divider>
            <StudioSelector :ignore="currentStudio._id" v-model="editParent" />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-none" @click="editStudio" color="primary" :disabled="!validEdit"
            >Edit</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card :loading="removeLoader">
        <v-card-title>Really delete '{{ currentStudio.name }}'?</v-card-title>
        <v-card-text
          >Scenes, images and movies by {{ currentStudio.name }} will stay in your
          collection</v-card-text
        >
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
import ApolloClient from "../../apollo";
import gql from "graphql-tag";
import { studioModule } from "../../store/studio";
import StudioSelector from "../../components/StudioSelector.vue";
import studioFragment from "../../fragments/studio";

const urlExpression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
const urlRegex = new RegExp(urlExpression);

@Component({
  components: {
    StudioSelector,
  },
})
export default class StudioToolbar extends Vue {
  editDialog = false;
  validEdit = false;
  editName = "";
  editDescription = "";
  editUrl = "";
  editParent = null as any | null;
  editAliases = [] as string[];

  studioNameRules = [(v) => (!!v && !!v.length) || "Invalid studio name"];

  urlRules = [(url: string) => url.match(urlRegex) || "Invalid URL"];

  removeDialog = false;
  removeLoader = false;

  getDomainName(url: string) {
    return new URL(url).hostname.split(".").slice(0, -1).join(".");
  }

  remove() {
    if (!this.currentStudio) return;

    this.removeLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeStudios(ids: $ids)
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
      },
    })
      .then((res) => {
        this.removeDialog = false;
        this.$router.replace("/studios");
      })
      .catch((err) => {
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
    return new Promise((r) => setTimeout(r, ms));
  }

  async editStudio() {
    if (!this.currentStudio) return;

    await this.sleep(50);

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            _id
            aliases
            parent {
              _id
              name
            }
            substudios {
              ...StudioFragment
            }
          }
        }
        ${studioFragment}
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          name: this.editName,
          description: this.editDescription,
          url: this.editUrl,
          parent: this.editParent ? this.editParent._id : null,
          aliases: this.editAliases,
        },
      },
    })
      .then(res => {
        const { aliases, parent } = res.data.updateStudios[0];
        studioModule.setName(this.editName.trim());
        studioModule.setDescription(this.editDescription.trim());
        studioModule.setUrl(this.editUrl.trim());
        studioModule.setParent(parent);
        studioModule.setAliases(aliases);
        this.editDialog = false;
      })
      .catch((err) => {
        console.error(err);
      });
  }

  openEditDialog() {
    if (!this.currentStudio) return;

    this.editName = this.currentStudio.name;
    this.editDescription = this.currentStudio.description || "";
    this.editUrl = this.currentStudio.url || "";
    this.editDialog = true;
    this.editParent = this.currentStudio.parent;
    this.editAliases = this.currentStudio.aliases || [];
  }

  favorite() {
    if (!this.currentStudio) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          favorite: !this.currentStudio.favorite,
        },
      },
    }).then((res) => {
      studioModule.setFavorite(res.data.updateStudios[0].favorite);
    });
  }

  bookmark() {
    if (!this.currentStudio) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: StudioUpdateOpts!) {
          updateStudios(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.currentStudio._id],
        opts: {
          bookmark: this.currentStudio.bookmark ? null : Date.now(),
        },
      },
    }).then((res) => {
      studioModule.setBookmark(res.data.updateStudios[0].bookmark);
    });
  }

  get currentStudio() {
    return studioModule.current;
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