<template>
  <v-container>
    <div color="primary" class="mb-3 text-xs-center">
      <v-btn large @click="openFileInput">
        <v-icon left>add</v-icon>Add images
      </v-btn>
    </div>
    <input accept="image/*" type="file" multiple id="file-input-images" style="display: none">

    <v-layout row wrap align-center>
      <v-flex xs12>
        <v-checkbox hide-details v-model="filterDrawer" label="Advanced options"></v-checkbox>
      </v-flex>

      <v-flex xs12>
        <v-subheader>Grid size</v-subheader>
        <v-btn-toggle v-model="gridSize" mandatory>
          <v-btn flat :value="0">Big</v-btn>
          <v-btn flat :value="1">Small</v-btn>
        </v-btn-toggle>
      </v-flex>

      <v-container fluid>
        <v-layout row wrap align-center v-if="gridSize == 0">
          <v-flex
            xs12
            sm6
            md6
            lg4
            xl3
            v-for="(image, i) in items"
            style="max-height: 75vh"
            :key="image.id"
          >
            <v-img :src="image.path" v-ripple @click="currentImage = i"></v-img>
          </v-flex>
        </v-layout>

        <v-layout row wrap align-center v-if="gridSize == 1">
          <v-flex
            xs6
            sm3
            md3
            lg2
            xl1
            v-for="(image, i) in items"
            style="max-height: 75vh"
            :key="image.id"
          >
            <v-img :src="image.path" v-ripple @click="currentImage = i"></v-img>
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
    >
      <v-layout row wrap>
        <v-flex xs12>
          <v-text-field v-model="search" single-line label="Search..." clearable></v-text-field>
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
              <v-chip
                :selected="data.selected"
                close
                class="chip--select-multi"
                @input="removeActor(data.item.id)"
              >
                <v-avatar>
                  <img :src="$store.getters['images/idToPath'](data.item.thumbnails[0])">
                </v-avatar>
                {{ data.item.name }}
              </v-chip>
            </template>
            <template v-slot:item="data">
              <template v-if="typeof data.item !== 'object'">
                <v-list-tile-content v-text="data.item"></v-list-tile-content>
              </template>
              <template v-else>
                <v-list-tile-avatar>
                  <img :src="$store.getters['images/idToPath'](data.item.thumbnails[0])">
                </v-list-tile-avatar>
                <v-list-tile-content>
                  <v-list-tile-title v-html="data.item.name"></v-list-tile-title>
                  <v-list-tile-sub-title v-html="data.item.group"></v-list-tile-sub-title>
                </v-list-tile-content>
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
      </v-layout>
    </v-navigation-drawer>

    <transition name="fade">
      <div class="lightbox fill" v-if="currentImage > -1" @click="currentImage = -1">
        <div class="topbar">
          <v-spacer></v-spacer>
          <v-btn @click.stop="showImageDetails = !showImageDetails" class="thumb-btn" icon>
            <v-icon>info_outline</v-icon>
          </v-btn>
        </div>

        <div
          style="display: flex; flex-direction: column; height: 100%; position: absolute; left: 0; top: 0; width: 100%"
        >
          <div style="position: relative; width: 100%; height: 100%;">
            <img @click.stop class="image" :src="items[currentImage].path">

            <v-btn v-if="currentImage > 0" icon class="thumb-btn left" @click.stop="currentImage--">
              <v-icon color="white">chevron_left</v-icon>
            </v-btn>
            <v-btn
              v-if="currentImage < items.length - 1"
              icon
              class="thumb-btn right"
              @click.stop="currentImage++"
            >
              <v-icon color="white">chevron_right</v-icon>
            </v-btn>
          </div>

          <v-sheet style="align-self: flex-end; width: 100%" @click.stop v-if="showImageDetails">
            <div class="topbar">
              <v-spacer></v-spacer>
            </div>
            <v-sheet
              color="primary"
              style="display: flex"
              class="px-2 mb-1 headline font-weight-light"
            >
              <v-btn icon @click="favorite">
                <v-icon>{{ items[currentImage].favorite ? 'favorite' : 'favorite_border' }}</v-icon>
              </v-btn>
              <v-btn icon @click="bookmark">
                <v-icon>{{ items[currentImage].bookmark ? 'bookmark' : 'bookmark_border' }}</v-icon>
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn icon @click="removeImage">
                <v-icon>delete_forever</v-icon>
              </v-btn>
            </v-sheet>

            <div class="pa-3">
              <p class="sec--text">{{ items[currentImage].path }}</p>

              <div class="mb-2">
                <span v-for="i in 5" :key="i">
                  <v-icon @click="rateImage(i)" v-if="i > items[currentImage].rating">star_border</v-icon>
                  <v-icon color="amber" @click="rateImage(i)" v-else>star</v-icon>
                </span>
              </div>

              <div class="mb-2">
                <v-chip
                  small
                  v-for="label in items[currentImage].labels.slice().sort()"
                  :key="label"
                >{{ label }}</v-chip>
                <v-chip small @click color="primary white--text">+ Add</v-chip>
              </div>
            </div>
          </v-sheet>
        </div>
      </div>
    </transition>
  </v-container>
