import { database } from "../database";
import Actor from "../types/actor";
import Label from "../types/label";

interface HashMap<T> {
  [key: string]: T;
}

type AnyMap = HashMap<any>;

export default {
  getActorById(args: AnyMap) {
    return Actor.getById(args.id);
  },
  getActors() {
    return Actor.getAll();
  },
  findActors(args: AnyMap) {
    return Actor.find(args.name);
  },
  addActor(args: AnyMap) {
    const actor = new Actor(args.name)

    database
      .get('actors')
      .push(actor)
      .write();

    return actor;
  },

  getLabelById(args: AnyMap) {
    return Label.getById(args.id);
  },
  getLabels() {
    return Label.getAll();
  },
  addLabel(args: AnyMap) {
    const label = new Label(args.name, args.aliases);

    database
      .get("labels")
      .push(label)
      .write();

    return label;
  },
  findLabel(args: AnyMap) {
    return Label.find(args.name);
  }
};