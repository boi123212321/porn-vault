import debug from "debug";
import * as url from "url";
import express from "express";

export const logStorage = [];

if (process.env.NODE_ENV == "development") {
  debug.enable("porn:*");
} else {
  debug.enable("porn:warn,porn:error,porn:message,porn:plugin");
}

export const log = debug("porn:log");
export const success = debug("porn:success");
export const http = debug("porn:http");
export const warn = debug("porn:warn");
export const error = debug("porn:error");
export const message = debug("porn:message");
export const search = debug("porn:search");
export const twigs = debug("porn:twigs");

export const httpLog = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const baseUrl = url.parse(req.url).pathname;
  http(`${req.method} ${baseUrl}: ${new Date().toLocaleString()}`);
  next();
};
