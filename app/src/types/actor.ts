export default interface IActor {
  _id: string;
  name: string;
  bornOn: number | null;
  aliases: string[];
  rating: number | null;
  favorite: boolean;
  bookmark: boolean;
  labels: {
    _id: string;
    name: string;
  }[];
  thumbnail: {
    _id: string;
  };
}
