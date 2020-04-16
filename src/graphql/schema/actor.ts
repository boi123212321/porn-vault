import { gql } from "apollo-server-express";

export default gql`
  type Actor {
    _id: String!
    name: String!
    description: String
    aliases: [String!]!
    addedOn: Long!
    bornOn: Long
    favorite: Boolean!
    bookmark: Long
    rating: Int
    customFields: Object!

    # Resolvers
    age: Int
    availableFields: [CustomField!]!
    watches: [Long!]!
    labels: [Label!]!
    scenes: [Scene!]
    numScenes: Int!
    avatar: Image
    thumbnail: Image
    altThumbnail: Image
    hero: Image
    movies: [Movie!]!
    collabs: [Actor!]!
  }

  type ActorGraph {
    actors: [Actor!]!
    links: Object!
  }

  extend type Query {
    numActors: Int!
    getActors(query: String): [Actor!]!
    getActorById(id: String!): Actor
    topActors(num: Int): [Actor!]!
    getActorsWithoutScenes(num: Int): [Actor!]!
    getActorsWithoutLabels(num: Int): [Actor!]!
    actorGraph: ActorGraph!
    getActorLabelUsage: [ScoredLabels!]!
  }

  input ActorUpdateOpts {
    name: String
    description: String
    rating: Int
    labels: [String!]
    aliases: [String!]
    avatar: String
    thumbnail: String
    altThumbnail: String
    hero: String
    favorite: Boolean
    bookmark: Long
    bornOn: Long
    customFields: Object
  }

  extend type Mutation {
    addActor(name: String!, aliases: [String!], labels: [String!]): Actor!
    updateActors(ids: [String!]!, opts: ActorUpdateOpts!): [Actor!]!
    removeActors(ids: [String!]!): Boolean!
    runActorPlugins(ids: [String!]!): [Actor!]!
    runAllActorPlugins: [Actor!]!
  }
`;
