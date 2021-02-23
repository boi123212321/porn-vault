<template>
  <v-container fluid>
    <BindFavicon />
    <BindTitle value="Labels" />
    <div v-if="!fetchLoader">
      <h1 class="font-weight-light">Labels</h1>

      <div style="max-width: 350px">
        <v-text-field
          clearable
          color="primary"
          hide-details
          class="px-5 mb-3"
          label="Find labels..."
          v-model="labelSearchQuery"
        />
      </div>

      <v-list-item v-if="selectedLabels.length">
        <v-list-item-action>
          <v-btn class="mr-2" @click="selectedLabels = []" icon>
            <v-icon>mdi-select-off</v-icon>
          </v-btn>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>{{ selectedLabels.length }} labels selected</v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <div class="d-flex">
            <v-btn @click="deleteLabels" icon>
              <v-icon>mdi-delete-forever</v-icon>
            </v-btn>
          </div>
        </v-list-item-action>
      </v-list-item>

      <v-list-item @click="createLabel = true" v-ripple>
        <v-list-item-icon>
          <v-icon>mdi-plus</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>Add new label</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <LabelSelector :searchQuery="labelSearchQuery" :items="labels" v-model="selectedLabels">
        <template v-slot:action="{ label }">
          <v-list-item-action>
            <v-btn icon @click.stop.native="openEditDialog(label)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-list-item-action>
        </template>
      </LabelSelector>

      <v-dialog v-model="editLabelDialog" max-width="400px">
        <v-card :loading="editLabelLoader" v-if="editingLabel">
          <v-card-title>Edit label '{{ editingLabel.name }}'</v-card-title>

          <v-card-text>
            <v-form v-model="validEditing">
              <v-text-field
                clearable
                color="primary"
                v-model="editLabelName"
                placeholder="Label name"
                :rules="labelNameRules"
                :error-messages="editLabelNameErrors"
                :hint="editLabelAliasWarning"
                @keydown.enter="editLabel"
              ></v-text-field>

              <v-combobox
                v-model="editLabelAliases"
                multiple
                chips
                placeholder="Alias names"
                color="primary"
                clearable
              ></v-combobox>

              <v-text-field
                prefix="#"
                :rules="labelColorRules"
                v-model="editColor"
                clearable
                color="primary"
                placeholder="Label color"
              >
              </v-text-field>

              <div v-if="editColor" class="d-flex align-center">
                <v-avatar size="16" class="mr-2" :color="`#${editColor}`"></v-avatar>
                Color preview
              </div>
            </v-form>
          </v-card-text>

          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              @click="editLabel"
              :disabled="!validEditing"
              text
              color="primary"
              class="text-none"
              >Edit</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="createLabel" max-width="400px">
        <v-card :loading="createLabelLoader">
          <v-card-title>Add new label</v-card-title>

          <v-card-text>
            <v-form v-model="validCreation">
              <v-text-field
                clearable
                color="primary"
                v-model="createLabelName"
                placeholder="Label name"
                :rules="labelNameRules"
                :error-messages="createLabelNameErrors"
                :hint="createLabelAliasWarning"
                @keydown.enter="addLabel"
              ></v-text-field>

              <v-combobox
                v-model="createLabelAliases"
                multiple
                chips
                placeholder="Alias names"
                color="primary"
                clearable
              ></v-combobox>
            </v-form>
          </v-card-text>

          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              @click="addLabel"
              :disabled="!validCreation"
              text
              color="primary"
              class="text-none"
              >Add</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
    <div v-else class="text-center">
      <p>Loading...</p>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient from "@/apollo";
import gql from "graphql-tag";
import LabelSelector from "@/components/LabelSelector.vue";
import ILabel from "@/types/label";
import { IDupCheckResults } from "../api/search";

@Component({
  components: {
    LabelSelector,
  },
})
export default class Home extends Vue {
  labels = [] as ILabel[];
  fetchLoader = false;

  selectedLabels = [] as number[];

  editLabelDialog = false;
  editLabelLoader = false;
  editColor = "";
  editingLabel = null as ILabel | null;
  initialEditLabelName = "";
  editLabelName = "";
  editLabelAliases = [] as string[];
  validEditing = false;

  createLabel = false;
  createLabelLoader = false;
  createLabelName = "";
  createLabelAliases = [];
  validCreation = false;

  labelNameRules = [(v) => (!!v && !!v.length) || "Invalid label name"];
  editLabelNameErrors = [] as string[];
  createLabelNameErrors = [] as string[];
  editLabelAliasWarning = "" as string;
  createLabelAliasWarning = "" as string;
  labelColorRules = [
    (v) => {
      if (!v) {
        return true;
      }
      return (v.length === 6 && /^[0-9a-f]{6}$/i.test(v)) || "Invalid color (#RRGGBB)";
    },
  ];

  labelSearchQuery = "" as string | null;

