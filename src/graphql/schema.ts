import { buildSchema } from "graphql";

export default buildSchema(`
type Query {
  getActorById(id: String!): Actor
  findActors(name: String!): [Actor]
  getActors: [Actor]

  getLabelById(id: String!): Label
  findLabel(name: String!): Label
  getLabels: [Label]
}

type Actor {
  id: String!
  name: String!
  aliases: [String!]!
  addedOn: Int!
  bornOn: Int
  thumbnails: [String!]!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  labels: [String!]!
}

type Label {
  id: String!
  name: String!
  aliases: [String!]!
  addedOn: Int!
}

type Mutation {
  addActor(name: String!): Actor
  addLabel(name: String!, aliases: [String!]): Label
}
`);