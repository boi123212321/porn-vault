<template>
  <div v-if="collabs.length">
    <div>
      <v-btn class="mr-2" icon @click="showCollabs=!showCollabs">
        <v-icon>{{ showCollabs ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </v-btn>

      <span class="font-weight-black subtitle-1">{{ firstName(name) }}</span> has appeared alongside:
    </div>
    <v-expand-transition>
      <v-row v-if="showCollabs">
        <v-col
          v-for="actor in collabs"
          :key="actor._id"
          cols="6"
          sm="4"
          md="2"
          lg="2"
          xl="1"
          class="text-center"
        >
          <router-link :to="`/actor/${actor._id}`">
            <v-avatar style="border: 2px solid white" v-ripple size="100">
              <v-img :src="collabAvatar(actor)"></v-img>
            </v-avatar>
          </router-link>
          <div class="mt-2 body-2 font-weight-bold">{{ actor.name }}</div>
        </v-col>
      </v-row>
    </v-expand-transition>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop } from "vue-property-decorator";
import { ICollabActor } from "../types/actor";
import { serverBase } from "../apollo";

@Component
export default class Collabs extends Vue {
  @Prop(String) name!: string;
  @Prop() collabs!: ICollabActor[];

  showCollabs = false;

  firstName(name: string) {
    const tokens = name.split(" ");
    if (tokens[0].toLowerCase() == "little") return tokens[1];
    if (tokens.length <= 3) return tokens[0];
  }

  collabAvatar(actor: ICollabActor) {
    if (actor.avatar) {
      return `${serverBase}/image/${
        actor.avatar._id
      }?password=${localStorage.getItem("password")}`;
    }
    if (actor.thumbnail) {
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    }
    return `${serverBase}/broken`;
  }
}
</script>
