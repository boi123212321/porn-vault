import * as database from "../../database";
import Studio from "../../types/studio";
import Scene from "../../types/scene";
import Movie from "../../types/movie";
import Image from "../../types/image";
import { stripStr } from "../../extractor";
import * as logger from "../../logger/index";
import { getConfig } from "../../config/index";

type IStudioUpdateOpts = Partial<{
  name: string;
  description: string;
  thumbnail: string;
  favorite: boolean;
  bookmark: boolean;
  parent: string | null;
  labels: string[];
}>;

export default {
  async addStudio(_, { name }: { name: string }) {
    const studio = new Studio(name);

    for (const scene of await Scene.getAll()) {
      const perms = stripStr(scene.path || scene.name);

      if (scene.studio === null && perms.includes(stripStr(studio.name))) {
        await database.update(
          database.store.scenes,
          { _id: scene._id },
          {
            $set: {
              studio: studio._id
            }
          }
        );

        logger.log(`Updated studio of ${scene._id}`);
      }
    }

    await database.insert(database.store.studios, studio);
    return studio;
  },

  async updateStudios(
    _,
    { ids, opts }: { ids: string[]; opts: IStudioUpdateOpts }
  ) {
    const updatedStudios = [] as Studio[];

    for (const id of ids) {
      const studio = await Studio.getById(id);

      if (studio) {
        if (typeof opts.name == "string") studio.name = opts.name.trim();

        if (typeof opts.description == "string")
          studio.description = opts.description.trim();

        if (typeof opts.thumbnail == "string")
          studio.thumbnail = opts.thumbnail;

        if (opts.parent !== undefined) studio.parent = opts.parent;

        if (typeof opts.bookmark == "boolean") studio.bookmark = opts.bookmark;

        if (typeof opts.favorite == "boolean") studio.favorite = opts.favorite;

        if (Array.isArray(opts.labels))
          await Studio.setLabels(studio, opts.labels);

        await database.update(
          database.store.studios,
          { _id: studio._id },
          studio
        );
        updatedStudios.push(studio);
      }
    }

    return updatedStudios;
  },

  async removeStudios(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const studio = await Studio.getById(id);

      if (studio) {
        await Studio.remove(studio);
        await Studio.filterStudio(studio._id);
        await Scene.filterStudio(studio._id);
        await Movie.filterStudio(studio._id);
        await Image.filterStudio(studio._id);

        await database.remove(database.store.crossReferences, {
          from: studio._id
        });
        await database.remove(database.store.crossReferences, {
          to: studio._id
        });
      }
    }
    return true;
  }
};
