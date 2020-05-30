export interface ISceneRecyclingItem {
  _id: string;
}

import * as logger from "../logger";
import { recyclingCollection } from "../database/index";

export function removeSceneFromQueue(_id: string) {
  logger.log(`Removing ${_id} from recycling queue...`);
  return recyclingCollection.remove(_id);
}

export function getLength(): Promise<number> {
  return recyclingCollection.count();
}

export async function getHead(): Promise<ISceneRecyclingItem | null> {
  const items = await recyclingCollection.getAll();
  return items[0] || null;
}

export function enqueueScene(_id: string) {
  return recyclingCollection.upsert(_id, { _id });
}
