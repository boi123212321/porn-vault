import Movie from "./types/movie";
import Studio from "./types/studio";
import Image from "./types/image";
import { renderHandlebars } from "./render";
import { getConfig } from "./config/index";
import * as express from "express";

export async function dvdRenderer(req: express.Request, res: express.Response) {
  const config = getConfig();
  const movie = await Movie.getById(req.params.id);

  if (!movie) {
    res.status(404).send(
      await renderHandlebars("./views/error.html", {
        code: 404,
        message: `Movie <b>${req.params.id}</b> not found`
      })
    );
  } else {
    const color = movie.frontCover
      ? (await Image.getById(movie.frontCover))?.color
      : "";

    const studioName = movie.studio
      ? (await Studio.getById(movie.studio))?.name
      : "";

    function imageOrNull(id: string | null) {
      return id ? `/image/${id}?password=${config.PASSWORD}` : null;
    }

    res.status(200).send(
      await renderHandlebars("./views/dvd-renderer.html", {
        color,
        movieName: movie.name,
        studioName,
        light: req.query.light == "true",
        frontCover: imageOrNull(movie.frontCover),
        backCover: imageOrNull(movie.backCover),
        spineCover: imageOrNull(movie.spineCover)
      })
    );
  }
}
