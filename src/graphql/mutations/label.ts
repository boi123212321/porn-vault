import { database } from "../../database";
import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { Dictionary } from "../../types/utility";

export default {
  setLabelThumbnail(parent, args: Dictionary<any>) {
    const label = Label.getById(args.id);

    const imageInDb = Image.getById(args.image);

    if (!imageInDb)
      throw new Error(`Image ${args.image} not found`);

    if (label) {
      label.thumbnail = args.image;
      database.get('labels')
        .find({ id: label.id })
        .assign({ thumbnail: args.image })
        .write();
      return label;
    }
    else {
      throw new Error(`Label ${args.id} not found`);
    }
  },

  addLabel(parent, args: Dictionary<any>) {
    const label = new Label(args.name, args.aliases);

    database
      .get("labels")
      .push(label)
      .write();

    return label;
  },

  updateLabel(parent, args: Dictionary<any>) {
    const label = Label.getById(args.id);

    if (args.name)
      if (!args.name.length)
        throw new Error(`Invalid label name`);

    if (label) {
      label.name = args.name || label.name;
      label.aliases = args.aliases || label.aliases;

      label.aliases = label.aliases.filter(s => s && s.length);

      database.get('labels')
        .find({ id: label.id })
        .assign(label)
        .write();

      return label;
    }
    else {
      throw new Error(`Label ${args.id} not found`);
    }
  },

  removeLabel(parent, args: Dictionary<any>) {
    const label = Label.getById(args.id);

    if (label) {
      Label.remove(label.id);

      Actor.filterLabel(label.id);
      Image.filterLabel(label.id);
      Scene.filterLabel(label.id);

      return true;
    }
    else {
      throw new Error(`Label ${args.id} not found`);
    }
  }
}