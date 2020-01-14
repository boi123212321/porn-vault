import Image from "./types/image";

interface ISearchOptions<T> {
  query: string;
  skip?: number;
  take?: number;
  filters?: ((doc: T) => boolean)[];
  sort?: (a: T, b: T) => number;
}

class Index<T> {
  items: { [key: string]: T } = {};
  tokens: { [key: string]: string[] } = {};

  tokenizer: (t: T) => string[];
  identifier: (t: T) => string;

  constructor(tokenizer: (t: T) => string[], identifier: (t: T) => string) {
    this.tokenizer = tokenizer;
    this.identifier = identifier;
  }

  remove(id: string) {
    delete this.items[id];

    for (const key in this.tokens) {
      const arr = this.tokens[key];
      this.tokens[key] = arr.filter(s => s != id);
    }
  }

  rebuild() {
    this.clear();
    for (const item of Object.values(this.items)) {
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

    for (const token of tokens) {
      if (this.tokens[token] !== undefined)
        this.tokens[token].push(this.identifier(t));
      else this.tokens[token] = [this.identifier(t)];
    }

    this.items[this.identifier(t)] = t;
  }

  async search(search: ISearchOptions<T>) {
    const scores = {} as { [key: string]: number };

    const tokenizedQuery = tokenize(search.query);

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
            id,
            score: scores[id]
          });
      }
    } else {
      console.log("all docs...");
      foundDocs = Object.keys(this.items).map(id => ({
        id,
        score: 1
      }));
    }

    if (search.filters && search.filters.length) {
      const filterFuncs = search.filters;
      foundDocs = foundDocs.filter(d =>
        filterFuncs.every(f => f(this.items[d.id]))
      );
    }

    if (search.sort) {
      const sortFunc = search.sort;
      foundDocs.sort((a, b) => sortFunc(this.items[a.id], this.items[b.id]));
    } // Sort by relevance
    else foundDocs.sort((a, b) => b.score - a.score);

    console.log("Found " + foundDocs.length);

    if (search.skip !== undefined || search.take) {
      const skip = search.skip && search.skip >= 0 ? search.skip : 0;
      const take = search.take && search.take > 0 ? search.take : 1;

      const page = [] as { id: string; score: number }[];
      for (let i = skip; i < foundDocs.length && page.length < take; i++) {
        const doc = foundDocs[i];

        if (!search.filters) {
          page.push(doc);
        } else {
          if (search.filters.every(f => f(this.items[doc.id]))) page.push(doc);
        }
      }

      return page;
    }

    return foundDocs;
  }
}

export interface IImageSearchDoc {
  _id: string;
  addedOn: number;
  name: string;
  labels: { _id: string; name: string; aliases: string[] }[];
  rating: number;
  bookmark: boolean;
  favorite: boolean;
  scene: string | null;
}

export async function createImageSearchDoc(
  image: Image
): Promise<IImageSearchDoc> {
  const labels = await Image.getLabels(image);
  return {
    _id: image._id,
    addedOn: image.addedOn,
    name: image.name,
    labels: labels.map(l => ({
      _id: l._id,
      name: l.name,
      aliases: l.aliases
    })),
    rating: image.rating,
    bookmark: image.bookmark,
    favorite: image.favorite,
    scene: image.scene
  };
}

const tokenize = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .filter(s => /[a-z]/i.test(s))
    .filter(s => s.length > 1);

export const indices = {
  images: new Index(
    (doc: IImageSearchDoc) => {
      return [
        ...tokenize(doc.name),
        ...doc.labels.map(l => tokenize(l.name)).flat()
      ];
    },
    (image: IImageSearchDoc) => image._id
  )
};

export async function buildImageIndex() {
  const timeNow = +new Date();
  console.log("Building image index...");
  for (const image of await Image.getAll()) {
    indices.images.add(await createImageSearchDoc(image));
  }
  console.log(`Build done in ${(Date.now() - timeNow) / 1000}s.`);
}
