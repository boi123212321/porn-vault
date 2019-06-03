import Image from '@/classes/image';
import Vue from "vue";
import CustomField from '@/classes/custom_field';

type RootState = {
  items: Image[],
  search: any
}

export default {
  namespaced: true,

  state: {
    items: [],
    search: {
      gridSize: 0,
      filterDrawer: false,
      search: "",
      chosenLabels: [] as string[],
      chosenActors: [] as string[],
      favoritesOnly: false,
      bookmarksOnly: false,
      ratingFilter: 0,
      chosenSort: 0,
    }
  },
  getters: {
    getAll(state: RootState): Image[] {
      return state.items;
    },
    getById: (state: RootState) => (id: string): Image | undefined => {
      return state.items.find(image => image.id == id);
    },
    getByPath: (state: RootState) => (path: string): Image | undefined => {
      return state.items.find(image => image.path == path);
    },
    idToPath: (state: RootState) => (id: string): string | undefined => {
      let item = state.items.find(image => image.id == id);

      if (item)
        return item.path;
      return;
    },
    getLabels(state: RootState) {
      return [
        ...new Set(
          (<Image[]>state.items).reduce(
            (acc: string[], video) => acc.concat(video.labels),
            []
          )
        )
      ];
    }
  },
  mutations: {
    setSearchParam(state: RootState, { key, value }: { key: string, value: any }) {
      Vue.set(state.search, key, value);
    },

    set(state: RootState, items: Image[]) {
      state.items = items;
    },
    add(state: RootState, items: Image[]) {
      state.items.push(...items);
    },
    rate(state: RootState, { id, rating }: { id: string, rating: number }) {
      let _index = state.items.findIndex((v: Image) => v.id == id) as number;

      if (_index >= 0) {
        let image = state.items[_index] as Image;
        image.rating = image.rating == rating ? 0 : rating;
        Vue.set(state.items, _index, image);
      }
    },
    favorite(state: RootState, id: string) {
      let _index = state.items.findIndex((v: Image) => v.id == id) as number;

      if (_index >= 0) {
        let image = state.items[_index] as Image;
        image.favorite = !image.favorite;
        Vue.set(state.items, _index, image);
      }
    },
    bookmark(state: RootState, id: string) {
      let _index = state.items.findIndex((v: Image) => v.id == id) as number;

      if (_index >= 0) {
        let image = state.items[_index] as Image;
        image.bookmark = !image.bookmark;
        Vue.set(state.items, _index, image);
      }
    },
    addCustomField(state: RootState, customField: CustomField) {
      for (let i = 0; i < state.items.length; i++) {
        let image = state.items[i] as Image;
        image.customFields[customField.name] = null;
        Vue.set(state.items, i, image);
      }
    },
    remove(state: RootState, id: string) {
      state.items = state.items.filter(i => i.id !== id);
    }
  },
  actions: {
  },
}