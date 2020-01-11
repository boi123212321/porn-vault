<template>
  <div>
    <div class="mx-auto" style="max-width: 800px">
      <v-row>
        <v-col cols="12" sm="6">
          <QueueInfo />
          <v-card class="mb-3" style="border-radius: 10px">
            <v-card-title>
              <v-icon medium class="mr-2">mdi-counter</v-icon>Stats
            </v-card-title>
            <v-card-text>
              <div class="my-4">
                <span class="mr-2 d-inline-block display-1">{{ numScenes }}</span>
                <span class="subtitle-1">scenes</span>
              </div>
              <v-divider></v-divider>

              <div class="my-4">
                <span class="mr-2 d-inline-block display-1">{{ numActors }}</span>
                <span class="subtitle-1">actors</span>
              </div>
              <v-divider></v-divider>

              <div class="my-4">
                <span class="mr-2 d-inline-block display-1">{{ numMovies }}</span>
                <span class="subtitle-1">movies</span>
              </div>
              <v-divider></v-divider>

              <div class="my-4">
                <span class="mr-2 d-inline-block display-1">{{ numImages }}</span>
                <span class="subtitle-1">images</span>
              </div>
            </v-card-text>
          </v-card>

          <v-card v-if="scenesWithoutLabels.length" class="mb-3" style="border-radius: 10px">
            <v-card-title>
              <v-icon medium class="mr-2">mdi-account-alert</v-icon>Scenes without labels
            </v-card-title>
            <v-card-text>
              <div
                class="mb-2 d-flex align-center"
                v-for="scene in scenesWithoutLabels"
                :key="scene._id"
              >
                <router-link :to="`/scene/${scene._id}`">
                  <v-avatar color="grey" class="hover mr-2" size="80">
                    <v-img v-ripple :src="thumbnail(scene)"></v-img>
                  </v-avatar>
                </router-link>

                <div class="subtitle-1">{{ scene.name }}</div>
              </div>
            </v-card-text>
          </v-card>

          <v-card v-if="scenesWithoutActors.length" class="mb-3" style="border-radius: 10px">
            <v-card-title>
              <v-icon medium class="mr-2">mdi-account-alert</v-icon>Scenes without actors
            </v-card-title>
            <v-card-text>
              <div
                class="mb-2 d-flex align-center"
                v-for="scene in scenesWithoutActors"
                :key="scene._id"
              >
                <router-link :to="`/scene/${scene._id}`">
                  <v-avatar color="grey" class="hover mr-2" size="80">
                    <v-img v-ripple :src="thumbnail(scene)"></v-img>
                  </v-avatar>
                </router-link>

                <div class="subtitle-1">{{ scene.name }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6">
          <v-card class="mb-3" style="border-radius: 10px">
            <v-card-title>
              <v-icon medium class="mr-2">mdi-heart</v-icon>Your favorites
            </v-card-title>
            <v-card-text>
              <div class="mb-2 d-flex align-center" v-for="actor in topActors" :key="actor._id">
                <router-link :to="`/actor/${actor._id}`">
                  <v-avatar color="grey" class="hover mr-2" size="80">
                    <v-img v-ripple :src="thumbnail(actor)"></v-img>
                  </v-avatar>
                </router-link>

                <div class="subtitle-1">{{ actor.name }}</div>
              </div>
            </v-card-text>
          </v-card>

          <v-card v-if="actorsWithoutLabels.length" class="mb-3" style="border-radius: 10px">
            <v-card-title>
              <v-icon medium class="mr-2">mdi-account-alert</v-icon>Actors without labels
            </v-card-title>
            <v-card-text>
              <div
                class="mb-2 d-flex align-center"
                v-for="actor in actorsWithoutLabels"
                :key="actor._id"
              >
                <router-link :to="`/actor/${actor._id}`">
                  <v-avatar color="grey" class="hover mr-2" size="80">
                    <v-img v-ripple :src="thumbnail(actor)"></v-img>
                  </v-avatar>
                </router-link>

                <div class="subtitle-1">{{ actor.name }}</div>
              </div>
            </v-card-text>
          </v-card>

          <v-card v-if="actorsWithoutScenes.length" class="mb-3" style="border-radius: 10px">
            <v-card-title>
              <v-icon medium class="mr-2">mdi-account-alert</v-icon>Actors without scenes
            </v-card-title>
            <v-card-text>
              <div
                class="mb-2 d-flex align-center"
                v-for="actor in actorsWithoutScenes"
                :key="actor._id"
              >
                <router-link :to="`/actor/${actor._id}`">
                  <v-avatar color="grey" class="hover mr-2" size="80">
                    <v-img v-ripple :src="thumbnail(actor)"></v-img>
                  </v-avatar>
                </router-link>

                <div class="subtitle-1">{{ actor.name }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import actorFragment from "../fragments/actor";
import sceneFragment from "../fragments/scene";
import ActorCard from "../components/ActorCard.vue";
import IActor from "../types/actor";
import IScene from "../types/scene";
import QueueInfo from "../components/QueueInfo.vue";

@Component({
  components: {
    ActorCard,
    QueueInfo
  }
})
export default class Home extends Vue {
  numScenes = 0;
  numActors = 0;
  numMovies = 0;
  numImages = 0;

  topActors = [] as IActor[];
  actorsWithoutScenes = [] as IActor[];
  scenesWithoutActors = [] as IScene[];

  actorsWithoutLabels = [] as IActor[];
  scenesWithoutLabels = [] as IScene[];

  thumbnail(actor: IActor | IScene) {
    if (actor.thumbnail)
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return ``;
  }

  beforeMount() {
    ApolloClient.query({
      query: gql`
        {
          numScenes
          numActors
          numMovies
          numImages
        }
      `
    })
      .then(res => {
        this.numScenes = res.data.numScenes;
        this.numActors = res.data.numActors;
        this.numMovies = res.data.numMovies;
        this.numImages = res.data.numImages;
      })
      .catch(err => {
        console.error(err);
      });

    ApolloClient.query({
      query: gql`
        {
          topActors(num: 5) {
            ...ActorFragment
          }
          getActorsWithoutScenes(num: 5) {
            ...ActorFragment
          }
          getScenesWithoutActors(num: 5) {
            ...SceneFragment
          }
          getActorsWithoutLabels(num: 5) {
            ...ActorFragment
          }
          getScenesWithoutLabels(num: 5) {
            ...SceneFragment
          }
        }
        ${sceneFragment}
        ${actorFragment}
      `
    })
      .then(res => {
        this.topActors = res.data.topActors;

        this.actorsWithoutScenes = res.data.getActorsWithoutScenes;
        this.scenesWithoutActors = res.data.getScenesWithoutActors;

        this.actorsWithoutLabels = res.data.getActorsWithoutLabels;
        this.scenesWithoutLabels = res.data.getScenesWithoutLabels;
      })
      .catch(err => {
        console.error(err);
      });
  }
}
</script>
