import Image from "../types/image";

export async function imageWithPathExists(path: string) {
  const image = await Image.getImageByPath(path);
  return !!image;
}
