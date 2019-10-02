import express from "express"
import * as logger from "./logger";
import { ApolloServer, gql } from "apollo-server-express";

const app = express();

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`${req.method} request to ${req.originalUrl}: ${new Date().toUTCString()}`);
  next();
});

import types from "./graphql/types"
import resolvers from "./graphql/resolvers"

const server = new ApolloServer({ typeDefs: gql(types), resolvers });
server.applyMiddleware({ app, path: "/ql"  });

import "./ffmpeg";
import "./database";
import config from "./config";

app.listen(3000, () => {
  logger.SUCCESS("Server running on Port 3000");
  console.log("Config:\n", config);
})