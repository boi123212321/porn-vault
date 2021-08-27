<template>
  <div>
    <div class="d-flex text-center">
      <v-select
        v-model="selectedFieldId"
        single-line
        flat
        placeholder="Select custom field"
        :items="fields"
        item-text="name"
        item-value="_id"
      ></v-select>
      <v-btn
        text
        :disabled="!selectedFieldId"
        @click="addFilter"
        class="mt-3 text-none"
        color="primary"
        >Add filter</v-btn
      >
    </div>
    <v-row dense>
      <v-col v-for="(filter, i) in innerValue" :key="i" cols="12">
        <v-card outlined class="d-flex px-2 align-center">
          <div style="min-width: 80px" class="subtitle-1 font-weight-bold">
            {{ getField(filter.id).name }}
          </div>

          <v-divider class="ml-3" vertical></v-divider>

          <div class="d-flex align-center" v-if="getField(filter.id).type == 'NUMBER'">
            <v-select
              style="width: 275px"
              solo
              flat
              single-line
              :items="numberOps"
              placeholder="Operation"
              hide-details
              class="mb-1"
              v-model="innerValue[i].op"
              @change="emitValue"
            ></v-select>

            <v-text-field
              style="width: 100%"
              solo
              flat
              single-line
              :placeholder="getField(filter.id).name"
              v-model.number="innerValue[i].value"
              @input="emitValue"
              hide-details
              color="primary"
              :suffix="getField(filter.id).unit"
            />
          </div>
          <div class="d-flex align-center" v-else-if="getField(filter.id).type == 'STRING'">
            <v-select
              style="width: 275px"
              solo
              flat
              single-line
              :items="stringOps"
              placeholder="Operation"
              hide-details
              class="mb-1"
              v-model="innerValue[i].op"
              @change="emitValue"
            ></v-select>

            <v-text-field
              style="width: 100%"
              solo
              flat
              single-line
              :placeholder="getField(filter.id).name"
              v-model="innerValue[i].value"
              @input="emitValue"
              hide-details
              color="primary"
              :suffix="getField(filter.id).unit"
            />
          </div>
          <div class="d-flex align-center" v-if="getField(filter.id).type == 'SINGLE_SELECT'">
            <v-select
              style="width: 275px"
              solo
              flat
              single-line
              :items="stringOps"
              placeholder="Operation"
              hide-details
              class="mb-1"
              v-model="innerValue[i].op"
              @change="emitValue"
            ></v-select>

            <v-select
              style="width: 100%"
              solo
              flat
              single-line
              color="primary"
              :placeholder="getField(filter.id).name"
              v-model="innerValue[i].value"
              :items="getField(filter.id).values"
              @change="emitValue"
              hide-details
              :suffix="getField(filter.id).unit"
            />
          </div>
          <div class="d-flex align-center" v-else-if="getField(filter.id).type == 'MULTI_SELECT'">
            <v-select
              style="width: 275px"
              hide-details
              class="mb-1"
              solo
              flat
              single-line
              :items="stringOps"
              placeholder="Operation"
              v-model="innerValue[i].op"
              @change="emitValue"
            ></v-select>

            <v-select
              style="width: 100%"
              solo
              flat
              single-line
              color="primary"
              :placeholder="getField(filter.id).name"
              v-model="innerValue[i].value"
              :items="getField(filter.id).values"
              @change="emitValue"
              hide-details
              :suffix="getField(filter.id).unit"
            />
          </div>
          <div class="d-flex align-center" v-else-if="getField(filter.id).type == 'BOOLEAN'">
            <v-select
              style="width: 275px"
              hide-details
              class="mb-1"
              solo
              flat
              single-line
              :items="booleanOps"
              placeholder="Operation"
              v-model="innerValue[i].op"
              @change="emitValue"
            ></v-select>

            <v-checkbox
              class="mt-0"
              v-model="innerValue[i].value"
              @change="emitValue"
              color="primary"
              hide-details
              :label="innerValue[i].value === true ? 'Yes' : 'No'"
            />
          </div>

          <v-divider class="mr-2" vertical></v-divider>

          <v-btn icon @click="splice(i)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";

function mapOperation(op: string): string {
  return (
    {
      equals: "term",
      "greater than": "gt",
      "less than": "lt",
      contains: "term",
    }[op] || op
  );
}

@Component
export default class CustomFieldSelector extends Vue {
  @Prop({ default: () => [] }) value!: { id: string; op: string; value: any }[];
  @Prop() fields!: any[];

  innerValue = [] as { id: string; op: string; value: any }[];
  selectedFieldId = null as string | null;

  numberOps = [
    {
      text: "equals",
      value: "term",
    },
    {
      text: "greater than",
      value: "gt",
    },
    {
      text: "less than",
      value: "lt",
    },
  ];

  stringOps = [
    {
      text: "equals",
      value: "match",
    },
    {
      text: "contains",
      value: "wildcard",
    },
  ];

  booleanOps = [
    {
      text: "equals",
      value: "term",
    },
  ];

  getField(id: string) {
    return this.fields.find((f) => f._id == id);
  }

  beforeMount() {
    this.innerValue = JSON.parse(JSON.stringify(this.value));
  }

  addFilter() {
    if (!this.selectedFieldId) return;
    this.innerValue.push(<any>{
      id: this.selectedFieldId,
    });
    this.emitValue();
  }

  splice(index: number) {
    this.innerValue.splice(index, 1);
    this.emitValue();
  }

  @Watch("value", { deep: true })
  onValueChange(newVal: any) {
    this.innerValue = newVal;
  }

  emitValue() {
    const copied = JSON.parse(JSON.stringify(this.innerValue)) as {
      id: string;
      op: string;
      type: string;
      value: any;
    }[];
    for (const item of copied) {
      item.op = mapOperation(item.op);
      item.type = this.getField(item.id).type;
    }
    this.$emit("input", copied);
    this.$emit("change");
  }
}
</script>
