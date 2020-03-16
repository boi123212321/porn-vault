import express from "express";
import * as logger from "./logger";
import Image from "./types/image";
import Scene from "./types/scene";
import * as path from "path";
import { checkPassword, passwordHandler } from "./password";
import { getConfig, watchConfig } from "./config/index";
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
import BROKEN_IMAGE from "./broken_image";
import { mountApolloServer } from "./apollo";
import { buildIndices } from "./search";
import { checkImportFolders } from "./import/index";
import cors from "./middlewares/cors";
import { spawnTwigs } from "./twigs";
import { httpLog } from "./logger";
import { renderHandlebars } from "./render";
import { dvdRenderer } from "./dvd_renderer";

logger.message(
  "Check https://github.com/boi123212321/porn-manager for discussion & updates"
);

let serverReady = false;
export let indexing = false;
let setupMessage = "Setting up...";

async function scanFolders() {
  logger.warn("Scanning folders...");

  await checkVideoFolders();
  checkImageFolders();

  logger.log(`Processing ${await ProcessingQueue.getLength()} videos...`);

  ProcessingQueue.processLoop();
}

export default async () => {
  const app = express();
  app.use(cors);

  app.use(httpLog);

  app.get("/setup", (req, res) => {
    res.json({
      serverReady,
      setupMessage
    });
  });

  app.get("/", async (req, res, next) => {
    if (serverReady) next();
    else {
      res.status(404).send(
        await renderHandlebars("./views/setup.html", {
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

  const config = getConfig();

  const port = config.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on Port ${port}`);
  });

  app.use("/js", express.static("./app/dist/js"));
  app.use("/css", express.static("./app/dist/css"));
  app.use("/fonts", express.static("./app/dist/fonts"));
  app.use("/previews", express.static("./library/previews"));
  app.use("/assets", express.static("./assets"));
  app.get("/dvd-renderer/:id", dvdRenderer);

  app.get("/password", checkPassword);

  app.use(passwordHandler);

  app.get("/", async (req, res) => {
    const file = path.join(process.cwd(), "app/dist/index.html");

    if (await existsAsync(file)) res.sendFile(file);
    else {
      return res.status(404).send(
        await renderHandlebars("./views/error.html", {
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

  mountApolloServer(app);

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

  app.get("/force-scan", (req, res) => {
    scanFolders();
    res.json("Started scan.");
  });

  if (config.BACKUP_ON_STARTUP === true) {
    setupMessage = "Creating backup...";
    await createBackup(config.MAX_BACKUP_AMOUNT || 10);
  }

  setupMessage = "Loading database...";
  await loadStores();
  ProcessingQueue.setStore(database.store.queue);

  setupMessage = "Checking imports...";
  await checkImportFolders();

  await spawnTwigs();

  indexing = true;
  buildIndices()
    .then(() => {
      indexing = false;
    })
    .catch(err => {
      logger.error(err);
    });

  checkSceneSources();
  checkImageSources();
  checkPreviews();

  serverReady = true;

  watchConfig();

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
