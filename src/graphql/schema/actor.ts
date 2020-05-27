import { gql } from "apollo-server-express";

export default gql`
  type Nationality {
    name: String!
    alpha2: String!
    nationality: String!
  }

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
    nationality: Nationality
  }

  type ActorGraph {
    actors: [Actor!]!
    links: Object!
  }

  type ActorSearchResults {
    numItems: Int!
    numPages: Int!
    items: [Actor!]!
  }

  extend type Query {
    numActors: Int!
    getActors(query: String, seed: String): ActorSearchResults!
    getActorById(id: String!): Actor
    topActors(skip: Int, take: Int): [Actor!]!
    getUnwatchedActors(skip: Int, take: Int): [Actor!]!

    getActorsWithoutScenes(num: Int): [Actor!]!
    getActorsWithoutLabels(num: Int): [Actor!]!
    actorGraph: ActorGraph!
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
    nationality: String
  }

  extend type Mutation {
    addActor(name: String!, aliases: [String!], labels: [String!]): Actor!
    updateActors(ids: [String!]!, opts: ActorUpdateOpts!): [Actor!]!
    removeActors(ids: [String!]!): Boolean!
    runActorPlugins(ids: [String!]!): [Actor!]!
    runAllActorPlugins: [Actor!]!
  }
`;
