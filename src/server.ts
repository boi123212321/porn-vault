import boxen from "boxen";
import { spawn } from "child_process";
import express from "express";
import { readFileSync } from "fs";
import https from "https";
import LRU from "lru-cache";
import * as path from "path";

import { mountApolloServer } from "./apollo";
import { createBackup } from "./backup";
import BROKEN_IMAGE from "./broken_image";
import { getConfig, watchConfig } from "./config/index";
import { actorCollection, imageCollection, loadStores, sceneCollection } from "./database/index";
import { dvdRenderer } from "./dvd_renderer";
import { existsAsync } from "./fs/async";
import { giannaVersion, resetGianna, spawnGianna } from "./gianna";
import { checkImportFolders } from "./import/index";
import { izzyVersion, resetIzzy, spawnIzzy } from "./izzy";
import * as logger from "./logger";
import { httpLog } from "./logger";
import cors from "./middlewares/cors";
import { checkPassword, passwordHandler } from "./password";
import queueRouter from "./queue_router";
import { checkImageFolders, checkVideoFolders } from "./queue/check";
import { getLength, isProcessing, setProcessingStatus } from "./queue/processing";
import { renderHandlebars } from "./render";
import { buildIndices } from "./search";
import { index as imageIndex } from "./search/image";
import { index as sceneIndex } from "./search/scene";
import Actor from "./types/actor";
import Image from "./types/image";
import Scene from "./types/scene";

const cache = new LRU({
  max: 500,
  maxAge: 3600 * 1000,
});

let serverReady = false;
let setupMessage = "Setting up...";

async function tryStartProcessing() {
  const queueLen = await getLength();
  if (queueLen > 0 && !isProcessing()) {
    logger.message("Starting processing worker...");
    setProcessingStatus(true);
    spawn(process.argv[0], process.argv.slice(1).concat(["--process-queue"]), {
      cwd: process.cwd(),
      detached: false,
      stdio: "inherit",
    }).on("exit", (code) => {
      logger.warn(`Processing process exited with code ${code}`);
      setProcessingStatus(false);
    });
  } else if (!queueLen) {
    logger.success("No more videos to process.");
  }
}

async function scanFolders() {
  logger.message("Scanning folders...");
  await checkVideoFolders();
  logger.success("Scan done.");
  checkImageFolders();

  tryStartProcessing().catch((err) => {
    logger.error("Couldn't start processing...");
    logger.error(err.message);
  });
}

