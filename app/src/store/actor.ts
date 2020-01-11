import { VuexModule, Module, Mutation, Action } from "vuex-class-modules";

@Module
class ActorModule extends VuexModule {
  current = null as IActor | null;

  @Mutation
  setName(name: string) {
    if (this.current) this.current.name = name;
  }

  @Mutation
  setAliases(aliases: string[]) {
    if (this.current) this.current.aliases = aliases;
  }

  @Mutation
  setCurrent(current: any) {
    this.current = current;
  }

  @Mutation
  setFavorite(bool: boolean) {
    if (this.current) this.current.favorite = bool;
  }

  @Mutation
  setBookmark(bool: boolean) {
    if (this.current) this.current.bookmark = bool;
  }

  @Mutation
  setRating(rating: number) {
    if (this.current) this.current.rating = rating;
  }

  @Mutation
  setBornOn(date: number | null) {
    if (this.current) this.current.bornOn = date;
  }

  @Mutation
  setThumbnail(id: string) {
    if (this.current) {
      if (!this.current.thumbnail)
        this.current.thumbnail = { _id: id, color: null };
      this.current.thumbnail._id = id;
    }
  }

  @Mutation
  setLabels(labels: { _id: string; name: string }[]) {
    if (this.current) this.current.labels = labels;
  }

  @Mutation
  setCustomFields(fields: any) {
    if (this.current) this.current.customFields = fields;
  }
}

import store from "./index";
import IActor from "@/types/actor";
export const actorModule = new ActorModule({ store, name: "actor" });
