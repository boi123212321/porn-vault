import { Router } from "express";
import { getHead, removeSceneFromQueue } from "./queue/processing";
import Scene from "./types/scene";
import Image from "./types/image";
import { indexImages } from "./search/image";
import { imageCollection, sceneCollection } from "./database/index";
import * as logger from "./logger";
import { updateSceneDoc } from "./search/scene";

const router = Router();

router.delete("/:id", async (req, res) => {
  await removeSceneFromQueue(req.params.id);
  res.json(null);
});

router.post("/:id", async (req, res) => {
  await removeSceneFromQueue(req.params.id);
  const scene = await Scene.getById(req.params.id);

  if (scene) {
    if (req.body.scene) {
      Object.assign(scene, req.body.scene);
      logger.log("Merging scene data:", req.body.scene);
      await sceneCollection.upsert(req.params.id, scene);
      await updateSceneDoc(scene);
    }
    if (req.body.images) {
      for (const image of req.body.images) {
        logger.log("New image!", image);
        await imageCollection.upsert(image._id, image);
        await indexImages([image]);
        const actors = await Scene.getActors(scene);
        const labels = await Scene.getLabels(scene);
        await Image.setActors(
          image,
          actors.map((a) => a._id)
        );
        await Image.setLabels(
          image,
          labels.map((a) => a._id)
        );
      }
    }
    if (req.body.thumbs) {
      for (const thumb of req.body.thumbs) {
        logger.log("New thumbnail!", thumb);
        await imageCollection.upsert(thumb._id, thumb);
      }
    }
  }

  res.json(null);
});

router.get("/head", async (req, res) => {
  const queueHead = await getHead();
  if (!queueHead) return res.json(null);

  const scene = await Scene.getById(queueHead._id);
  if (!scene) return res.json(null);

  res.json(scene);
});

export default router;
