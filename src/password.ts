import express from "express";
import { getConfig } from "./config";
const sha = require("js-sha512").sha512;
import * as logger from "./logger/index";
import { readFileSync } from "fs";

const SIGN_IN_HTML = readFileSync("./views/signin.html", "utf-8");

export async function checkPassword(
  req: express.Request,
  res: express.Response
) {
  if (!req.query.password) return res.sendStatus(400);

  const config = getConfig();

  if (
    !config.PASSWORD ||
    sha(req.query.password) == config.PASSWORD ||
    req.query.password == config.PASSWORD
  ) {
    return res.json(config.PASSWORD);
  }

  res.sendStatus(401);
}

export async function passwordHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const config = getConfig();
  if (!config.PASSWORD) return next();

  if (
    req.headers["x-pass"] &&
    (req.headers["x-pass"] == config.PASSWORD ||
      sha(req.headers["x-pass"]) == config.PASSWORD)
  ) {
    logger.log("Auth OK");
    return next();
  }

  if (
    req.query.password &&
    (req.query.password == config.PASSWORD ||
      sha(req.query.password) == config.PASSWORD)
  ) {
    logger.log("Auth OK");
    return next();
  }

  try {
    return res.status(401).send(SIGN_IN_HTML);
  } catch (err) {
    console.error(err);
    return;
  }
}
