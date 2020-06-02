import * as express from "express";

import { getConfig } from "./config/index";
import { renderHandlebars } from "./render";
import Image from "./types/image";
import Movie from "./types/movie";
import Studio from "./types/studio";

export async function dvdRenderer(req: express.Request, res: express.Response): Promise<void> {
  const config = getConfig();
  const movie = await Movie.getById(req.params.id);

  if (!movie) {
    res.status(404).send(
      await renderHandlebars("./views/error.html", {
        code: 404,
        message: `Movie <b>${req.params.id}</b> not found`,
      })
    );
  } else {
    const color = movie.frontCover ? (await Image.getById(movie.frontCover))?.color : "";

    const studioName = movie.studio ? (await Studio.getById(movie.studio))?.name : "";

    const imageOrNull = function (id: string | null) {
      return id ? `/image/${id}?password=${config.PASSWORD}` : null;
    };

    res.status(200).send(
      await renderHandlebars("./views/dvd-renderer.html", {
        color,
        movieName: movie.name,
        studioName,
        light: req.query.light === "true",
        frontCover: imageOrNull(movie.frontCover),
        backCover: imageOrNull(movie.backCover),
        spineCover: imageOrNull(movie.spineCover),
      })
    );
  }
}
