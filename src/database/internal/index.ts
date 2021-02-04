// TS bindings for Izzy
import Axios, { AxiosError, AxiosResponse } from "axios";

import { getConfig } from "../../config";
import { formatMessage, logger } from "../../utils/logger";

export namespace Izzy {
  export interface IIndexCreation {
    name: string;
    key: string;
  }

  export class Collection<T> {
    name: string;

    constructor(name: string) {
      this.name = name;
    }

    async count(): Promise<number> {
      logger.silly(`Getting collection count: ${this.name}`);
      const res = await Axios.get<{ count: number }>(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}/count`
      );
      return res.data.count;
    }

    async compact(): Promise<AxiosResponse<unknown>> {
      logger.silly(`Compacting collection: ${this.name}`);
      return Axios.post(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/compact/${this.name}`
      );
    }

    async upsert(id: string, obj: T): Promise<T> {
      logger.silly(`Upsert ${id} in collection: ${this.name}`);
      const res = await Axios.post<T>(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}/${id}`,
        obj
      );
      return res.data;
    }

    async remove(id: string): Promise<T> {
      logger.silly(`Remove ${id} in collection: ${this.name}`);
      const res = await Axios.delete<T>(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}/${id}`
      );
      return res.data;
    }

    async getAll(): Promise<T[]> {
      logger.silly(`Get all from collection: ${this.name}`);
      const res = await Axios.get<{ items: T[] }>(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}`
      );
      return res.data.items;
    }

    async get(id: string): Promise<T | null> {
      logger.silly(`Getting ${id} from collection: ${this.name}`);
      try {
        const res = await Axios.get(
          `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}/${id}`
        );
        return res.data as T;
      } catch (error) {
        const _err = error as AxiosError;
        if (!_err.response) {
          throw error;
        }
        if (_err.response.status === 404) {
          return null;
        }
        throw _err;
      }
    }

    async getBulk(items: string[]): Promise<T[]> {
      logger.silly(`Getting ${items.length} items in bulk from collection: ${this.name}`);
      const res = await Axios.post<{ items: T[] }>(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}/bulk`,
        { items }
      );
      const filtered = res.data.items.filter(Boolean);
      if (filtered.length < res.data.items.length) {
        logger.warn(
          `Retrieved some null value from getBulk (set logger to 'silly' for more info): `
        );
        logger.silly(`Before: ${formatMessage(res.data.items)}`);
        logger.silly(`After: ${formatMessage(filtered)}`);
        logger.verbose(
          "This is not breaking, but it does mean your database probably contains some invalid value or the search index is out of sync"
        );
      }
      return filtered;
    }

    async query(index: string, key: string | null): Promise<T[]> {
      logger.silly(`Querying index ${index} by ${key} from collection: ${this.name}`);
      const res = await Axios.get<{ items: T[] }>(
        `http://localhost:${getConfig().binaries.izzyPort}/collection/${this.name}/${index}/${key}`
      );
      return res.data.items;
    }
  }

  export async function createCollection<T>(
    name: string,
    file?: string | null,
    indexes = [] as IIndexCreation[]
  ): Promise<Collection<T>> {
    try {
      logger.silly(`Creating collection: ${name} (persistence: ${file})`);
      logger.silly(indexes);
      await Axios.post(`http://localhost:${getConfig().binaries.izzyPort}/collection/${name}`, {
        file,
        indexes,
      });

      return new Collection(name);
    } catch (error) {
      const _err = error as AxiosError;
      if (_err.response && _err.response.status === 409) {
        return new Collection(name);
      }
      throw _err;
    }
  }
}
