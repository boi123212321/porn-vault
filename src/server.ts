import express from "express";
import * as logger from "./logger";
import { ApolloServer, gql } from "apollo-server-express";
import Image from "./types/image";
import types from "./graphql/types";
import resolvers from "./graphql/resolvers";
import Scene from "./types/scene";
import * as path from "path";
import debugHandler from "./debug_handler";
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

export default async () => {
  const app = express();
  app.use(cors({ origin: "*" }));

  app.get("/broken", (_, res) => {
    const b64 =
      "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";
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

  app.use("/js", express.static("./app/dist/js"));
  app.use("/css", express.static("./app/dist/css"));
  app.use("/fonts", express.static("./app/dist/fonts"));
  app.use("/previews", express.static("./library/previews"));

  app.get("/password", checkPassword);

  app.use(passwordHandler);

  app.get("/debug", debugHandler);

  app.get("/", (req, res) => {
    const file = path.join(process.cwd(), "app/dist/index.html");
    res.sendFile(file);
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

  const config = await getConfig();

  if (config.BACKUP_ON_STARTUP === true) {
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

  await loadStores();

  const port = config.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on Port ${port}`);

    ProcessingQueue.setStore(database.store.queue);
    checkSceneSources();
    checkImageSources();
    checkPreviews();

    if (config.SCAN_ON_STARTUP) {
      scanFolders();
      setInterval(scanFolders, config.SCAN_INTERVAL);
    } else {
      logger.warn(
        "Scanning folders is currently disabled. Enable in config.json & restart."
      );
      ProcessingQueue.processLoop();
    }
  });
};
