<template>
  <v-container>
    <v-card light class="pa-2" id="graph">
      <network
        :events="['click']"
        @click="onClick"
        :options="options"
        ref="network"
        :nodes="nodes"
        :edges="edges"
      ></network>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import { Network } from "vue-vis-network";

@Component({
  components: {
    network: Network
  }
})
export default class GraphPage extends Vue {
  nodes = [] as { id: string; label: string; shape: string; image?: string }[];
  edges = [] as { from: string; to: string }[];
  options = {
    height: "100%"
  };

  onClick(payload: { edges: string[] }) {
    const edge = payload.edges[0];

    if (edge) {
      // @ts-ignore
      const item = this.edges.find(item => item.id == edge);

      // @ts-ignore
      const sceneId = item._id;

      if (sceneId) {
        var win = window.open(
          serverBase +
            `/?password=${localStorage.getItem("password")}` +
            "#/scene/" +
            sceneId,
          "_blank"
        );
        // @ts-ignore
        win.focus();
      }
    }
  }

  mounted() {
    ApolloClient.query({
      query: gql`
        {
          actorGraph {
            actors {
              _id
              name
              avatar {
                _id
              }
              thumbnail {
                _id
              }
            }
            links
          }
        }
      `
    }).then(async res => {
      const sleep = (ms = 2) => new Promise(r => setTimeout(r, ms));

      function actorThumb(actor: any) {
        if (actor.avatar) return actor.avatar._id;
        if (actor.thumbnail) return actor.thumbnail._id;
        return null;
      }

      const actors = res.data.actorGraph.actors as {
        _id: string;
        name: string;
        thumbnail?: { _id: string };
        avatar?: { _id: string };
      }[];

      this.edges = res.data.actorGraph.links.items;

      for (const actor of actors) {
        this.nodes.push({
          id: actor._id,
          shape: "circularImage",
          image:
            serverBase +
            "/image/" +
            actorThumb(actor) +
            `?password=${localStorage.getItem("password")}`,
          label: actor.name
        });
        await sleep();
      }
    });
  }
}
</script>

<style lang="scss">
#graph {
  width: 100%;
  height: calc(100vh - 120px);

  > div {
    height: 100%;
  }
}
</style>