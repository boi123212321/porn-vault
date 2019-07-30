<template>
  <v-container>
    <v-layout wrap>
      <input accept="video/*" type="file" multiple id="file-input-videos" style="display: none" />

      <v-flex xs12 style="display: flex">
        <v-btn text @click="openFileInput">
          <span>Add</span>
          <v-icon>mdi-add</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn-toggle v-if="$store.state.videos.items.length" class="mr-2" v-model="filterDrawer">
          <v-btn :value="true" text @click="filterDrawer = !filterDrawer">
            <span>Filter</span>
            <v-icon>mdi-filter-variant</v-icon>
          </v-btn>
        </v-btn-toggle>
        <v-btn-toggle v-if="$store.state.videos.items.length" v-model="gridSize" mandatory>
          <v-btn text :value="0">
            <v-icon>mdi-view-stream</v-icon>
          </v-btn>
          <v-btn text :value="1">
            <v-icon>mdi-view-module</v-icon>
          </v-btn>
        </v-btn-toggle>
      </v-flex>
    </v-layout>

    <v-layout wrap v-if="$store.state.videos.items.length">
      <v-container fluid>
        <v-layout wrap v-if="gridSize == 0">
          <v-flex
            xs12
            sm6
            md6
            lg4
            xl3
            style="max-height: 75vh"
            v-for="video in items"
            :key="video.id"
          >
            <Video :video="video"></Video>
          </v-flex>
        </v-layout>

        <v-layout wrap v-if="gridSize == 1">
          <v-flex
            xs6
            sm3
            md3
            lg2
            xl1
            style="max-height: 75vh"
            v-for="video in items"
            :key="video.id"
          >
            <Video :video="video"></Video>
          </v-flex>
        </v-layout>
      </v-container>
    </v-layout>

    <v-navigation-drawer
      class="px-3 pt-1"
      v-model="filterDrawer"
      app
      right
      clipped
      :permanent="filterDrawer"
      disable-resize-watcher
      hide-overlay
      clearable
    >
      <v-layout wrap>
        <v-flex xs12>
          <v-text-field v-model="search" single-line label="Search..." clearable></v-text-field>
        </v-flex>

        <v-flex xs12 class="mt-3">
          <v-divider></v-divider>
          <v-subheader>Sort</v-subheader>
          <v-select
            :items="sortModes"
            single-line
            v-model="chosenSort"
            item-text="name"
            item-value="value"
          ></v-select>
        </v-flex>

        <v-flex xs12>
          <v-divider></v-divider>
          <v-subheader>Filter</v-subheader>
          <v-autocomplete
            v-model="chosenActors"
            :items="$store.state.actors.items"
            chips
            label="Select actor(s)"
            item-text="name"
            item-value="id"
            multiple
            clearable
            hide-details
            single-line
          >
            <template v-slot:selection="data">
              <v-chip pill>
                <v-avatar left>
                  <img :src="$store.getters['images/idToPath'](data.item.thumbnails[0])" />
                </v-avatar>
                {{ data.item.name }}
              </v-chip>
            </template>
            <template v-slot:item="data">
              <template v-if="typeof data.item !== 'object'">
                <v-list-item-content v-text="data.item"></v-list-item-content>
              </template>
              <template v-else>
                <v-list-item-avatar>
                  <img :src="$store.getters['images/idToPath'](data.item.thumbnails[0])" />
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title v-html="data.item.name"></v-list-item-title>
                  <v-list-item-subtitle v-html="data.item.group"></v-list-item-subtitle>
                </v-list-item-content>
              </template>
            </template>
          </v-autocomplete>
        </v-flex>
        <v-flex xs12 class="mt-2">
          <v-autocomplete
            clearable
            v-model="chosenLabels"
            multiple
            chips
            hide-details
            single-line
            :items="labels"
            label="Select labels..."
          ></v-autocomplete>
          {{ chosenLabels }}
        </v-flex>
        <v-flex xs12 class="mt-3">
          Filter by rating
          <v-rating
            background-color="grey"
            color="amber"
            dense
            :value="ratingFilter"
            @input="setRatingFilter($event)"
            clearable
          ></v-rating>
        </v-flex>
        <v-flex xs12>
          <v-checkbox hide-details v-model="favoritesOnly" label="Show favorites only"></v-checkbox>
          <v-checkbox hide-details v-model="bookmarksOnly" label="Show bookmarks only"></v-checkbox>
        </v-flex>

        <v-flex class="mt-2" xs12 v-for="field in fieldFilters" :key="field.name">
          <CustomField :field="field" :value="field.value" v-on:change="setFieldFilterValue" />
        </v-flex>
      </v-layout>
    </v-navigation-drawer>

    <VideoImporter ref="video-importer" />
  </v-container>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import Image from "@/classes/image";
