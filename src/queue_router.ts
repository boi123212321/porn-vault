import { Router } from "express";
import { getHead, removeSceneFromQueue } from "./queue/processing";
import Scene from "./types/scene";
import Image from "./types/image";
import * as database from "./database/index";
import { indexImages } from "./search/image";

const router = Router();

router.delete("/:id", async (req, res) => {
  await removeSceneFromQueue(req.params.id);
  res.json(null);
});

router.post("/:id", async (req, res) => {
  await removeSceneFromQueue(req.params.id);
  if (req.body.scene) {
    await database.update(
      database.store.scenes,
      { _id: req.params.id },
      {
        $set: req.body.scene
      }
    );
  }
  if (req.body.images) {
    for (const image of req.body.images) {
      await database.insert(database.store.images, image);
      await indexImages([image]);
      const scene = await Scene.getById(image.scene);
      if (scene) {
        const actors = await Scene.getActors(scene);
        const labels = await Scene.getLabels(scene);
        await Image.setActors(
          image,
          actors.map(a => a._id)
        );
        await Image.setLabels(
          image,
          labels.map(a => a._id)
        );
      }
    }
  }
  if (req.body.thumbs) {
    for (const thumb of req.body.thumbs) {
      await database.insert(database.store.images, thumb);
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
