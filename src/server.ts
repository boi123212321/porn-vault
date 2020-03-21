import express from "express";
import * as logger from "./logger";
import Image from "./types/image";
import Scene from "./types/scene";
import * as path from "path";
import { checkPassword, passwordHandler } from "./password";
import { getConfig, watchConfig } from "./config/index";
import { checkVideoFolders, checkImageFolders } from "./queue/check";
import { checkSceneSources, checkImageSources } from "./integrity";
import { loadStores } from "./database/index";
import { existsAsync } from "./fs/async";
import { createBackup } from "./backup";
import BROKEN_IMAGE from "./broken_image";
import { mountApolloServer } from "./apollo";
import { buildIndices, twigsVersion } from "./search";
import { checkImportFolders } from "./import/index";
import cors from "./middlewares/cors";
import { spawnTwigs } from "./twigs";
import { httpLog } from "./logger";
import { renderHandlebars } from "./render";
import { dvdRenderer } from "./dvd_renderer";
import {
  getLength,
  isProcessing,
  setProcessingStatus
} from "./queue/processing";
import queueRouter from "./queue_router";
import { spawn } from "child_process";
import { clearSceneIndex } from "./search/scene";
import { clearImageIndex } from "./search/image";

logger.message(
  "Check https://github.com/boi123212321/porn-manager for discussion & updates"
);

let serverReady = false;
let setupMessage = "Setting up...";

async function tryStartProcessing() {
  if ((await getLength()) > 0 && !isProcessing()) {
    logger.message("Starting processing worker...");
    setProcessingStatus(true);
    spawn(
      process.argv[0],
      [process.argv[1], "--process-queue"].filter(Boolean),
      {
        cwd: process.cwd(),
        detached: false,
        stdio: "inherit"
      }
    ).on("exit", code => {
      logger.log("Processing process exited with code " + code);
      setProcessingStatus(false);
    });
  }
}

async function scanFolders() {
  logger.warn("Scanning folders...");

  await checkVideoFolders();
  checkImageFolders();

  tryStartProcessing().catch(err => {
    logger.error("Couldn't start processing...");
    logger.error(err.message);
  });
}

export default async () => {
  const app = express();
  app.use(express.json());
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

  app.get("/log", async (req, res) => {
    res.json(logger.getLog());
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
  await loadStores();

  setupMessage = "Checking imports...";
  await checkImportFolders();

  setupMessage = "Starting search engine...";
  if (await twigsVersion()) {
    logger.log("Twigs already running, clearing indices...");
    await clearSceneIndex();
    await clearImageIndex();
  } else {
    await spawnTwigs();
  }

  setupMessage = "Building search indices...";
  await buildIndices();

  serverReady = true;

  checkSceneSources();
  checkImageSources();
  // checkPreviews();

  watchConfig();

  if (config.SCAN_ON_STARTUP) {
    scanFolders();
    setInterval(scanFolders, config.SCAN_INTERVAL);
  } else {
    logger.warn(
      "Scanning folders is currently disabled. Enable in config.json & restart."
    );
  }
};
