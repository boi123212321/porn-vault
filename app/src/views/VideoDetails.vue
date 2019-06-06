<template>
  <div>
    <div>
      <v-toolbar dark color="primary">
        <v-btn icon dark @click="$router.go(-1)">
          <v-icon>chevron_left</v-icon>
        </v-btn>
        <v-toolbar-title class="mr-2">{{video.title}}</v-toolbar-title>
        <v-btn icon dark @click="playVideo">
          <v-icon>play_arrow</v-icon>
        </v-btn>
        <v-btn icon dark @click="favorite">
          <v-icon>{{ video.favorite ? 'favorite' : 'favorite_border' }}</v-icon>
        </v-btn>
        <v-btn icon dark @click="bookmark">
          <v-icon>{{ video.bookmark ? 'bookmark' : 'bookmark_border' }}</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn icon dark @click="openEditDialog">
          <v-icon>edit</v-icon>
        </v-btn>
        <v-btn icon dark @click>
          <v-icon color="warning">delete_forever</v-icon>
        </v-btn>
      </v-toolbar>
      <v-container>
        <v-layout row wrap>
          <v-flex xs6 sm4 md3 lg3>
            <v-img
              v-if="video.thumbnails.length"
              class="clickable elevation-6"
              v-ripple
              :aspect-ratio="1"
              :src="thumbnails[video.coverIndex]"
              @click="openFileInput"
            ></v-img>
            <v-img
              @click="openFileInput"
              v-else
              class="elevation-6 clickable"
              :aspect-ratio="1"
              src
              style="background: grey"
            ></v-img>
            <input accept="image/*" multiple style="display:none" type="file" :data-id="video.id">
          </v-flex>
          <v-flex xs6 sm8 md9 lg9>
            <v-container fluid fill-height>
              <div class="fill">

                <div>
                  <span v-for="i in 5" :key="i">
                    <v-icon @click="rateVideo(i)" v-if="i > video.rating">star_border</v-icon>
                    <v-icon color="amber" @click="rateVideo(i)" v-else>star</v-icon>
                  </span>
                </div>

                <div>
                  <p class="sec--text">{{ video.description }}</p>
                </div>

                <div class="mt-4 mb-1">
                  <v-icon class="mr-1" style="vertical-align: bottom">label</v-icon>
                  <span class="body-2">Labels</span>
                </div>
                <div class="mt-1">
                  <v-chip
                    small
                    v-for="label in video.labels.slice().sort()"
                    :key="label"
                  >{{ label }}</v-chip>
                  <v-chip small @click="openLabelDialog" color="primary white--text">+ Add</v-chip>
                </div>

                <v-container fluid>
                  <v-layout row wrap class="sec--text">
                    <v-flex xs4>
                      <v-icon class="mr-1" style="vertical-align: middle">album</v-icon>
                      {{ new Date(video.duration * 1000).toISOString().substr(11, 8) }}
                    </v-flex>
                    <v-flex xs4>
                      <v-icon class="mr-1" style="vertical-align: middle">featured_video</v-icon>
                      {{ video.dimensions.width }}x{{ video.dimensions.height }}
                    </v-flex>
                    <v-flex xs4>
                      <v-icon class="mr-1" style="vertical-align: middle">storage</v-icon>
                      {{ parseInt(video.size /1000 / 1000) }} MB
                    </v-flex>
                  </v-layout>
                </v-container>

                <div class="mt-3">
                  <p
                    class="mb-0"
                  >{{ video.watches.length }} {{ video.watches.length == 1 ? 'view' : 'views' }}</p>
                  <p
                    class="sec--text"
                    v-if="video.watches.length"
                  >Last view: {{ new Date(video.watches.slice(-1)[0]).toLocaleString() }}</p>
                </div>

                <v-container fluid>
                  <v-layout row wrap align-center v-for="field in customFields" :key="field[0]">
                    <v-flex xs12 sm6>
                      <v-subheader>{{ field[0] }}</v-subheader>
                    </v-flex>
                    <v-flex xs12 sm6>{{ Array.isArray(field[1]) ? field[1].join(", ") : field[1] }}</v-flex>
                  </v-layout>
                </v-container>
              </div>
            </v-container>
          </v-flex>

          <v-flex class="text-xs-center pt-5" xs12 v-if="video.actors.length">
            <p class="title font-weight-regular">Featuring</p>
            <v-layout row wrap>
              <v-flex v-for="actor in actors" :key="actor.id" xs6 sm4 md4 lg3>
                <Actor :actor="actor"></Actor>
              </v-flex>
            </v-layout>
          </v-flex>

          <v-flex
            class="pt-5"
            xs12
            sm10
            offset-sm1
            md8
            offset-md2
            lg6
            offset-lg3
            v-if="video.thumbnails.length > 1"
          >
            <p class="text-xs-center title font-weight-regular">Images</p>
            <v-checkbox v-model="cycle" label="Auto-cycle images"></v-checkbox>
            <v-carousel :cycle="cycle" hide-delimiters>
              <v-carousel-item v-for="(item,i) in thumbnails" :key="i" :src="item">
                <div class="topbar">
                  <v-spacer></v-spacer>
                  <v-btn class="thumb-btn" @click="setCoverIndex(i)" icon large>
                    <v-icon>photo</v-icon>
                  </v-btn>
                  <v-btn class="thumb-btn" @click="removeThumbnail(i)" icon large>
                    <v-icon>close</v-icon>
                  </v-btn>
                </div>
              </v-carousel-item>
            </v-carousel>
          </v-flex>
        </v-layout>
      </v-container>
    </div>

    <v-dialog v-model="editDialog" max-width="600px">
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>Edit '{{video.title}}'</v-toolbar-title>
        </v-toolbar>
        <v-container>
          <v-layout row wrap align-center>
            <v-flex xs6 sm4>
              <v-subheader>Video title</v-subheader>
            </v-flex>
            <v-flex xs6 sm8>
              <v-text-field single-line v-model="editing.title" label="Enter title"></v-text-field>
            </v-flex>

            <v-flex xs6 sm4>
              <v-subheader>Description</v-subheader>
            </v-flex>
            <v-flex xs6 sm8>
              <v-textarea label="Enter description" v-model="editing.description"></v-textarea>
            </v-flex>

            <v-flex xs6 sm4>
              <v-subheader>Actors</v-subheader>
            </v-flex>
            <v-flex xs6 sm8>
              <v-autocomplete
                v-model="editing.actors"
                :items="$store.state.actors.items"
                chips
                label="Select"
                item-text="name"
                item-value="id"
                multiple
                clearable
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

            <v-flex xs12>
              <v-btn
                flat
                @click="editing.showCustomFields = !editing.showCustomFields"
              >{{ editing.showCustomFields ? 'Hide custom data fields' : 'Show custom data fields'}}</v-btn>
            </v-flex>

            <v-container fluid v-if="editing.showCustomFields">
              <v-layout row wrap>
                <v-flex xs12 v-for="field in $store.state.globals.customFields" :key="field.name">
                  <CustomField
                    :field="field"
                    :value="getFieldValue(field.name)"
                    v-on:change="setFieldValue"
                  />
                </v-flex>
              </v-layout>
            </v-container>
          </v-layout>
        </v-container>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editDialog = false" flat>Cancel</v-btn>
          <v-btn @click="saveSettings" color="primary">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="labelDialog" max-width="600px">
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>Edit labels</v-toolbar-title>
        </v-toolbar>
        <v-container>
          <v-combobox
            v-model="editing.chosenLabels"
            :items="$store.getters['videos/getLabels']"
            label="Add or choose labels"
            multiple
            chips
          ></v-combobox>
        </v-container>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="labelDialog = false" flat>Cancel</v-btn>
          <v-btn @click="saveLabels" color="primary">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import fs from "fs";
