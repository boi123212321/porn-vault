import { gql } from "apollo-server-express";

export default gql`
  type Actor {
    _id: String!
    name: String!
    aliases: [String!]!
    addedOn: Long!
    bornOn: Long
    favorite: Boolean!
    bookmark: Boolean!
    rating: Int
    customFields: Object!

    # Resolvers
    availableFields: [CustomField!]!
    watches: [Long!]!
    labels: [Label!]!
    scenes: [Scene!]
    numScenes: Int!
    thumbnail: Image
    images: [Image!]!
  }

  extend type Query {
    numActors: Int!
    getActors(query: String): [Actor!]!
    getActorById(id: String!): Actor
    topActors(num: Int): [Actor!]!
    getActorsWithoutScenes(num: Int): [Actor!]!
    getActorsWithoutLabels(num: Int): [Actor!]!
  }

  input ActorUpdateOpts {
    name: String
    rating: Int
    labels: [String!]
    aliases: [String!]
    thumbnail: String
    favorite: Boolean
    bookmark: Boolean
    bornOn: Long
    customFields: Object
  }

  extend type Mutation {
    addActor(name: String!, aliases: [String!], labels: [String!]): Actor!
    updateActors(ids: [String!]!, opts: ActorUpdateOpts!): [Actor!]!
    removeActors(ids: [String!]!): Boolean!
    runActorPlugins(ids: [String!]!): [Actor!]!
  }
`;