</template>

<script lang="ts">
import Vue from "vue";
import Image from "@/classes/image";
import Actor from "@/classes/actor";
import path from "path";
import fs from "fs";
import Fuse from "fuse.js";
import { hash, randomString } from "@/util/generator";
import ActorComponent from "@/components/Actor.vue";

export default Vue.extend({
  components: {
    Actor: ActorComponent
  },
  data() {
    return {
      currentImage: -1,
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
        }
      ],

      showImageDetails: false
    };
  },
  methods: {
    removeImage() {
      let item = this.items[this.currentImage];

      fs.unlinkSync(item.path);
      this.$store.commit("images/remove", item.id);

      if (item.video) {
        this.$store.commit("videos/removeThumbnailById", {
          id: item.video,
          image: item.id
        });
      }

      this.currentImage = -1;
    },
    setRatingFilter(i: number) {
      if (this.ratingFilter === i) {
        this.ratingFilter = 0;
      } else {
        this.ratingFilter = i;
      }
    },
    favorite() {
      this.$store.commit("images/favorite", this.items[this.currentImage].id);
    },
    bookmark() {
      this.$store.commit("images/bookmark", this.items[this.currentImage].id);
    },
    rateImage(rating: number) {
      this.$store.commit("images/rate", {
        id: this.items[this.currentImage].id,
        rating
      });
    },
    removeActor(id: string) {
      this.chosenActors = this.chosenActors.filter((actor: string) => actor != id);
    },
    openFileInput() {
      let el = document.getElementById(`file-input-images`) as any;

      el.addEventListener("change", (ev: Event) => {
        let fileArray = Array.from(el.files) as File[];
        let files = fileArray.map(file => {
          return {
            name: file.name,
            path: file.path,
            size: file.size
          };
        }) as { name: string; path: string; size: number }[];

        if (this.$store.state.globals.settings.copyThumbnails) {
          if (!fs.existsSync(path.resolve(process.cwd(), "library/images/"))) {
            fs.mkdirSync(path.resolve(process.cwd(), "library/images/"));
          }

          files.forEach(file => {
            let p = file.path;
            let imagePath = path.resolve(
              process.cwd(),
              "library/images/",
              `image-${hash()}${path.extname(p)}`
            );
            fs.copyFileSync(p, imagePath);
            file.path = imagePath;
          });
        }

        let images = files.map(file => Image.create(file));

        let customFieldNames = this.$store.getters[
          "globals/getCustomFieldNames"
        ] as string[];

        images.forEach(image => {
          customFieldNames.forEach(field => {
            image.customFields[field] = null;
          });
        });

        this.$store.commit("images/add", images);

        el.value = "";
      });
      el.click();
    }
  },
  computed: {
    chosenSort: {
      get(): number {
        return this.$store.state.images.search.chosenSort;
      },
      set(value: number) {
        this.$store.commit("images/setSearchParam", {
          key: "chosenSort",
          value
        });
      }
    },
    ratingFilter: {
      get(): number {
        return this.$store.state.images.search.ratingFilter;
      },
      set(value: number) {
        this.$store.commit("images/setSearchParam", {
          key: "ratingFilter",
          value
        });
      }
    },
    bookmarksOnly: {
      get(): boolean {
        return this.$store.state.images.search.bookmarksOnly;
      },
      set(value: boolean) {
        this.$store.commit("images/setSearchParam", {
          key: "bookmarksOnly",
          value
        });
      }
    },
    favoritesOnly: {
      get(): boolean {
        return this.$store.state.images.search.favoritesOnly;
      },
      set(value: boolean) {
        this.$store.commit("images/setSearchParam", {
          key: "favoritesOnly",
          value
        });
      }
    },
    chosenActors: {
      get(): string[] {
        return this.$store.state.images.search.chosenActors;
      },
      set(value: string[]) {
        this.$store.commit("images/setSearchParam", {
          key: "chosenActors",
          value
        });
      }
    },
    chosenLabels: {
      get(): string[] {
        return this.$store.state.images.search.chosenLabels;
      },
      set(value: string[]) {
        this.$store.commit("images/setSearchParam", {
          key: "chosenLabels",
          value
        });
      }
    },
    search: {
      get(): string {
        return this.$store.state.images.search.search;
      },
      set(value: string) {
        this.$store.commit("images/setSearchParam", {
          key: "search",
          value
        });
      }
    },
    gridSize: {
      get(): number {
        return this.$store.state.images.search.gridSize;
      },
      set(value: number) {
        this.$store.commit("images/setSearchParam", {
          key: "gridSize",
          value
        });
      }
    },
    filterDrawer: {
      get(): boolean {
        return this.$store.state.images.search.filterDrawer;
      },
      set(value: boolean) {
        this.$store.commit("images/setSearchParam", {
          key: "filterDrawer",
          value
        });
      }
    },

    actors(): Actor[] {
      return this.items[this.currentImage].actors.map((id: string) => {
        return this.$store.state.actors.items.find((a: Actor) => a.id == id);
      });
    },
    labels(): string[] {
      return this.$store.getters["images/getLabels"];
    },
    items() {
      let images = JSON.parse(JSON.stringify(this.$store.state.images.items)) as Image[];

      if (this.favoritesOnly) {
        images = images.filter(image => image.favorite);
      }

      if (this.bookmarksOnly) {
        images = images.filter(image => image.bookmark);
      }

      if (this.chosenLabels.length) {
        images = images.filter(image =>
          this.chosenLabels.every((label: string) => image.labels.includes(label))
        );
      }

      if (this.chosenActors.length) {
        images = images.filter(image =>
          this.chosenActors.every((actor: string) => image.actors.includes(actor))
        );
      }

      if (this.ratingFilter > 0) {
        images = images.filter(i => i.rating >= this.ratingFilter);
      }

      images.forEach(image => {
        image.actors = image.actors.map((id: string) => {
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
          keys: ["name", "path", "labels", "actors.name"],
        };
        var fuse = new Fuse(images, options);
        images = fuse.search(this.search);
      }

      switch (this.chosenSort) {
        case 0:
          images.sort((a, b) => b.addedOn - a.addedOn);
          break;
        case 1:
          images.sort((a, b) => a.addedOn - b.addedOn);
          break;
        case 2:
          images.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 3:
          images.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 4:
          images.sort((a, b) => b.rating - a.rating);
          break;
        case 5:
          images.sort((a, b) => a.rating - b.rating);
          break;
      }

      return images;
    }
  }
});
</script>

<style lang="scss" scoped>
.topbar {
  position: absolute;
  width: 100%;
  top: 0;
  left: 0;
  display: flex;
}

.thumb-btn {
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;

  &.left {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
  }

  &.right {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
  }
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);

  .image {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-width: calc(100% - 150px);
    max-height: calc(100% - 20px);
  }
}
</style>
