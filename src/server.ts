import express from "express";
import * as logger from "./logger";
import { ApolloServer, gql } from "apollo-server-express";
import Image from "./types/image";
import types from "./graphql/types";
import resolvers from "./graphql/resolvers";
import Scene from "./types/scene";
import * as path from "path";
import { checkPassword, passwordHandler } from "./password";
import cors from "cors";
import { getConfig } from "./config/index";
import ProcessingQueue from "./queue/index";
import {
  checkVideoFolders,
  checkImageFolders,
  checkPreviews
} from "./queue/check";
import * as database from "./database/index";
import { checkSceneSources, checkImageSources } from "./integrity";
import { loadStores } from "./database/index";
import { existsAsync } from "./fs/async";
import { createBackup } from "./backup";
import { buildImageIndex } from "./search/image";
import { buildSceneIndex } from "./search/scene";
import { buildActorIndex } from "./search/actor";
import { buildStudioIndex } from "./search/studio";
import { buildMovieIndex } from "./search/movie";
import BROKEN_IMAGE from "./broken_image";
import pug from "pug";

function isRegExp(regStr: string) {
  try {
    new RegExp(regStr);
  } catch (e) {
    return false;
  }
  return true;
}

logger.message(
  "Check https://github.com/boi123212321/porn-manager for discussion & updates"
);

let serverReady = false;
let setupMessage = "Setting up...";

export default async () => {
  const app = express();
  app.use(cors({ origin: "*" }));

  app.get("/setup", (req, res) => {
    res.json({
      serverReady,
      setupMessage
    });
  });

  app.get("/", (req, res, next) => {
    if (serverReady) next();
    else {
      res.status(404).send(
        pug.renderFile("./views/setup.pug", {
          code: 200,
          message: setupMessage
        })
      );
    }
  });

  app.get("/broken", (_, res) => {
    const b64 = BROKEN_IMAGE;

    var img = Buffer.from(b64, "base64");

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length
    });
    res.end(img);
  });

  app.use((req, res, next) => {
    logger.http(
      `${req.method} ${req.originalUrl}: ${new Date().toLocaleString()}`
    );
    next();
  });

  const config = await getConfig();

  const port = config.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on Port ${port}`);
  });

  app.use("/js", express.static("./app/dist/js"));
  app.use("/css", express.static("./app/dist/css"));
  app.use("/fonts", express.static("./app/dist/fonts"));
  app.use("/previews", express.static("./library/previews"));

  app.get("/password", checkPassword);

  app.use(passwordHandler);

  app.get("/", async (req, res) => {
    const file = path.join(process.cwd(), "app/dist/index.html");

    if (await existsAsync(file)) res.sendFile(file);
    else {
      return res.status(404).send(
        pug.renderFile("./views/error.pug", {
          code: 404,
          message: `File <b>${file}</b> not found`
        })
      );
    }
  });

  app.use("/scene/:scene", async (req, res, next) => {
    const scene = await Scene.getById(req.params.scene);

    if (scene && scene.path) {
      res.sendFile(scene.path);
    } else next(404);
  });

  app.use("/image/:image", async (req, res, next) => {
    const image = await Image.getById(req.params.image);

    if (image && image.path && (await existsAsync(image.path)))
      res.sendFile(image.path);
    else res.redirect("/broken");
  });

  const server = new ApolloServer({ typeDefs: gql(types), resolvers });
  server.applyMiddleware({ app, path: "/ql" });

  app.use(
    (
      err: number,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (typeof err == "number") return res.sendStatus(err);
      return res.sendStatus(500);
    }
  );

  if (config.BACKUP_ON_STARTUP === true) {
    setupMessage = "Creating backup...";
    await createBackup(config.MAX_BACKUP_AMOUNT || 10);
  }

  if (config.EXCLUDE_FILES && config.EXCLUDE_FILES.length) {
    for (const regStr of config.EXCLUDE_FILES) {
      if (!isRegExp(regStr)) {
        logger.error(`Invalid regex: '${regStr}'.`);
        process.exit(1);
      }
    }
  }

  async function scanFolders() {
    logger.warn("Scanning folders...");

    await checkVideoFolders();
    checkImageFolders();

    logger.log(`Processing ${await ProcessingQueue.getLength()} videos...`);

    ProcessingQueue.processLoop();
  }

  setupMessage = "Loading database...";

  await loadStores();

  setupMessage = "Creating search indices...";

  await buildImageIndex();
  await buildActorIndex();
  await buildSceneIndex();
  await buildStudioIndex();
  await buildMovieIndex();

  ProcessingQueue.setStore(database.store.queue);
  checkSceneSources();
  checkImageSources();
  checkPreviews();

  serverReady = true;

  if (config.SCAN_ON_STARTUP) {
    scanFolders();
    setInterval(scanFolders, config.SCAN_INTERVAL);
  } else {
    logger.warn(
      "Scanning folders is currently disabled. Enable in config.json & restart."
    );
    ProcessingQueue.processLoop();
  }
};
