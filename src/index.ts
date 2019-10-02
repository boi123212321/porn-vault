import express from "express";
import graphql from "express-graphql";

const app = express();

app.get("/", (req, res) => res.send("OK"));

import schema from "./graphql/schema";
import root from "./graphql/root";

app.use(
  '/ql',
  graphql({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }),
);

import "./database";

app.listen(3000, () => {
  console.log("Server on Port 3000");
})