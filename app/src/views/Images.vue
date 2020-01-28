<template>
  <v-container fluid>
    <BindTitle value="Images" />
    <v-banner app sticky v-if="selectedImages.length">
      {{ selectedImages.length }} images selected
      <template v-slot:actions>
        <v-btn text @click="selectedImages = []" class="text-none">Deselect</v-btn>
        <v-btn
          @click="deleteSelectedImagesDialog = true"
          text
          class="text-none"
          color="error"
        >Delete</v-btn>
      </template>
    </v-banner>

    <v-navigation-drawer
      style="z-index: 14"
      v-model="drawer"
      :permanent="$vuetify.breakpoint.mdAndUp"
      clipped
      app
    >
      <v-container>
        <v-checkbox hide-details v-model="largeThumbs" label="Large thumbnails"></v-checkbox>
        <v-text-field clearable color="accent" v-model="query" label="Search query"></v-text-field>

        <v-subheader>Labels</v-subheader>
        <v-chip-group
          active-class="accent--text"
          :items="allLabels"
          column
          v-model="selectedLabels"
          multiple
        >
          <div style="max-height:30vh; overflow-y:scroll">
            <v-chip label small v-for="label in allLabels" :key="label._id">{{ label.name }}</v-chip>
          </div>
        </v-chip-group>
        <v-select
          hide-details
          color="accent"
          item-text="text"
          item-value="value"
          v-model="sortBy"
          placeholder="Sort by..."
          :items="sortByItems"
        ></v-select>
        <v-select
          :disabled="sortBy == 'relevance'"
          hide-details
          color="accent"
          item-text="text"
          item-value="value"
          v-model="sortDir"
          placeholder="Sort direction"
          :items="sortDirItems"
        ></v-select>
        <v-checkbox hide-details v-model="favoritesOnly" label="Show favorites only"></v-checkbox>
        <v-checkbox hide-details v-model="bookmarksOnly" label="Show bookmarks only"></v-checkbox>

        <v-rating
          half-increments
          @input="ratingFilter = $event * 2"
          :value="ratingFilter / 2"
          class="pb-0 pa-2"
          background-color="grey"
          color="amber"
          dense
          hide-details
        ></v-rating>
        <div class="pl-3 mt-1 med--text caption hover" @click="ratingFilter = 0">Reset rating filter</div>
      </v-container>
    </v-navigation-drawer>

    <div class="d-flex align-center">
      <h1 class="font-weight-light mr-3">Images</h1>
      <v-btn @click="openUploadDialog" icon>
        <v-icon>mdi-upload</v-icon>
      </v-btn>
    </div>

    <v-container fluid>
      <v-row v-if="!waiting">
        <v-col
          class="pa-1"
          v-for="(image, index) in images"
          :key="image._id"
          :cols="largeThumbs ? 12 : 6"
          :sm="largeThumbs ? 12 : 4"
          :md="largeThumbs ? 12 : 3"
          :lg="largeThumbs ? 6 : 3"
          :xl="largeThumbs ? 6 : 2"
        >
          <ImageCard width="100%" height="100%" @open="lightboxIndex = index" :image="image">
            <template v-slot:action>
              <v-checkbox
                color="accent"
                :input-value="selectedImages.includes(image._id)"
                @change="selectImage(image._id)"
                @click.native.stop
                class="mt-0"
                hide-details
                :contain="true"
              ></v-checkbox>
            </template>
          </ImageCard>
        </v-col>
      </v-row>
      <div class="text-center" v-else>Keep on writing...</div>
    </v-container>

    <infinite-loading :identifier="infiniteId" @infinite="infiniteHandler">
      <div slot="no-results">
        <v-icon large>mdi-close</v-icon>
        <div>Nothing found!</div>
      </div>

      <div slot="spinner">
        <v-progress-circular indeterminate></v-progress-circular>
        <div>Loading...</div>
      </div>

      <div slot="no-more">
        <v-icon large>mdi-emoticon-wink</v-icon>
        <div>That's all!</div>
      </div>
    </infinite-loading>

    <v-dialog :persistent="isUploading" scrollable v-model="uploadDialog" max-width="400px">
      <ImageUploader @update-state="isUploading = $event" @uploaded="images.unshift($event)" />
    </v-dialog>

    <v-dialog v-model="deleteSelectedImagesDialog" max-width="400px">
      <v-card>
        <v-card-title>Really delete {{ selectedImages.length }} images?</v-card-title>
        <v-card-text></v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn class="text-none" color="error" text @click="deleteSelection">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <transition name="fade">
      <Lightbox
        @update="updateImage"
        @delete="removeImage"
        :items="images"
        :index="lightboxIndex"
        @index="lightboxIndex = $event"
      />
    </transition>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import LabelSelector from "../components/LabelSelector.vue";
import InfiniteLoading from "vue-infinite-loading";
import { contextModule } from "../store/context";
import ImageCard from "../components/ImageCard.vue";
import Lightbox from "../components/Lightbox.vue";
import actorFragment from "../fragments/actor";
import imageFragment from "../fragments/image";
import ImageUploader from "../components/ImageUploader.vue";
import IImage from "../types/image";
import ILabel from "../types/label";

@Component({
  components: {
    LabelSelector,
    InfiniteLoading,
    ImageCard,
    Lightbox,
    ImageUploader
  }
})
export default class ImagesView extends Vue {
  images = [] as IImage[];
  lightboxIndex = null as number | null;

  waiting = false;
  allLabels = [] as ILabel[];
  selectedLabels = [] as number[]; // TODO: try to retrieve from localStorage

  largeThumbs = localStorage.getItem("pm_imageLargeThumbs") == "true" || false;

