<template>
  <div style="width:100%" v-if="currentScene" class="d-flex align-center">
    <v-btn class="mr-1" icon @click="$router.go(-1)">
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
    <v-toolbar-title v-if="$vuetify.breakpoint.smAndUp" class="mr-1 title">{{ currentScene.name }}</v-toolbar-title>

    <v-menu v-if="currentScene.path || currentScene.streamLinks.length">
      <template v-slot:activator="{ on }">
        <v-btn v-on="on" class="mr-1" icon>
          <v-icon>mdi-play</v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-item v-ripple @click="watch(currentSceneURL)" v-if="currentScene.path">
          <v-list-item-title>Local copy</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-for="link in currentScene.streamLinks"
          :key="link"
          v-ripple
          @click="watch(link)"
        >
          <v-list-item-title>{{ getDomainName(link) }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <v-btn @click="favorite" class="mr-1" icon>
      <v-icon
        :color="currentScene.favorite ? 'error' : undefined"
      >{{ currentScene.favorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
    </v-btn>

    <v-btn @click="bookmark" icon>
      <v-icon>{{ currentScene.bookmark ? 'mdi-bookmark-check' : 'mdi-bookmark-outline' }}</v-icon>
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
        <v-card-title>Edit '{{ currentScene.name }}'</v-card-title>
        <v-card-text style="max-height: 600px">
          <v-form v-model="validEdit">
            <v-text-field
              :rules="sceneNameRules"
              color="accent"
              v-model="editName"
              placeholder="Name"
            />

            <DateInput v-if="editDialog" v-model="editReleaseDate" />

            <v-textarea
              auto-grow
              color="accent"
              v-model="editDescription"
              placeholder="Scene description"
              :rows="2"
            />

            <ActorSelector v-model="editActors" />

            <StudioSelector v-model="editStudio" />

            <v-textarea
              auto-grow
              color="accent"
              v-model="editStreamLinks"
              placeholder="Streaming links (per line)"
              :rows="2"
            />
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            class="text-none"
            @click="editScene"
            color="accent"
            :disabled="!validEdit"
          >Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="removeDialog" max-width="400px">
      <v-card :loading="removeLoader">
        <v-card-title>Really delete '{{ currentScene.name }}'?</v-card-title>
        <v-card-text>
          <v-checkbox color="error" v-model="deleteImages" label="Delete images as well"></v-checkbox>
        </v-card-text>
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
import { sceneModule } from "../../store/scene";
import ApolloClient, { serverBase } from "../../apollo";
import gql from "graphql-tag";
import ActorSelector from "../ActorSelector.vue";
import IActor from "../../types/actor";
import StudioSelector from "../../components/StudioSelector.vue";
import IScene from "../../types/scene";
import DateInput from "../DateInput.vue";

@Component({
  components: {
    ActorSelector,
    StudioSelector,
    DateInput
  }
})
export default class SceneToolbar extends Vue {
  editDialog = false;
  validEdit = false;
  editName = "";
  editDescription = "";
  editStreamLinks = null as string | null;
  editActors = [] as IActor[];
  editStudio = null as any;
  editReleaseDate = null as number | null;

  sceneNameRules = [v => (!!v && !!v.length) || "Invalid scene name"];

  removeDialog = false;
  deleteImages = false;
  removeLoader = false;

  watch(url: string) {
    if (!this.currentScene) return;

    var win = window.open(url, "_blank");
    if (win) win.focus();

    ApolloClient.mutate({
      mutation: gql`
        mutation($id: String!) {
          watchScene(id: $id) {
            watches
          }
        }
      `,
      variables: {
        id: this.currentScene._id
      }
    })
      .then(res => {
        sceneModule.pushWatch(res.data.watchScene.watches.pop());
      })
      .catch(err => {
        console.error(err);
      });
  }

  getDomainName(url: string) {
    return new URL(url).hostname
      .split(".")
      .slice(0, -1)
      .join(".");
  }

  remove() {
    if (!this.currentScene) return;

    this.removeLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $deleteImages: Boolean) {
          removeScenes(ids: $ids, deleteImages: $deleteImages)
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        deleteImages: this.deleteImages
      }
    })
      .then(res => {
        this.removeDialog = false;
        this.$router.replace("/scenes");
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

  editScene() {
    if (!this.currentScene) return;

    const streamLinks = (this.editStreamLinks || "")
      .split("\n")
      .filter(Boolean);

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            _id
            labels {
              _id
              name
            }
            studio {
              _id
              name
              thumbnail {
                _id
              }
            }
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          name: this.editName,
          description: this.editDescription,
          streamLinks,
          actors: this.editActors.map(a => a._id),
          studio: this.editStudio ? this.editStudio._id : null,
          releaseDate: this.editReleaseDate
        }
      }
    })
      .then(res => {
        sceneModule.setName(this.editName.trim());
        sceneModule.setDescription(this.editDescription.trim());
        sceneModule.setStreamLinks(streamLinks);
        sceneModule.setActors(this.editActors);
        sceneModule.setStudio(res.data.updateScenes[0].studio);
        sceneModule.setReleaseDate(this.editReleaseDate);
        sceneModule.setLabels(res.data.updateScenes[0].labels);
        this.editDialog = false;
      })
      .catch(err => {
        console.error(err);
      });
  }

  openEditDialog() {
    if (!this.currentScene) return;

    this.editName = this.currentScene.name;
    this.editDescription = this.currentScene.description || "";
    this.editStreamLinks = this.currentScene.streamLinks.join("\n");
    this.editActors = JSON.parse(JSON.stringify(this.currentScene.actors));
    this.editDialog = true;
    this.editStudio = this.currentScene.studio;
    this.editReleaseDate = this.currentScene.releaseDate;
  }

  favorite() {
    if (!this.currentScene) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          favorite: !this.currentScene.favorite
        }
      }
    }).then(res => {
      sceneModule.setFavorite(res.data.updateScenes[0].favorite);
    });
  }

  bookmark() {
    if (!this.currentScene) return;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.currentScene._id],
        opts: {
          bookmark: !this.currentScene.bookmark
        }
      }
    }).then(res => {
      sceneModule.setBookmark(res.data.updateScenes[0].bookmark);
    });
  }

  get currentScene() {
    return sceneModule.current;
  }

  get currentSceneURL() {
    if (this.currentScene)
      return `${serverBase}/scene/${
        this.currentScene._id
      }?password=${localStorage.getItem("password")}`;
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