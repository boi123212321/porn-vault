import { tokenize } from "./tokenize";
import * as logger from "../logger/index";

export interface ISearchOptions<T> {
  query: string;
  skip?: number;
  take?: number;
  filters?: ((doc: T) => boolean)[];
  sort?: (a: T, b: T) => number;
  random?: boolean;
}

export class SearchIndex<T> {
  items: { [key: string]: T } = {};
  tokens: { [key: string]: string[] } = {};
  idMap: { [key: string]: string } = {};

  tokenizer: (t: T) => string[];
  identifier: (t: T) => string;

  idCounter = 0;

  constructor(tokenizer: (t: T) => string[], identifier: (t: T) => string) {
    this.tokenizer = tokenizer;
    this.identifier = identifier;
  }

  numTokens() {
    return Object.keys(this.tokens).length;
  }

  size() {
    return Object.keys(this.items).length;
  }

  remove(id: string) {
    delete this.items[id];

    for (const key in this.tokens) {
      const arr = this.tokens[key];
      this.tokens[key] = arr.filter(s => s != id);
    }
  }

  rebuild() {
    const items = this.items;
    this.clear();
    for (const item of Object.values(items)) {
      this.add(item);
    }
  }

  update(id: string, doc: T) {
    this.items[id] = doc;
  }

  clear() {
    this.tokens = {};
    this.items = {};
  }

  add(t: T) {
    const tokens = this.tokenizer(t);

    const id = (this.idCounter++).toString();
    const realId = this.identifier(t);
    this.idMap[id] = realId;

    for (const token of tokens) {
      if (this.tokens[token] !== undefined) this.tokens[token].push(id);
      else this.tokens[token] = [id];
    }

    this.items[realId] = t;
  }

  async search(search: ISearchOptions<T>) {
    const scores = {} as { [key: string]: number };

    logger.search(`Searching for '${search.query}'`);

    const tokenizedQuery = tokenize(search.query);

    logger.search(`Tokenized query`);

    let foundDocs = [] as { id: string; score: number }[];

    if (tokenizedQuery.length) {
      for (const token of tokenizedQuery) {
        const docs = this.tokens[token];

        if (docs) {
          for (const docId of docs) {
            if (scores[docId] !== undefined) scores[docId]++;
            else scores[docId] = 1;
          }
        }
      }

      for (const id in scores) {
        if (scores[id] > 0)
          foundDocs.push({
            id: this.idMap[id],
            score: scores[id]
          });
      }
    } else {
      logger.search(`No query: getting all items`);
      foundDocs = Object.keys(this.items).map(id => ({
        id,
        score: 1
      }));
    }

    logger.search(`Found ${foundDocs.length} candidates`);

    if (search.filters && search.filters.length) {
      const filterFuncs = search.filters;
      foundDocs = foundDocs.filter(
        d => this.items[d.id] && filterFuncs.every(f => f(this.items[d.id]))
      );
      logger.search(`Applied ${search.filters.length} filters`);
    }

    if (search.random) {
      return [foundDocs[Math.floor(Math.random() * foundDocs.length)]];
    }

    if (search.sort) {
      const sortFunc = search.sort;
      foundDocs.sort((a, b) => sortFunc(this.items[a.id], this.items[b.id]));
    } // Sort by relevance
    else foundDocs.sort((a, b) => b.score - a.score);

    logger.search(`Sorted result`);

    if (search.skip !== undefined || search.take) {
      const skip = search.skip && search.skip >= 0 ? search.skip : 0;
      const take = search.take && search.take > 0 ? search.take : 1;

      const page = [] as { id: string; score: number }[];
      for (let i = skip; i < foundDocs.length && page.length < take; i++) {
        const doc = foundDocs[i];
        page.push(doc);
      }

      logger.search(`Got page: ${page.length} items`);
      return page;
    }

    logger.search(`Returning all ${foundDocs.length} found items`);
    return foundDocs;
  }
}
