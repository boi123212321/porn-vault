// mixin.js
import Vue from "vue";
import Component from "vue-class-component";
import ApolloClient, { serverBase } from "../apollo";
import gql from "graphql-tag";
import moment from "moment";
import { contextModule } from "../store/context";
import { copy } from "../util/object";
import { ensureDarkColor } from "../util/color";
import Color from "color";
import IScene from "@/types/scene";

@Component
export default class SceneMixin extends Vue {
  value!: IScene;

  get complementary() {
    if (this.cardColor)
      return (
        Color(this.cardColor)
          .negate()
          .hex() + " !important"
      );
    return undefined;
  }

  get cardColor() {
    if (this.value.thumbnail && this.value.thumbnail.color)
      return ensureDarkColor(this.value.thumbnail.color);
    return null;
  }

  get aspectRatio() {
    return contextModule.sceneAspectRatio;
  }

  get videoDuration() {
    if (this.value)
      return moment()
        .startOf("day")
        .seconds(this.value.meta.duration)
        .format(this.value.meta.duration < 3600 ? "mm:ss" : "H:mm:ss");
    return "";
  }

  rate($event) {
    const rating = $event * 2;

    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            rating
          }
        }
      `,
      variables: {
        ids: [this.value._id],
        opts: {
          rating
        }
      }
    }).then(res => {
      const scene = copy(this.value);
      scene.rating = res.data.updateScenes[0].rating;
      this.$emit("input", scene);
    });
  }

  favorite() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            favorite
          }
        }
      `,
      variables: {
        ids: [this.value._id],
        opts: {
          favorite: !this.value.favorite
        }
      }
    }).then(res => {
      const scene = copy(this.value);
      scene.favorite = res.data.updateScenes[0].favorite;
      this.$emit("input", scene);
    });
  }

  bookmark() {
    ApolloClient.mutate({
      mutation: gql`
        mutation($ids: [String!]!, $opts: SceneUpdateOpts!) {
          updateScenes(ids: $ids, opts: $opts) {
            bookmark
          }
        }
      `,
      variables: {
        ids: [this.value._id],
        opts: {
          bookmark: !this.value.bookmark
        }
      }
    }).then(res => {
      const scene = copy(this.value);
      scene.bookmark = res.data.updateScenes[0].bookmark;
      this.$emit("input", scene);
    });
  }

  get labelNames() {
    return this.value.labels.map(l => l.name).sort();
  }

  get actorLinks() {
    const names = this.value.actors.map(
      a =>
        `<a class="${this.complementary ? "" : "accent--text"}" style="color: ${
          this.complementary
        }" href="#/actor/${a._id}">${a.name}</a>`
    );
    names.sort();
    return names.join(", ");
  }

  get thumbnail() {
    if (this.value.thumbnail)
      return `${serverBase}/image/${
        this.value.thumbnail._id
      }?password=${localStorage.getItem("password")}`;
    return ``;
  }

  get videoPath() {
    if (this.value)
      return `${serverBase}/scene/${
        this.value._id
      }?password=${localStorage.getItem("password")}`;
  }
}
