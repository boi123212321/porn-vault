type AttachedImage = {
  _id: string;
} | null;

export interface ICollabActor {
  _id: string;
  name: string;
  thumbnail: AttachedImage;
  avatar: AttachedImage;
}

export default interface IActor {
  _id: string;
  name: string;
  description: string | null;
  bornOn: number | null;
  age: number | null;
  aliases: string[];
  rating: number | null;
  favorite: boolean;
  bookmark: number | null;
  labels: {
    _id: string;
    name: string;
  }[];
  thumbnail: {
    _id: string;
    color: string | null;
  } | null;
  altThumbnail: {
    _id: string;
    color?: string | null;
  } | null;
  hero?: {
    _id: string;
    color?: string | null;
  } | null;
  avatar?: {
    _id: string;
    color?: string | null;
  } | null;
  customFields: { _id: string; name: string; values?: string[]; type: string };
  availableFields: {
    _id: string;
    name: string;
    values?: string[];
    type: string;
    unit: string | null;
  }[];
}
