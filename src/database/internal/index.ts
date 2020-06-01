// TS bindings for Izzy

import Axios from "axios";
import { getConfig } from "../../config/index";

export namespace Izzy {
  export interface IIndexCreation {
    name: string;
    key: string;
  }

  export class Collection<T = any> {
    name: string;

    constructor(name) {
      this.name = name;
    }

    async count() {
      const res = await Axios.get(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${
          this.name
        }/count`
      );
      return res.data.count as number;
    }

    async compact() {
      return Axios.post(
        `http://localhost:${getConfig().IZZY_PORT}/collection/compact/${
          this.name
        }`
      );
    }

    async upsert(id: string, obj: T) {
      const res = await Axios.post(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${
          this.name
        }/${id}`,
        obj
      );
      return res.data as T;
    }

    async remove(id: string) {
      const res = await Axios.delete(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${
          this.name
        }/${id}`
      );
      return res.data as T;
    }

    async getAll() {
      const res = await Axios.get(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${this.name}`
      );
      return res.data.items as T[];
    }

    async get(id: string) {
      try {
        const res = await Axios.get(
          `http://localhost:${getConfig().IZZY_PORT}/collection/${
            this.name
          }/${id}`
        );
        return res.data as T;
      } catch (error) {
        if (!error.response) throw error;
        if (error.response.status == 404) return null;
        throw error;
      }
    }

    async getBulk(items: string[]) {
      const res = await Axios.post(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${
          this.name
        }/bulk`,
        { items }
      );
      return res.data.items as T[];
    }

    async query(index: string, key: string | null) {
      const res = await Axios.get(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${
          this.name
        }/${index}/${key}`
      );
      return res.data.items as T[];
    }

    async times() {
      const res = await Axios.get(
        `http://localhost:${getConfig().IZZY_PORT}/collection/${
          this.name
        }/times`
      );
      return res.data.query_times as [number, number][];
    }
  }

  export async function createCollection(
    name: string,
    file?: string | null,
    indexes = [] as IIndexCreation[]
  ) {
    await Axios.post(
      `http://localhost:${getConfig().IZZY_PORT}/collection/${name}`,
      {
        file,
        indexes,
      }
    );
    return new Collection(name);
  }
}
