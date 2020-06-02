import { ApolloServer } from "apollo-server-express";
import responseCachePlugin from "apollo-server-plugin-response-cache";
import express from "express";

import { getConfig } from "./config";
import schema from "./graphql/types";

export function mountApolloServer(app: express.Application): void {
  const config = getConfig();
  const server = new ApolloServer({
    plugins: [responseCachePlugin()],
    schema,
    cacheControl: {
      defaultMaxAge: Math.max(0, config.CACHE_TIME),
    },
    context: ({ req }) => ({
      req,
    }),
  });
  server.applyMiddleware({ app, path: "/ql" });
}
