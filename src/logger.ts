import debug from "debug";
import * as url from "url";
import express from "express";
import { getConfig } from "./config/index";
import { writeFileAsync } from "./fs/async";

if (process.env.NODE_ENV == "development") {
  debug.enable("porn:*");
} else {
  debug.enable("porn:warn,porn:error,porn:message,porn:plugin");
}

enum LogType {
  LOG = "log",
  WARN = "warn",
  ERROR = "error",
  SUCCESS = "success",
  HTTP = "http",
  MESSAGE = "message"
}

interface ILogData {
  type: LogType;
  text: string;
  date: number;
}

const logArray = [] as ILogData[];
export function getLog() {
  return logArray;
}

function createItem(type: LogType, text: string) {
  return {
    type,
    text,
    date: +new Date()
  } as ILogData;
}

function appendToLog(item: ILogData) {
  const config = getConfig();
  if (config && logArray.length == config.MAX_LOG_SIZE) logArray.shift();
  logArray.push(item);
}

export async function logToFile() {
  return writeFileAsync(
    `log-${new Date().toISOString()}`,
    JSON.stringify(logArray),
    "utf-8"
  );
}

function merge(...args: any[]) {
  return args
    .map(a => {
      const str = JSON.stringify(a);
      if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
      return str;
    })
    .join("\n");
}

export const log = (...args: any) => {
  const text = merge(...args);
  debug("porn:log")(text);
  appendToLog(createItem(LogType.LOG, text));
};
export const success = (...args: any) => {
  const text = merge(...args);
  debug("porn:success")(text);
  appendToLog(createItem(LogType.SUCCESS, text));
};
export const http = (...args: any) => {
  const text = merge(...args);
  debug("porn:http")(text);
  appendToLog(createItem(LogType.HTTP, text));
};
export const warn = (...args: any) => {
  const text = merge(...args);
  debug("porn:warn")(text);
  appendToLog(createItem(LogType.WARN, text));
};
export const error = (...args: any) => {
  const text = merge(...args);
  debug("porn:error")(text);
  appendToLog(createItem(LogType.ERROR, text));
};
export const message = (...args: any) => {
  const text = merge(...args);
  debug("porn:message")(text);
  appendToLog(createItem(LogType.MESSAGE, text));
};
// TODO: merge vvvvvvvvv
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
