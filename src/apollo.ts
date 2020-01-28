import { ApolloServer } from "apollo-server-express";
import express from "express";
import schema from "./graphql/types";

export function mountApolloServer(app: express.Application) {
  const server = new ApolloServer({ schema });
  server.applyMiddleware({ app, path: "/ql" });
}
