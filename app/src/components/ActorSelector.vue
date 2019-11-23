<template>
  <v-card outlined>
    <v-card-title>Select actors</v-card-title>
    <v-card-text>
      <v-subheader v-if="value.length">Selected actors</v-subheader>
      <v-list v-for="(actor, i) in value" :key="'selected-' + actor._id">
        <v-list-item @click="value.splice(i, 1)">
          <v-list-item-icon>
            <v-avatar color="grey">
              <v-img :src="thumbnail(actor)"></v-img>
            </v-avatar>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ actor.name }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <v-text-field
        placeholder="Search for actors"
        color="accent"
        @input="onQueryChange"
        v-model="searchQuery"
        :loading="waiting"
      ></v-text-field>
      <v-list v-for="actor in notSelectedActors" :key="actor._id">
        <v-list-item @click="select(actor)">
          <v-list-item-icon>
            <v-avatar>
              <v-img :src="thumbnail(actor)"></v-img>
            </v-avatar>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ actor.name }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import actorFragment from "../fragments/actor";
import IActor from "../types/actor";

@Component
export default class ActorSelector extends Vue {
  @Prop() value!: IActor[];

  actors: IActor[] = [];
  searchQuery = "";

  waiting = false;
  resetTimeout = null as NodeJS.Timeout | null;

  @Watch("selectedActors", { deep: true })
  onSelectionChange(newVal: IActor[]) {
    this.$emit("input", newVal);
  }

  get notSelectedActors() {
    const ids = this.value.map(a => a._id);
    return this.actors.filter(a => !ids.includes(a._id));
  }

  select(actor: IActor) {
    if (!this.value.find(a => a._id == actor._id)) {
      this.$emit("input", this.value.concat(actor));
    }
  }

  thumbnail(actor: IActor) {
    if (actor.thumbnail)
      return `${serverBase}/image/${
        actor.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  async fetchPage() {
    try {
      const query = `query:'${this.searchQuery || ""}'`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getActors(query: $query) {
              ...ActorFragment
            }
          }
          ${actorFragment}
        `,
        variables: {
          query
        }
      });

      this.actors = result.data.getActors;
    } catch (err) {
      throw err;
    }
  }

  onQueryChange() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
    if (!this.searchQuery) return;

    this.waiting = true;
    this.actors = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.fetchPage();
    }, 500);
  }
}
</script>

<style lang="scss" scoped>
</style>