export default async (): Promise<void> => {
  logger.message("Check https://github.com/boi123212321/porn-vault for discussion & updates");

  const app = express();
  app.use(express.json());
  app.use(cors);

  app.use(httpLog);

  app.get("/label-usage/scenes", async (req, res) => {
    const cached = cache.get("scene-label-usage");
    if (cached) {
      logger.log("Using cached scene label usage");
      return res.json(cached);
    }
    const scores = await Scene.getLabelUsage();
    if (scores.length) {
      logger.log("Caching scene label usage");
      cache.set("scene-label-usage", scores);
    }
    res.json(scores);
  });

  app.get("/label-usage/actors", async (req, res) => {
    const cached = cache.get("actor-label-usage");
    if (cached) {
      logger.log("Using cached actor label usage");
      return res.json(cached);
    }
    const scores = await Actor.getLabelUsage();
    if (scores.length) {
      logger.log("Caching actor label usage");
      cache.set("actor-label-usage", scores);
    }
    res.json(scores);
  });

  app.get("/search/timings/scenes", async (req, res) => {
    res.json(await sceneIndex.times());
  });
  app.get("/search/timings/images", async (req, res) => {
    res.json(await imageIndex.times());
  });

  app.get("/debug/timings/scenes", async (req, res) => {
    res.json(await sceneCollection.times());
  });
  app.get("/debug/timings/actors", async (req, res) => {
    res.json(await actorCollection.times());
  });
  app.get("/debug/timings/images", async (req, res) => {
    res.json(await imageCollection.times());
  });

  app.get("/setup", (req, res) => {
    res.json({
      serverReady,
      setupMessage,
    });
  });

  app.get("/", async (req, res, next) => {
    if (serverReady) next();
    else {
      res.status(404).send(
        await renderHandlebars("./views/setup.html", {
          message: setupMessage,
        })
      );
    }
  });

  app.get("/broken", (_, res) => {
    const b64 = BROKEN_IMAGE;

    const img = Buffer.from(b64, "base64");

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length,
    });
    res.end(img);
  });

  const config = getConfig();

  const port = config.PORT || 3000;

  if (config.ENABLE_HTTPS) {
    https
      .createServer(
        {
          key: readFileSync(config.HTTPS_KEY),
          cert: readFileSync(config.HTTPS_CERT),
        },
        app
      )
      .listen(port, () => {
        logger.message(`HTTPS Server running on Port ${port}`);
      });
  } else {
    app.listen(port, () => {
      logger.message(`Server running on Port ${port}`);
    });
  }

  app.use("/js", express.static("./app/dist/js"));
  app.use("/css", express.static("./app/dist/css"));
  app.use("/fonts", express.static("./app/dist/fonts"));
  app.use("/previews", express.static("./library/previews"));
  app.use("/assets", express.static("./assets"));
  app.get("/dvd-renderer/:id", dvdRenderer);

  app.get("/flag/:code", async (req, res) => {
    res.redirect(`/assets/flags/${req.params.code.toLowerCase()}.svg`);
  });

  app.get("/password", checkPassword);

  app.use(passwordHandler);

  app.get("/", async (req, res) => {
    const file = path.join(process.cwd(), "app/dist/index.html");

    if (await existsAsync(file)) res.sendFile(file);
    else {
      return res.status(404).send(
        await renderHandlebars("./views/error.html", {
          code: 404,
          message: `File <b>${file}</b> not found`,
        })
      );
    }
  });

  app.use("/scene/:scene", async (req, res, next) => {
    const scene = await Scene.getById(req.params.scene);

    if (scene && scene.path) {
      const resolved = path.resolve(scene.path);
      res.sendFile(resolved);
    } else next(404);
  });

  app.use("/image/:image", async (req, res, next) => {
    const image = await Image.getById(req.params.image);

    if (image && image.path) {
      const resolved = path.resolve(image.path);
      if (!(await existsAsync(resolved))) res.redirect("/broken");
      else res.sendFile(resolved);
    } else res.redirect("/broken");
  });

  app.get("/log", async (req, res) => {
    res.json(logger.getLog());
  });

  mountApolloServer(app);

  app.use(
    (err: number, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (typeof err === "number") return res.sendStatus(err);
      return res.sendStatus(500);
    }
  );

  app.use("/queue", queueRouter);

  app.get("/force-scan", (req, res) => {
    scanFolders();
    res.json("Started scan.");
  });

  if (config.BACKUP_ON_STARTUP === true) {
    setupMessage = "Creating backup...";
    await createBackup(config.MAX_BACKUP_AMOUNT || 10);
  }

  setupMessage = "Loading database...";
  if (await izzyVersion()) {
    logger.log("Izzy already running, clearing...");
    await resetIzzy();
  } else {
    await spawnIzzy();
  }

  try {
    await loadStores();
  } catch (error) {
    logger.error(error);
    logger.error(`Error while loading database: ${error.message}`);
    logger.warn("Try restarting, if the error persists, your database may be corrupted");
    process.exit(1);
  }

  setupMessage = "Loading search engine...";
  if (await giannaVersion()) {
    logger.log("Gianna already running, clearing...");
    await resetGianna();
  } else {
    await spawnGianna();
  }

  setupMessage = "Checking imports...";
  await checkImportFolders();

  setupMessage = "Building search indices...";
  await buildIndices();

  serverReady = true;

  const protocol = config.ENABLE_HTTPS ? "https" : "http";

  console.log(
    boxen(`PORN VAULT READY\nOpen ${protocol}://localhost:${port}/`, {
      padding: 1,
      margin: 1,
    })
  );

  // checkPreviews();

  watchConfig();

  if (config.SCAN_ON_STARTUP) {
    await scanFolders();
  } else {
    logger.warn("Scanning folders is currently disabled. Enable in config.json & restart.");
  }

  if (config.DO_PROCESSING) {
    tryStartProcessing().catch((err) => {
      logger.error("Couldn't start processing...");
      logger.error(err.message);
    });
  }

  if (config.SCAN_INTERVAL > 0)
    setInterval(() => {
      scanFolders();
    }, config.SCAN_INTERVAL);
};
