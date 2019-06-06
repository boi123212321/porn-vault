import Star from '@/classes/actor';
import Vue from "vue";
import CustomField, { CustomFieldType } from '@/classes/custom_field';

type RootState = {
  settings: {
    copyThumbnails: boolean;
    darkMode: boolean;
    thumbnailsOnImportInterval: number;
  };
  customFields: CustomField[];
}

export default {
  namespaced: true,

  state: {
    settings: {
      copyThumbnails: true,
      darkMode: false,
      thumbnailsOnImportInterval: 60
    },
    customFields: [
      {
        name: "Nationality",
        values: [
          "United States",
          "United Kingdom",
          "Russia",
          "Ukraine",
          "Czech Republic",
          "France",
          "Spain",
          "Germany"
        ],
        type: CustomFieldType.SELECT
      },
      {
        name: "Ethnicity",
        values: [
          "Caucasian",
          "Black",
          "Asian",
          "Hispanic"
        ],
        type: CustomFieldType.SELECT
      },
      {
        name: "Hair Color",
        values: [
          "Brown",
          "Black",
          "Blonde",
          "Red",
          "Colored"
        ],
        type: CustomFieldType.SELECT
      },
      {
        name: "Eye Color",
        values: [
          "Amber",
          "Brown",
          "Blue",
          "Green",
          "Gray",
          "Hazel"
        ],
        type: CustomFieldType.SELECT
      },
      {
        name: "Year of birth",
        values: null,
        type: CustomFieldType.NUMBER
      },
      {
        name: "Height",
        values: null,
        type: CustomFieldType.NUMBER
      },
    ]
  },
  mutations: {
    set(state: RootState, newState: RootState) {
      Vue.set(state, "settings", newState.settings);
      state.customFields = newState.customFields;
    },
    setDarkMode(state: RootState, bool: boolean) {
      state.settings.darkMode = bool;
    },
    addCustomField(state: RootState, field: CustomField) {
      state.customFields.push(field);
    }
  },
  actions: {
  },
  getters: {
    get(state: RootState) {
      return state;
    },
    darkMode(state: RootState) {
      return state.settings.darkMode;
    },
    getCustomFieldNames(state: RootState) {
      return state.customFields.map(cf => cf.name);
    }
  }
}