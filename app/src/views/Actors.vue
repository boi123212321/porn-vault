<template>
  <v-container>
    <v-layout row wrap v-if="$store.state.actors.items.length">
      
      <v-flex xs12 style="display: flex">
        <v-btn-toggle :value="true">
          <v-btn :value="true" flat @click="createDialog = true">
            <span>Add</span>
            <v-icon>add</v-icon>
          </v-btn>
        </v-btn-toggle>
        <v-spacer></v-spacer>
        <v-btn-toggle class="mr-2" v-model="filterDrawer">
          <v-btn :value="true" flat @click="filterDrawer = !filterDrawer"><span>Filter</span><v-icon>filter_list</v-icon></v-btn>
        </v-btn-toggle>
        <v-btn-toggle v-model="gridSize" mandatory>
          <v-btn flat :value="0">
            <v-icon>view_stream</v-icon>
          </v-btn>
          <v-btn flat :value="1">
            <v-icon>view_module</v-icon>
          </v-btn>
        </v-btn-toggle>
      </v-flex>

      <v-container fluid>
        <v-layout row wrap v-if="gridSize == 0">
          <v-flex
            xs12
            sm6
            md6
            lg4
            xl3
            style="max-height: 75vh"
            v-for="actor in items"
            :key="actor.id"
          >
            <Actor :actor="actor" v-on:open="expand(actor)"/>
          </v-flex>
        </v-layout>

        <v-layout row wrap v-if="gridSize == 1">
          <v-flex
            xs6
            sm3
            md3
            lg2
            xl1
            style="max-height: 75vh"
            v-for="actor in items"
            :key="actor.id"
          >
            <Actor :actor="actor" v-on:open="expand(actor)"/>
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
      <v-layout row wrap>
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

        <v-flex xs12 class="mt-2">
          <v-divider></v-divider>
          <v-subheader>Filter</v-subheader>
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
        </v-flex>
        <v-flex xs12 class="mt-3">
          Filter by rating
          <span v-for="i in 5" :key="i">
            <v-icon @click="setRatingFilter(i)" v-if="i > ratingFilter">star_border</v-icon>
            <v-icon color="amber" @click="setRatingFilter(i)" v-else>star</v-icon>
          </span>
        </v-flex>
        <v-flex xs12>
          <v-checkbox hide-details v-model="favoritesOnly" label="Show favorites only"></v-checkbox>
          <v-checkbox hide-details v-model="bookmarksOnly" label="Show bookmarks only"></v-checkbox>
        </v-flex>

        <v-flex class="mt-2" xs12 v-for="field in fieldFilters" :key="field.name">
          <CustomField :field="field" :value="field.value" v-on:change="setFieldFilterValue"/>
        </v-flex>
      </v-layout>
    </v-navigation-drawer>

    <v-dialog v-model="createDialog" max-width="600px">
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>Add actor</v-toolbar-title>
        </v-toolbar>
        <v-container>
          <v-layout row wrap align-center>
            <v-flex xs6 sm4>
              <v-subheader>Actor name</v-subheader>
            </v-flex>
            <v-text-field single-line v-model="creating.name" label="Enter a name"></v-text-field>
          </v-layout>
        </v-container>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="createDialog = false" flat>Cancel</v-btn>
          <v-btn @click="addActor" color="primary">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import Vue from "vue";
import Actor from "@/classes/actor";
import ActorComponent from "@/components/Actor.vue";
import { toTitleCase } from "@/util/string";
import Fuse from "fuse.js";
import { exportToDisk } from "@/util/library";
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

