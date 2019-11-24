import IActor from "./actor";
import IScene from "./scene";

export default interface IMovie {
  _id: string;
  name: string;
  description: string | null;
  releaseDate: number | null;
  rating: number | null;
  favorite: boolean;
  bookmark: boolean;

  frontCover: {
    _id: string;
  };
  backCover: {
    _id: string;
  };

  scenes: IScene[];
  actors: IActor[];
  labels: {
    _id: string;
    name: string;
  }[];

  duration: number | null;
  size: number | null;
}
