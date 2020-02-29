import Handlebars from "handlebars";
import { existsAsync, readFileAsync } from "./fs/async";

export async function renderHandlebars(file: string, context: any) {
  const text = await readFileAsync(file, "utf-8");
  return Handlebars.compile(text)(context);
}
