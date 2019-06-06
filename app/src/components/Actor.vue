<template>
  <div class="pa-2" v-if="actor" style="word-break: break-word">
    <v-card flat v-ripple class="actor" @click="goToActor">
      <v-img
        v-if="actor.thumbnails.length"
        class="thumb"
        :aspect-ratio="1"
        v-ripple
        :src="thumbnails[actor.coverIndex]"
        contain
      ></v-img>
      <v-img v-else class="thumb" :aspect-ratio="1" v-ripple src style="background: grey"></v-img>
    </v-card>
    <div class="mt-3 text-xs-center">
      <span class="subheading">{{ actor.name }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Actor from "@/classes/actor";

export default Vue.extend({
  props: {
    actor: {
      type: Object,
      default: null
    },
    size: {
      type: Number,
      default: 160
    }
  },
  methods: {
    goToActor() {
      this.$router.push("/actor/" + this.actor.id);
    }
  },
  computed: {
    thumbnails(): string[] {
      return (<Actor>this.actor).thumbnails.map(id =>
        this.$store.getters["images/idToPath"](id)
      );
    }
  }
});
</script>

<style lang="scss" scoped>
.actor {
  user-select: none;

  &:hover {
    .thumb {
      cursor: pointer;
      filter: brightness(0.8);
    }
  }

  .thumb {
    transition: filter 0.15s ease-in-out;
  }
}
</style>