  openEditDialog(label: ILabel) {
    this.editLabelDialog = true;
    this.editLabelNameErrors = [];
    this.editLabelAliasWarning = "";
    this.editingLabel = label;
    this.initialEditLabelName = label.name;
    this.editLabelName = label.name;
    this.editLabelAliases = label.aliases;
    this.editColor = label.color ? label.color.replace("#", "") : "";
  }

  get selectedLabelsIDs() {
    return this.selectedLabels.map((i) => this.labels[i]._id);
  }

  async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  checkLabelExist(name: string): IDupCheckResults {
    const searchName = name.trim();
    return {
      nameDup: this.labels.find(
        (l) => l.name.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
      ),
      aliasesDup: this.labels.filter(({ aliases }) =>
        aliases.find(
          (alias) => alias.localeCompare(searchName, undefined, { sensitivity: "base" }) === 0
        )
      ),
    };
  }

  @Watch("createLabelName", {})
  onCreateLabelNameChange(newVal: string) {
    const existResult: IDupCheckResults = this.checkLabelExist(this.createLabelName);

    // Blocking error for name conflicts
    if (existResult?.nameDup) {
      this.createLabelNameErrors = ["This label already exists."];
    } else {
      this.createLabelNameErrors = [];
    }
    // Non blocking hint warning for alias conflicts
    if (existResult?.aliasesDup?.length) {
      this.createLabelAliasWarning = `Warning: an alias with this name already exists for ${existResult.aliasesDup
        .map((label) => label.name)
        .join(", ")}.`;
    } else {
      this.createLabelAliasWarning = "";
    }
  }

  @Watch("editLabelName", {})
  onEditLabelNameChange(newVal: string) {
    if (this.initialEditLabelName === this.editLabelName) return;

    const existResult: IDupCheckResults = this.checkLabelExist(this.editLabelName);

    // Blocking error for name conflicts
    if (existResult?.nameDup) {
      this.editLabelNameErrors = ["This label already exists."];
    } else {
      this.editLabelNameErrors = [];
    }
    // Non blocking hint warning for alias conflicts
    if (existResult?.aliasesDup?.length) {
      this.editLabelAliasWarning = `Warning: an alias with this name already exists for ${existResult.aliasesDup
        .map((label) => label.name)
        .join(", ")}.`;
    } else {
      this.editLabelAliasWarning = "";
    }
  }

  async editLabel() {
    if (!this.editingLabel) return;
    if (!this.validEditing) return;

    await this.sleep(50);
    this.editLabelLoader = true;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: LabelUpdateOpts!) {
          updateLabels(ids: $ids, opts: $opts) {
            _id
            name
            aliases
            thumbnail {
              _id
            }
            color
          }
        }
      `,
      variables: {
        ids: [this.editingLabel._id],
        opts: {
          name: this.editLabelName,
          aliases: this.editLabelAliases,
          color: this.editColor ? `#${this.editColor}` : "",
        },
      },
    })
      .then((res) => {
        const index = this.labels.findIndex(
          // @ts-ignore
          (l) => l._id == this.editingLabel._id
        );

        if (index > -1) {
          const label = this.labels[index];
          Object.assign(label, res.data.updateLabels[0]);
          Vue.set(this.labels, index, label);
        }

        this.editLabelDialog = false;
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        this.editLabelLoader = false;
      });
  }

  deleteLabels() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!) {
          removeLabels(ids: $ids)
        }
      `,
      variables: {
        ids: this.selectedLabelsIDs,
      },
    })
      .then(() => {
        for (const id of this.selectedLabelsIDs) {
          this.labels = this.labels.filter((l) => l._id != id);
        }
        this.selectedLabels = [];
      })
      .catch((error) => {
        console.error(error);
      });
  }

  addLabel() {
    if (!this.validCreation) return;

    this.createLabelLoader = true;
    ApolloClient.mutate({
      mutation: gql`
        mutation($name: String!, $aliases: [String!]) {
          addLabel(name: $name, aliases: $aliases) {
            _id
            name
            aliases
            thumbnail {
              _id
            }
          }
        }
      `,
      variables: {
        name: this.createLabelName,
        aliases: this.createLabelAliases,
      },
    })
      .then((res) => {
        //this.labels.push(res.data.addLabel);
        //this.labels.sort((a, b) => a.name.localeCompare(b.name));
        this.labels = [];
        this.selectedLabels = [];
        this.createLabel = false;
        this.createLabelName = "";
        this.createLabelAliases = [];
        this.getLabels();
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        this.createLabelLoader = false;
      });
  }

  labelAliases(label: any) {
    return label.aliases.slice().sort().join(", ");
  }

  getLabels() {
    this.fetchLoader = true;
    ApolloClient.query({
      query: gql`
        {
          getLabels {
            _id
            name
            aliases
            color
          }
        }
      `,
    })
      .then((res) => {
        this.labels = res.data.getLabels;
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this.fetchLoader = false;
      });
  }

  beforeMount() {
    this.getLabels();
  }
}
</script>
