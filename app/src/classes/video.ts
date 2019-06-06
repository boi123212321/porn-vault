import { hash } from '@/util/generator';
import { CustomFieldValue } from './common';
const { shell } = require("electron");

export default class Video {
  id: string = hash();
  title: string = "";
  path: string = "";
  description: string | null = null;
  addedOn: number = +new Date();
  actors: string[] = [];
  releaseDate: string | null = null;
  thumbnails: string[] = [];
  size: number = 0;
  coverIndex: number = 0;
  labels: string[] = [];
  favorite: boolean = false;
  bookmark: boolean = false;
  rating: number = 0;
  customFields: CustomFieldValue = {};
  collection: string | null = null;
  watches: number[] = []; // Array of timestamps of watches
  duration: number = 0;
  dimensions: { width: number, height: number } = { width: 0, height: 0 };

  static create(file: File | { name: string, path: string, size: number }): Video {
    let video = new Video();
    video.title = file.name;
    video.path = file.path;
    video.size = file.size;
    return video;
  }

  open(): void {
    shell.openItem(this.path);
  }
}