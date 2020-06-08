import express from "express";
import { readFileSync } from "fs";

import { getConfig } from "./config";
import * as logger from "./logger";
import { sha512 } from "./types/utility";

const SIGN_IN_HTML = readFileSync("./views/signin.html", "utf-8");

export function checkPassword(
  req: express.Request,
  res: express.Response
): express.Response<any> | undefined {
  if (!req.query.password) return res.sendStatus(400);

  const config = getConfig();

  if (
    !config.PASSWORD ||
    sha512(req.query.password) === config.PASSWORD ||
    req.query.password === config.PASSWORD
  ) {
    return res.json(config.PASSWORD);
  }

  res.sendStatus(401);
}

export function passwordHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void | express.Response<any> {
  const config = getConfig();
  if (!config.PASSWORD) return next();

  if (
    req.headers["x-pass"] &&
    (req.headers["x-pass"] === config.PASSWORD ||
      sha512(<string>req.headers["x-pass"]) === config.PASSWORD)
  ) {
    logger.log("Auth OK");
    return next();
  }

  if (
    req.query.password &&
    (req.query.password === config.PASSWORD || sha512(req.query.password) === config.PASSWORD)
  ) {
    logger.log("Auth OK");
    return next();
  }

  try {
    return res.status(401).send(SIGN_IN_HTML);
  } catch (err) {
    console.error(err);
  }
}
