// TS bindings for Gianna
import Axios from "axios";

import { getConfig } from "../../config";

export namespace Gianna {
  export interface ISearchResults {
    items: string[];
    max_items: number;
    message: string;
    num_items: number;
    num_pages: number;
    query: string | null;
    status: number;
  }

  export interface ISortOptions {
    sort_by: string;
    sort_asc: boolean;
    sort_type: string;
  }

  export interface IFilterCondition {
    property: string;
    type: string;
    operation: string;
    value: any;
  }

  export interface IFilterTreeGrouping {
    type: "AND" | "OR" | "NOT";
    children: (IFilterTreeGrouping | IFilterTreeTerminal)[];
  }

  export interface IFilterTreeTerminal {
    condition: IFilterCondition;
  }

  export interface ISearchOptions {
    query?: string;
    take?: number;
    skip?: number;
    filter?: IFilterTreeGrouping | IFilterTreeTerminal;
    sort?: ISortOptions;
  }

  export class Index<T extends { _id: string }> {
    name: string;

    constructor(name: string) {
      this.name = name;
    }

    async times(): Promise<[number, number][]> {
      const res = await Axios.get(
        `http://localhost:${getConfig().GIANNA_PORT}/index/${this.name}/times`
      );
      return res.data.query_times as [number, number][];
    }

    async clear(): Promise<void> {
      await Axios.delete(`http://localhost:${getConfig().GIANNA_PORT}/index/${this.name}/clear`);
    }

    async update(items: T[]): Promise<void> {
      await Axios.patch(`http://localhost:${getConfig().GIANNA_PORT}/index/${this.name}`, {
        items,
      });
    }

    async index(items: T[]): Promise<void> {
      await Axios.post(`http://localhost:${getConfig().GIANNA_PORT}/index/${this.name}`, {
        items,
      });
    }

    async remove(items: string[]): Promise<void> {
      await Axios.delete(`http://localhost:${getConfig().GIANNA_PORT}/index/${this.name}`, {
        data: {
          items,
        },
      });
    }

    async search(opts: ISearchOptions): Promise<ISearchResults> {
      const res = await Axios.post(
        `http://localhost:${getConfig().GIANNA_PORT}/index/${this.name}/search`,
        {
          filter: opts.filter,
          sort_by: opts.sort?.sort_by,
          sort_asc: opts.sort?.sort_asc,
          sort_type: opts.sort?.sort_type,
        },
        {
          params: {
            // hot fix, fix this in gianna eventually TODO:
            q: opts.query ? opts.query.trim().replace(/ {2,}/g, " ") : opts.query,
            take: opts.take,
            skip: opts.skip,
          },
        }
      );
      return res.data as ISearchResults;
    }
  }

  export async function createIndex(
    name: string,
    fields: string[]
  ): Promise<
    Index<{
      _id: string;
    }>
  > {
    await Axios.put(`http://localhost:${getConfig().GIANNA_PORT}/index/${name}`, {
      fields,
    });
    return new Index(name);
  }
}
