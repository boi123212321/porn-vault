export interface ISceneProcessingItem {
  _id: string;
}

import * as logger from "../logger";
import { processingCollection } from "../database/index";

let processing = false;

export function setProcessingStatus(value: boolean) {
  processing = value;
}

export function isProcessing() {
  return processing;
}

export function removeSceneFromQueue(_id: string) {
  logger.log(`Removing ${_id} from processing queue...`);
  return processingCollection.remove(_id);
}

export function getLength(): Promise<number> {
  return processingCollection.count();
}

export async function getHead(): Promise<ISceneProcessingItem | null> {
  const items = await processingCollection.getAll();
  return items[0] || null;
}

export function enqueueScene(_id: string) {
  return processingCollection.upsert(_id, { _id });
}