import VideoComponent from "@/components/Video.vue";
import Video from "@/classes/video";
import Fuse from "fuse.js";
import fs from "fs";
import path from "path";
import { takeScreenshots } from "@/util/thumbnails";
import VideoImporter from "@/components/VideoImporter.vue";
import { toTitleCase } from "@/util/string";
import { exportToDisk } from "../util/library";
import CustomField, { CustomFieldType } from "@/classes/custom_field";
import CustomFieldComponent from "@/components/CustomField.vue";

enum FilterMode {
  NONE,
  EQUALS,
  INCLUDES,
  GREATER_THAN,
  LESSER_THAN,
  INCLUDES_SOME
}

type FieldFilter = {
  name: string;
  values: string[] | null;
  type: CustomFieldType;
  mode: FilterMode;
  value: string | number | boolean | null | string[];
};

@Component({
  components: {
    Video: VideoComponent,
    VideoImporter,
    CustomField: CustomFieldComponent
  }
})
export default class Videos extends Vue {
  $refs!: {
    "video-importer": VideoImporter;
  };

  current = null as Video | null;
  visible = false;

  sortModes = [
    {
      name: "Date added (newest)",
      value: 0
    },
    {
      name: "Date added (oldest)",
      value: 1
    },
    {
      name: "Name - A to Z",
      value: 2
    },
    {
      name: "Name - Z to A",
      value: 3
    },
    {
      name: "Highest rated",
      value: 4
    },
    {
      name: "Lowest rated",
      value: 5
    },
    {
      name: "Most viewed",
      value: 6
    },
    {
      name: "Least viewed",
      value: 7
    }
  ];

  fieldFilters = [] as FieldFilter[];

  mounted() {
    this.fieldFilters = (<CustomField[]>this.$store.state.globals.customFields)
      .slice()
      .map(field => {
        return {
          name: field.name,
          values: field.values,
          type: field.type,
          mode: FilterMode.NONE,
          value: field.type >= 3 ? [] : null
        };
      }) as FieldFilter[];
  }

  setFieldFilterValue({
    key,
    value,
    mode
  }: {
    key: string;
    value: string;
    mode: FilterMode;
  }) {
    let field = (<FieldFilter[]>this.fieldFilters).find(f => f.name == key);

    field.value = value;
    field.mode = mode;
  }

  setRatingFilter(i: number) {
    if (this.ratingFilter === i) {
      this.ratingFilter = 0;
    } else {
      this.ratingFilter = i;
    }
  }

  // Removes actor from filter, not library
  removeActor(id: string) {
    this.chosenActors = this.chosenActors.filter(
      (actor: string) => actor != id
    );
  }

  openFileInput() {
    let el = document.getElementById(`file-input-videos`) as any;

    el.addEventListener("change", async (ev: Event) => {
      let fileArray = Array.from(el.files) as File[];

      // Ignore already added videos
      fileArray = fileArray.filter(
        file => !this.$store.getters["videos/getByPath"](file.path)
      );

      if (fileArray.length) {
        let files = fileArray.map(file => {
          return {
            name: toTitleCase(file.name),
            path: file.path,
            size: file.size
          };
        }) as { name: string; path: string; size: number }[];

        this.$refs["video-importer"].push(files);

        el.value = "";
      }
    });
    el.click();
  }

  get chosenSort(): number {
    return this.$store.state.videos.search.chosenSort;
  }

  set chosenSort(value: number) {
    this.$store.commit("videos/setSearchParam", {
      key: "chosenSort",
      value
    });
  }

  get ratingFilter(): number {
    return this.$store.state.videos.search.ratingFilter;
  }

  set ratingFilter(value: number) {
    this.$store.commit("videos/setSearchParam", {
      key: "ratingFilter",
      value
    });
  }

  get bookmarksOnly(): boolean {
    return this.$store.state.videos.search.bookmarksOnly;
  }

  set bookmarksOnly(value: boolean) {
    this.$store.commit("videos/setSearchParam", {
      key: "bookmarksOnly",
      value
    });
  }

  get favoritesOnly(): boolean {
    return this.$store.state.videos.search.favoritesOnly;
  }

  set favoritesOnly(value: boolean) {
    this.$store.commit("videos/setSearchParam", {
      key: "favoritesOnly",
      value
    });
  }

  get chosenActors(): string[] {
    return this.$store.state.videos.search.chosenActors;
  }

  set chosenActors(value: string[]) {
    this.$store.commit("videos/setSearchParam", {
      key: "chosenActors",
      value
    });
  }

  get chosenLabels(): string[] {
    return this.$store.state.videos.search.chosenLabels;
  }

  set chosenLabels(value: string[]) {
    this.$store.commit("videos/setSearchParam", {
      key: "chosenLabels",
      value
    });
  }

  get search(): string {
    return this.$store.state.videos.search.search;
  }