import Vue from "vue";
import path from "path";
import { hash, randomString } from "@/util/generator";
import Actor from "@/classes/actor";
import Image from "@/classes/image";
import ActorComponent from "@/components/Actor.vue";
import Video from "@/classes/video";
import { toTitleCase } from "@/util/string";
import { CustomFieldValue } from "@/classes/common";
import CustomField from "@/components/CustomField.vue";
import { exportToDisk } from "@/util/library";

export default Vue.extend({
  components: {
    Actor: ActorComponent,
    CustomField
  },
  data() {
    return {
      cycle: true,
      editDialog: false,
      labelDialog: false,

      editing: {
        showCustomFields: false,

        title: "",
        description: "",
        actors: [] as string[],
        customFields: {} as CustomFieldValue,
        chosenLabels: [] as string[]
      }
    };
  },
  methods: {
    setFieldValue({ key, value }: { key: string; value: string }) {
      this.editing.customFields[key] = value;
    },
    getFieldValue(name: string): string | number | boolean | null {
      return this.editing.customFields[name];
    },
    saveLabels() {
      this.$store.commit("videos/setLabels", {
        id: this.video.id,
        labels: this.editing.chosenLabels.map((label: string) =>
          toTitleCase(label)
        )
      });
      this.labelDialog = false;

      exportToDisk();
    },
    openLabelDialog() {
      this.labelDialog = true;
      this.editing.chosenLabels = this.video.labels;
    },
    favorite() {
      this.$store.commit("videos/favorite", this.video.id);
      exportToDisk();
    },
    bookmark() {
      this.$store.commit("videos/bookmark", this.video.id);
      exportToDisk();
    },
    rateVideo(rating: number) {
      this.$store.commit("videos/rate", {
        id: this.video.id,
        rating
      });
      exportToDisk();
    },
    // Remove actor from filter, not library
    removeActor(id: string) {
      this.editing.actors = this.editing.actors.filter((a: string) => a != id);
    },
    saveSettings() {
      this.$store.commit("videos/edit", {
        id: this.video.id,
        settings: {
          title: toTitleCase(this.editing.title),
          description: this.editing.description || null,
          actors: this.editing.actors,
          customFields: JSON.parse(JSON.stringify(this.editing.customFields))
        }
      });
      this.editDialog = false;

      exportToDisk();
    },
    openEditDialog() {
      this.editDialog = true;
      this.editing.title = this.video.title;
      this.editing.description = this.video.description;
      this.editing.actors = this.video.actors;
      this.editing.customFields = JSON.parse(
        JSON.stringify(this.video.customFields)
      );
    },
    removeThumbnail(index: number) {
      this.$store.commit("videos/removeThumbnail", {
        id: this.video.id,
        index
      });

      exportToDisk();
    },
    setCoverIndex(index: number) {
      this.$store.commit("videos/setCoverIndex", {
        id: this.video.id,
        index
      });

      exportToDisk();
    },
    openFileInput() {
      let el = document.querySelector(
        `input[data-id="${this.video.id}"]`
      ) as any;

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
              `image-${this.video.id}-${randomString(8)}${path.extname(p)}`
            );
            fs.copyFileSync(p, imagePath);
            file.path = imagePath;
          });
        }

        let images = files.map(file => Image.create(file));

        images.forEach(image => {
          image.video = this.video.id;
          image.labels.push(...this.video.labels);
          image.actors.push(...this.video.actors);
        });

        this.$store.commit("images/add", images);

        if (files.length) {
          this.$store.commit("videos/addThumbnails", {
            id: this.video.id,
            images: images.map(i => i.id)
          });
        }

        exportToDisk();

        el.value = "";
      });

      el.click();
    },
    playVideo() {
      this.video.open();

      this.$store.commit("videos/incrementViewCounter", this.video.id);
    }
  },
  computed: {
    customFields() {
      let array = Object.entries(this.video.customFields);
      array = array.filter((a: any) => a[1] !== null);
      return array;
    },
    video(): Video {
      return this.$store.state.videos.items.find(
        (v: Video) => v.id == this.$route.params.id
      );
    },
    actors(): Actor[] {
      return this.video.actors.map((id: string) => {
        return this.$store.state.actors.items.find((a: Actor) => a.id == id);
      });
    },
    thumbnails(): string[] {
      return this.video.thumbnails.map((id: string) =>
        this.$store.getters["images/idToPath"](id)
      );
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
  z-index: 999;
}

.thumb-btn {
  background: rgba(0, 0, 0, 0.5);
}

.clickable {
  &:hover {
    cursor: pointer;
  }
}
</style>
