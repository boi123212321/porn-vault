<template>
  <v-row dense>
    <v-col :cols="cols" :sm="sm" :md="md" :lg="lg" :xl="xl" v-for="actor in value" :key="actor._id">
      <router-link :to="`/actor/${actor._id}`">
        <v-img style="border-radius: 8px" v-ripple height="100%" cover :src="thumbnail(actor)">
          <v-fade-transition>
            <div class="white--text py-1 bottom-bar text-center">
              <div class="font-weight-bold">{{ actor.name }}</div>
              <div v-if="sceneDate && actor.bornOn" class="text-center body-2">
                <div class="mr-1 d-inline-block font-weight-bold">{{ calculateAge(actor) }}</div>
                <div class="d-inline-block caption">y/o in this scene</div>
              </div>
            </div>
          </v-fade-transition>
        </v-img>
      </router-link>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import IActor from "../types/actor";
import { serverBase } from "../apollo";
import { contextModule } from "../store/context";
import moment from "moment";

@Component
export default class ActorGrid extends Vue {
  @Prop() value!: IActor[];
  @Prop() sceneDate?: number;
  @Prop({ default: 6 }) cols!: number;
  @Prop({ default: 6 }) sm!: number;
  @Prop({ default: 6 }) md!: number;
  @Prop({ default: 6 }) lg!: number;
  @Prop({ default: 6 }) xl!: number;

  calculateAge(actor: IActor) {
    if (actor.bornOn) {
      return moment(this.sceneDate).diff(actor.bornOn, "years");
    }
  }

  thumbnail(actor: IActor) {
    if (actor.thumbnail)
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return `${serverBase}/broken`;
  }
}
</script>

<style lang="scss" scoped>
.bottom-bar {
  left: 4px;
  right: 4px;
  border-radius: 8px;
  position: absolute;
  background: rgb(0, 0, 0, 0.75);
  bottom: 4px;
}
</style>
