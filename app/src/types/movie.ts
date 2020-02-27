import IActor from "./actor";
import IScene from "./scene";

export default interface IMovie {
  _id: string;
  name: string;
  description: string | null;
  releaseDate: number | null;
  rating: number | null;
  favorite: boolean;
  bookmark: number | null;

  frontCover: {
    _id: string;
    color: string | null;
  } | null;
  backCover: {
    _id: string;
  } | null;
  spineCover: {
    _id: string;
  } | null;
  studio: any;
  scenes: IScene[];
  actors: IActor[];
  labels: {
    _id: string;
    name: string;
  }[];

  duration: number | null;
  size: number | null;
}