export default Vue.extend({
  components: {
    Actor: ActorComponent,
    CustomField: CustomFieldComponent
  },
  data() {
    return {
      createDialog: false,
      creating: {
        name: ""
      },
      sortModes: [
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
      ],
      fieldFilters: [] as FieldFilter[]
    };
  },
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
  },
  methods: {
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
    },

    setRatingFilter(i: number) {
      if (this.ratingFilter === i) {
        this.ratingFilter = 0;
      } else {
        this.ratingFilter = i;
      }
    },
    addActor() {
      let actor = Actor.create(toTitleCase(this.creating.name));

      let customFieldNames = this.$store.getters[
        "globals/getCustomFieldNames"
      ] as string[];

      customFieldNames.forEach(field => {
        actor.customFields[field] = null;
      });

      this.$store.commit("actors/add", actor);
      this.createDialog = false;

      exportToDisk();
    }
  },
  computed: {
    chosenSort: {
      get(): number {
        return this.$store.state.actors.search.chosenSort;
      },
      set(value: number) {
        this.$store.commit("actors/setSearchParam", {
          key: "chosenSort",
          value
        });
      }
    },
    ratingFilter: {
      get(): number {
        return this.$store.state.actors.search.ratingFilter;
      },
      set(value: number) {
        this.$store.commit("actors/setSearchParam", {
          key: "ratingFilter",
          value
        });
      }
    },
    bookmarksOnly: {
      get(): boolean {
        return this.$store.state.actors.search.bookmarksOnly;
      },
      set(value: boolean) {
        this.$store.commit("actors/setSearchParam", {
          key: "bookmarksOnly",
          value
        });
      }
    },
    favoritesOnly: {
      get(): boolean {
        return this.$store.state.actors.search.favoritesOnly;
      },
      set(value: boolean) {
        this.$store.commit("actors/setSearchParam", {
          key: "favoritesOnly",
          value
        });
      }
    },
    chosenLabels: {
      get(): string[] {
        return this.$store.state.actors.search.chosenLabels;
      },
      set(value: string[]) {
        this.$store.commit("actors/setSearchParam", {
          key: "chosenLabels",
          value
        });
      }
    },
    search: {
      get(): string {
        return this.$store.state.actors.search.search;
      },
      set(value: string) {
        this.$store.commit("actors/setSearchParam", {
          key: "search",
          value
        });
      }
    },
    gridSize: {
      get(): number {
        return this.$store.state.actors.search.gridSize;
      },
      set(value: number) {
        this.$store.commit("actors/setSearchParam", {
          key: "gridSize",
          value
        });
      }
    },
    filterDrawer: {
      get(): boolean {
        return this.$store.state.actors.search.filterDrawer;
      },
      set(value: boolean) {
        this.$store.commit("actors/setSearchParam", {
          key: "filterDrawer",
          value
        });
      }
    },

    labels(): string[] {
      return this.$store.getters["actors/getLabels"];
    },
    items(): Actor[] {
      let actors = JSON.parse(
        JSON.stringify(this.$store.state.actors.items)
      ) as any[];

      if (this.favoritesOnly) {
        actors = actors.filter(actor => actor.favorite);
      }

      if (this.bookmarksOnly) {
        actors = actors.filter(actor => actor.bookmark);
      }

      if (this.chosenLabels.length) {
        actors = actors.filter(actor =>
          this.chosenLabels.every((label: string) =>
            actor.labels.includes(label)
          )
        );
      }

      if (this.ratingFilter > 0) {
        actors = actors.filter(v => v.rating >= this.ratingFilter);
      }

      for (const field of JSON.parse(JSON.stringify(this.fieldFilters))) {
        if (field.value === null || field.mode === FilterMode.NONE) {
          continue;
        }

        if (field.type === CustomFieldType.STRING && field.value.length) {
          field.value = field.value.toLowerCase();

          if (field.mode === FilterMode.EQUALS) {
            actors = actors.filter(i => {
              let value = i.customFields[field.name];
              return value.toString().toLowerCase() == field.value;
            });
          } else if (field.mode === FilterMode.INCLUDES) {
            actors = actors.filter(i => {
              let value = i.customFields[field.name];
              return value
                .toString()
                .toLowerCase()
                .includes(field.value);
            });
          }
        } else if (field.type === CustomFieldType.NUMBER) {
          if (field.mode === FilterMode.EQUALS) {
            actors = actors.filter(i => {
              let value = i.customFields[field.name];
              return value == field.value;
            });
          } else if (field.mode == FilterMode.GREATER_THAN) {
            actors = actors.filter(i => {
              let value = i.customFields[field.name];
              return value > field.value;
            });
          } else if (field.mode == FilterMode.LESSER_THAN) {
            actors = actors.filter(i => {
              let value = i.customFields[field.name];
              return value < field.value;
            });
          }
        } 
        else if (field.type === CustomFieldType.BOOLEAN) {
          actors = actors.filter(i => {
            let value = i.customFields[field.name];
            return value == field.value;
          });
        }
        else if (field.type === CustomFieldType.SELECT && field.value) {
          if (Array.isArray(field.value))
            continue;
            
          actors = actors.filter(i => {
            let value = i.customFields[field.name];
            return value == field.value;
          });
        } else if (
          field.type === CustomFieldType.MULTI_SELECT &&
          field.value.length
        ) {
          if (field.mode === FilterMode.INCLUDES) {
            actors = actors.filter(i => {
              let values = (i.customFields[field.name] as unknown) as string[];
              return field.value.every((value: string) =>
                values.includes(value)
              );
            });
          } else if (field.mode === FilterMode.INCLUDES_SOME) {
            actors = actors.filter(i => {
              let values = (i.customFields[field.name] as unknown) as string[];
              return field.value.some((value: string) =>
                values.includes(value)
              );
            });
          }
        }
      }

      if (this.search && this.search.length) {
        var options = {
          shouldSort: true,
          threshold: 0.25,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1,
          keys: ["name", "labels", "aliases"]
        };
        var fuse = new Fuse(actors, options); // "list" is the item array
        actors = fuse.search(this.search);
      }

      switch (this.chosenSort) {
        case 0:
          actors.sort((a, b) => b.addedOn - a.addedOn);
          break;
        case 1:
          actors.sort((a, b) => a.addedOn - b.addedOn);
          break;
        case 2:
          actors.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 3:
          actors.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 4:
          actors.sort((a, b) => b.rating - a.rating);
          break;
        case 5:
          actors.sort((a, b) => a.rating - b.rating);
          break;
        case 6:
          actors.forEach(actor => {
            actor["watches"] = this.$store.getters["videos/getActorWatches"](
              actor.id
            );
          });

          actors.sort((a, b) => b.watches.length - a.watches.length);
          break;
        case 7:
          actors.forEach(actor => {
            actor["watches"] = this.$store.getters["videos/getActorWatches"](
              actor.id
            );
          });

          actors.sort((a, b) => a.watches.length - b.watches.length);
          break;
      }

      return actors as Actor[];
    }
  }
});
</script>

<style>
</style>
