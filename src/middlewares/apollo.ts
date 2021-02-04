import { ApolloServer } from "apollo-server-express";
import express from "express";
import { graphqlUploadExpress } from "graphql-upload";

import schema from "../graphql/types";

export function mountApolloServer(app: express.Application): void {
  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
      req,
    }),
    uploads: false,
    playground: !!process.env.PV_QL_PLAYGROUND,
  });
  app.use(graphqlUploadExpress());
  server.applyMiddleware({ app, path: "/ql" });
}
