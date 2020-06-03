import { processingCollection } from "../database/index";
import * as logger from "../logger";

export interface ISceneProcessingItem {
  _id: string;
}

let processing = false;

export function setProcessingStatus(value: boolean): void {
  processing = value;
}

export function isProcessing(): boolean {
  return processing;
}

export function removeSceneFromQueue(_id: string): Promise<ISceneProcessingItem> {
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

export function enqueueScene(_id: string): Promise<ISceneProcessingItem> {
  return processingCollection.upsert(_id, { _id });
}
