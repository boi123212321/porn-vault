<template>
  <div>
    <v-autocomplete
      color="accent"
      v-model="innerValue"
      :loading="loading"
      :items="scenes"
      :search-input.sync="searchQuery"
      cache-items
      hide-no-data
      hint="Search for scenes by typing something"
      persistent-hint
      :label="multiple ? 'Select scenes' : 'Select scene'"
      :multiple="multiple"
      item-text="name"
      item-value="_id"
      clearable
      @change="onInnerValueChange"
    >
      <template v-slot:item="{ item }">
        <template>
          <v-list-item-avatar>
            <img :src="thumbnail(item)" />
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title v-html="item.name"></v-list-item-title>
          </v-list-item-content>
        </template>
      </template>
    </v-autocomplete>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import actorFragment from "../fragments/actor";
import sceneFragment from "../fragments/scene";
import IScene from "../types/scene";

@Component
export default class SceneSelector extends Vue {
  @Prop() value!: any;
  @Prop({ default: false }) multiple!: boolean;

  innerValue = this.value ? JSON.parse(JSON.stringify(this.value)) : null;

  scenes: IScene[] = this.value ? [this.value] : [];
  searchQuery = "";

  loading = false;
  resetTimeout = null as NodeJS.Timeout | null;

  @Watch("value", { deep: true })
  onValueChange(newVal: any) {
    this.innerValue = newVal;
  }

  onInnerValueChange(newVal: string) {
    this.$emit("input", this.scenes.find(a => a._id == newVal));
  }

  thumbnail(scene: IScene) {
    if (scene.thumbnail)
      return `${serverBase}/image/${
        scene.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return "";
  }

  @Watch("searchQuery")
  onSearch(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
    if (!this.searchQuery) return;

    this.resetTimeout = setTimeout(() => {
      this.loading = true;
      this.fetchPage(this.searchQuery);
    }, 500);
  }

  async fetchPage(searchQuery: string) {
    try {
      const query = `query:'${searchQuery || ""}'`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getScenes(query: $query) {
              ...SceneFragment
              actors {
                ...ActorFragment
              }
            }
          }
          ${sceneFragment}
          ${actorFragment}
        `,
        variables: {
          query
        }
      });

      this.loading = false;
      this.scenes.push(...result.data.getScenes);

      const ids = [...new Set(this.scenes.map(a => a._id))];

      this.scenes = ids
        .map(id => this.scenes.find(a => a._id == id))
        .filter(Boolean) as IScene[];
    } catch (err) {
      throw err;
    }
  }
}
</script>

<style lang="scss" scoped>
</style>