  set search(value: string) {
    this.$store.commit("videos/setSearchParam", {
      key: "search",
      value
    });
  }

  get gridSize(): number {
    return this.$store.state.videos.search.gridSize;
  }

  set gridSize(value: number) {
    this.$store.commit("videos/setSearchParam", {
      key: "gridSize",
      value
    });
  }

  get filterDrawer(): boolean {
    return this.$store.state.videos.search.filterDrawer;
  }

  set filterDrawer(value: boolean) {
    this.$store.commit("videos/setSearchParam", {
      key: "filterDrawer",
      value
    });
  }

  get labels(): string[] {
    return this.$store.getters["videos/getLabels"];
  }

  get items(): Video[] {
    let videos = JSON.parse(
      JSON.stringify(this.$store.state.videos.items)
    ) as any[];

    if (this.favoritesOnly) {
      videos = videos.filter(video => video.favorite);
    }

    if (this.bookmarksOnly) {
      videos = videos.filter(video => video.bookmark);
    }

    if (this.chosenLabels.length) {
      videos = videos.filter(video =>
        this.chosenLabels.every((label: string) => video.labels.includes(label))
      );
    }

    if (this.chosenActors.length) {
      videos = videos.filter(video =>
        this.chosenActors.every((actor: string) => video.actors.includes(actor))
      );
    }

    if (this.ratingFilter > 0) {
      videos = videos.filter(v => v.rating >= this.ratingFilter);
    }

    for (const field of JSON.parse(JSON.stringify(this.fieldFilters))) {
      if (field.value === null || field.mode === FilterMode.NONE) {
        continue;
      }

      if (field.type === CustomFieldType.STRING && field.value.length) {
        field.value = field.value.toLowerCase();

        if (field.mode === FilterMode.EQUALS) {
          videos = videos.filter(i => {
            let value = i.customFields[field.name];
            return value.toString().toLowerCase() == field.value;
          });
        } else if (field.mode === FilterMode.INCLUDES) {
          videos = videos.filter(i => {
            let value = i.customFields[field.name];
            return value
              .toString()
              .toLowerCase()
              .includes(field.value);
          });
        }
      } else if (field.type === CustomFieldType.NUMBER) {
        if (field.mode === FilterMode.EQUALS) {
          videos = videos.filter(i => {
            let value = i.customFields[field.name];
            return value == field.value;
          });
        } else if (field.mode == FilterMode.GREATER_THAN) {
          videos = videos.filter(i => {
            let value = i.customFields[field.name];
            return value > field.value;
          });
        } else if (field.mode == FilterMode.LESSER_THAN) {
          videos = videos.filter(i => {
            let value = i.customFields[field.name];
            return value < field.value;
          });
        }
      } else if (field.type === CustomFieldType.BOOLEAN) {
        videos = videos.filter(i => {
          let value = i.customFields[field.name];
          return value == field.value;
        });
      } else if (field.type === CustomFieldType.SELECT && field.value) {
        if (Array.isArray(field.value)) continue;

        videos = videos.filter(i => {
          let value = i.customFields[field.name];
          return value == field.value;
        });
      } else if (
        field.type === CustomFieldType.MULTI_SELECT &&
        field.value.length
      ) {
        if (field.mode === FilterMode.INCLUDES) {
          videos = videos.filter(i => {
            let values = (i.customFields[field.name] as unknown) as string[];
            return field.value.every((value: string) => values.includes(value));
          });
        } else if (field.mode === FilterMode.INCLUDES_SOME) {
          videos = videos.filter(i => {
            let values = (i.customFields[field.name] as unknown) as string[];
            return field.value.some((value: string) => values.includes(value));
          });
        }
      }
    }

    videos.forEach(video => {
      video.actors = video.actors.map((id: string) => {
        return this.$store.getters["actors/getById"](id);
      });
    });

    if (this.search && this.search.length) {
      var options = {
        shouldSort: true,
        threshold: 0.25,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ["title", "labels", "actors.name"]
      };
      var fuse = new Fuse(videos, options); // "list" is the item array
      videos = fuse.search(this.search);
    }

    switch (this.chosenSort) {
      case 0:
        videos.sort((a, b) => b.addedOn - a.addedOn);
        break;
      case 1:
        videos.sort((a, b) => a.addedOn - b.addedOn);
        break;
      case 2:
        videos.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 3:
        videos.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 4:
        videos.sort((a, b) => b.rating - a.rating);
        break;
      case 5:
        videos.sort((a, b) => a.rating - b.rating);
        break;
      case 6:
        videos.sort((a, b) => b.watches.length - a.watches.length);
        break;
      case 7:
        videos.sort((a, b) => a.watches.length - b.watches.length);
        break;
    }

    return videos as Video[];
  }
}
</script>

<style>
</style>