  query = localStorage.getItem("pm_imageQuery") || "";
  page = 0;

  sortDir = localStorage.getItem("pm_imageSortDir") || "desc";
  sortDirItems = [
    {
      text: "Ascending",
      value: "asc"
    },
    {
      text: "Descending",
      value: "desc"
    }
  ];

  sortBy = localStorage.getItem("pm_imageSortBy") || "relevance";
  sortByItems = [
    {
      text: "Relevance",
      value: "relevance"
    },
    {
      text: "A-Z",
      value: "alpha"
    },
    {
      text: "Added to collection",
      value: "addedOn"
    },
    {
      text: "Rating",
      value: "rating"
    }
  ];

  favoritesOnly = localStorage.getItem("pm_imageFavorite") == "true";
  bookmarksOnly = localStorage.getItem("pm_imageBookmark") == "true";
  ratingFilter = parseInt(localStorage.getItem("pm_imageRating") || "0");

  infiniteId = 0;
  resetTimeout = null as NodeJS.Timeout | null;

  uploadDialog = false;
  isUploading = false;

  selectedImages = [] as string[];
  deleteSelectedImagesDialog = false;

  selectImage(id: string) {
    if (this.selectedImages.includes(id))
      this.selectedImages = this.selectedImages.filter(i => i != id);
    else this.selectedImages.push(id);
  }

  deleteSelection() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeImages(ids: $ids)
        }
      `,
      variables: {
        ids: this.selectedImages
      }
    })
      .then(res => {
        for (const id of this.selectedImages) {
          this.images = this.images.filter(image => image._id != id);
        }
        this.selectedImages = [];
        this.deleteSelectedImagesDialog = false;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {});
  }

  removeImage(index: number) {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeImages(ids: $ids)
        }
      `,
      variables: {
        ids: [this.images[index]._id]
      }
    })
      .then(res => {
        this.images.splice(index, 1);
        this.lightboxIndex = null;
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {});
  }

  updateImage({
    index,
    key,
    value
  }: {
    index: number;
    key: string;
    value: any;
  }) {
    const images = this.images[index];
    images[key] = value;
    Vue.set(this.images, index, images);
  }

  openUploadDialog() {
    this.uploadDialog = true;
  }

  get drawer() {
    return contextModule.showFilters;
  }

  set drawer(val: boolean) {
    contextModule.toggleFilters(val);
  }

  @Watch("ratingFilter", {})
  onRatingChange(newVal: number) {
    localStorage.setItem("pm_imageRating", newVal.toString());
    this.page = 0;
    this.images = [];
    this.infiniteId++;
  }

  @Watch("favoritesOnly")
  onFavoriteChange(newVal: boolean) {
    localStorage.setItem("pm_imageFavorite", "" + newVal);
    this.page = 0;
    this.images = [];
    this.infiniteId++;
  }

  @Watch("bookmarksOnly")
  onBookmarkChange(newVal: boolean) {
    localStorage.setItem("pm_imageBookmark", "" + newVal);
    this.page = 0;
    this.images = [];
    this.infiniteId++;
  }

  @Watch("sortDir")
  onSortDirChange(newVal: string) {
    localStorage.setItem("pm_imageSortDir", newVal);
    this.page = 0;
    this.images = [];
    this.infiniteId++;
  }

  @Watch("sortBy")
  onSortChange(newVal: string) {
    localStorage.setItem("pm_imageSortBy", newVal);
    this.page = 0;
    this.images = [];
    this.infiniteId++;
  }

  @Watch("selectedLabels")
  onLabelChange() {
    this.page = 0;
    this.images = [];
    this.infiniteId++;
  }

  @Watch("query")
  onQueryChange(newVal: string | null) {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    localStorage.setItem("pm_imageQuery", newVal || "");

    this.waiting = true;
    this.page = 0;
    this.images = [];

    this.resetTimeout = setTimeout(() => {
      this.waiting = false;
      this.infiniteId++;
    }, 500);
  }

  infiniteHandler($state) {
    this.fetchPage().then(items => {
      if (items.length) {
        this.page++;
        this.images.push(...items);
        $state.loaded();
      } else {
        $state.complete();
      }
    });
  }

  async fetchPage() {
    try {
      let include = "";

      if (this.selectedLabels.length)
        include =
          "include:" +
          this.selectedLabels.map(i => this.allLabels[i]._id).join(",");

      const query = `query:'${this.query || ""}' ${include} page:${
        this.page
      } sortDir:${this.sortDir} sortBy:${this.sortBy} favorite:${
        this.favoritesOnly ? "true" : "false"
      } bookmark:${this.bookmarksOnly ? "true" : "false"} rating:${
        this.ratingFilter
      }`;

      const result = await ApolloClient.query({
        query: gql`
          query($query: String) {
            getImages(query: $query) {
              ...ImageFragment
              actors {
                ...ActorFragment
              }
              scene {
                _id
                name
              }
            }
          }
          ${imageFragment}
          ${actorFragment}
        `,
        variables: {
          query
        }
      });

      return result.data.getImages;
    } catch (err) {
      throw err;
    }
  }

  imageLink(image: any) {
    return `${serverBase}/image/${image._id}?password=${localStorage.getItem(
      "password"
    )}`;
  }

  labelAliases(label: any) {
    return label.aliases
      .slice()
      .sort()
      .join(", ");
  }

  beforeMount() {
    ApolloClient.query({
      query: gql`
        {
          getLabels {
            _id
            name
          }
        }
      `
    })
      .then(res => {
        this.allLabels = res.data.getLabels;
      })
      .catch(err => {
        console.error(err);
      });
  }
}
</script>
