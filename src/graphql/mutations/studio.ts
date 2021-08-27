import { getConfig } from "../../config";
import { ApplyStudioLabelsEnum } from "../../config/schema";
import { collections } from "../../database";
import { onStudioCreate } from "../../plugins/events/studio";
import { indexStudios, removeStudio } from "../../search/studio";
import Image from "../../types/image";
import Label from "../../types/label";
import LabelledItem from "../../types/labelled_item";
import Movie from "../../types/movie";
import Scene from "../../types/scene";
import Studio from "../../types/studio";
import { logger } from "../../utils/logger";
import { filterInvalidAliases, isArrayEq } from "../../utils/misc";
import { Dictionary } from "../../utils/types";

// Used as interface, but typescript still complains
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type IStudioUpdateOpts = Partial<{
  name: string;
  description: string;
  url: string;
  thumbnail: string;
  favorite: boolean;
  bookmark: number | null;
  parent: string | null;
  labels: string[];
  aliases: string[];
  customFields: Dictionary<string[] | boolean | string | null>;
  rating: number;
}>;

async function runStudioPlugins(ids: string[]) {
  const updatedStudios = [] as Studio[];
  for (const id of ids) {
    let studio = await Studio.getById(id);

    if (studio) {
      const labels = (await Studio.getLabels(studio)).map((l) => l._id);
      studio = await onStudioCreate(studio, labels, "studioCustom");

      await Studio.setLabels(studio, labels);
      await collections.studios.upsert(studio._id, studio);

      updatedStudios.push(studio);
    }

    await indexStudios(updatedStudios);
  }
  return updatedStudios;
}

export default {
  async runStudioPlugins(_: unknown, { id }: { id: string }): Promise<Studio> {
    const result = await runStudioPlugins([id]);
    return result[0];
  },

  async addStudio(_: unknown, opts: { name: string; labels?: string[] }): Promise<Studio> {
    const config = getConfig();
    for (const label of opts.labels || []) {
      const labelInDb = await Label.getById(label);
      if (!labelInDb) throw new Error(`Label ${label} not found`);
    }

    let studio = new Studio(opts.name);

    const studioLabels = Array.isArray(opts.labels) ? opts.labels : [];

    try {
      studio = await onStudioCreate(studio, studioLabels);
    } catch (error) {
      logger.error(error);
    }

    await Studio.setLabels(studio, studioLabels);
    await collections.studios.upsert(studio._id, studio);

    if (config.matching.matchCreatedStudios) {
      await Studio.findUnmatchedScenes(
        studio,
        config.matching.applyStudioLabels.includes(
          ApplyStudioLabelsEnum.enum["event:studio:create"]
        )
          ? studioLabels
          : []
      );
    }

    await indexStudios([studio]);
    return studio;
  },

  async updateStudios(
    _: unknown,
    { ids, opts }: { ids: string[]; opts: IStudioUpdateOpts }
  ): Promise<Studio[]> {
    const config = getConfig();
    const updatedStudios = [] as Studio[];

    let didLabelsChange = false;

    for (const id of ids) {
      const studio = await Studio.getById(id);

      if (studio) {
        if (typeof opts.name === "string") {
          studio.name = opts.name.trim();
        }

        if (Array.isArray(opts.aliases)) {
          studio.aliases = [...new Set(filterInvalidAliases(opts.aliases))];
        }

        if (Array.isArray(opts.aliases)) {
          studio.aliases = [...new Set(opts.aliases)];
        }

        if (typeof opts.description === "string") {
          studio.description = opts.description.trim();
        }

        if (typeof opts.url === "string") {
          studio.url = opts.url.trim();
        }

        if (typeof opts.thumbnail === "string") {
          studio.thumbnail = opts.thumbnail;
        }

        if (opts.parent !== undefined) {
          studio.parent = opts.parent;
        }

        if (typeof opts.rating === "number") {
          studio.rating = opts.rating;
        }

        if (typeof opts.bookmark === "number" || opts.bookmark === null) {
          studio.bookmark = opts.bookmark;
        }

        if (typeof opts.favorite === "boolean") {
          studio.favorite = opts.favorite;
        }

        if (Array.isArray(opts.labels)) {
          const oldLabels = await Studio.getLabels(studio);
          await Studio.setLabels(studio, opts.labels);
          if (
            !isArrayEq(
              oldLabels,
              opts.labels,
              (l) => l._id,
              (l) => l
            )
          ) {
            didLabelsChange = true;
          }
        }

        if (opts.customFields) {
          for (const key in opts.customFields) {
            const value = opts.customFields[key] !== undefined ? opts.customFields[key] : null;
            logger.debug(`Set studio custom.${key} to ${JSON.stringify(value)}`);
            opts.customFields[key] = value;
          }
          studio.customFields = opts.customFields;
        }

        await collections.studios.upsert(studio._id, studio);

        if (didLabelsChange) {
          const labelsToPush = config.matching.applyStudioLabels.includes(
            ApplyStudioLabelsEnum.enum["event:studio:update"]
          )
            ? (await Studio.getLabels(studio)).map((l) => l._id)
            : [];
          await Studio.pushLabelsToCurrentScenes(studio, labelsToPush).catch((err) => {
            logger.error(`Error while pushing studio "${studio.name}"'s labels to scenes`);
            logger.error(err);
          });
        }

        updatedStudios.push(studio);
      }
    }

    await indexStudios(updatedStudios);
    return updatedStudios;
  },

  async removeStudios(_: unknown, { ids }: { ids: string[] }): Promise<boolean> {
    for (const id of ids) {
      const studio = await Studio.getById(id);

      if (studio) {
        await collections.studios.remove(studio._id);
        await removeStudio(studio._id);
        await Studio.filterParentStudio(studio._id);
        await Scene.filterStudio(studio._id);
        await Movie.filterStudio(studio._id);
        await Image.filterStudio(studio._id);

        await LabelledItem.removeByItem(studio._id);
      }
    }
    return true;
  },

  async attachStudioToUnmatchedScenes(_: unknown, { id }: { id: string }): Promise<Studio | null> {
    const config = getConfig();

    const studio = await Studio.getById(id);
    if (!studio) {
      logger.error(`Did not find studio for id "${id}" to attach to unmatched scenes`);
      return null;
    }

    if (studio) {
      try {
        const labelsToPush = config.matching.applyStudioLabels.includes(
          ApplyStudioLabelsEnum.enum["event:studio:find-unmatched-scenes"]
        )
          ? (await Studio.getLabels(studio)).map((l) => l._id)
          : [];

        await Studio.findUnmatchedScenes(studio, labelsToPush);
      } catch (err) {
        logger.error(`Error attaching "${studio.name}" to new scenes`);
        logger.error(err);
        return null;
      }
    }

    return studio;
  },
};
