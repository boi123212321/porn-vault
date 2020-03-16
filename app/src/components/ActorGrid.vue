<template>
  <v-row dense>
    <v-col :cols="cols" :sm="sm" :md="md" :lg="lg" :xl="xl" v-for="actor in value" :key="actor._id">
      <v-hover>
        <template v-slot:default="{ hover }">
          <v-img style="border-radius: 8px" height="100%" cover :src="thumbnail(actor)">
            <v-fade-transition>
              <v-overlay v-if="hover" absolute color="primary">
                <v-btn
                  :to="`/actor/${actor._id}`"
                  class="text-none black--text primary"
                  depressed
                >{{ actor.name }}</v-btn>
              </v-overlay>
            </v-fade-transition>
          </v-img>
        </template>
      </v-hover>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import IActor from "../types/actor";
import { serverBase } from "../apollo";
import { contextModule } from "../store/context";

@Component
export default class ActorGrid extends Vue {
  @Prop() value!: IActor[];
  @Prop({ default: 6 }) cols!: number;
  @Prop({ default: 6 }) sm!: number;
  @Prop({ default: 6 }) md!: number;
  @Prop({ default: 6 }) lg!: number;
  @Prop({ default: 6 }) xl!: number;

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
</style>