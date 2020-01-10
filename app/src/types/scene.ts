import IActor from "./actor";

export default interface IScene {
  _id: string;
  addedOn: number;
  name: string;
  releaseDate: number | null;
  description: string | null;
  rating: number | null;
  favorite: boolean;
  bookmark: boolean;
  actors: IActor[];
  studio: any;
  labels: {
    _id: string;
    name: string;
  }[];
  thumbnail: {
    _id: string;
    color: string | null;
  } | null;
  preview: {
    _id: string;
  } | null;
  meta: {
    size: number;
    duration: number;
    dimensions: {
      width: number;
      height: number;
    };
  };
  watches: number[];
  streamLinks: string[];
  customFields: { [key: string]: any };
  availableFields: {
    _id: string;
    name: string;
    values?: string[];
    type: string;
    unit: string | null;
  }[];
}
