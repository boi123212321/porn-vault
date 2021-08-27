import { gql } from "apollo-server-express";

export default gql`
  type StudioSearchResults {
    numItems: Int!
    numPages: Int!
    items: [Studio!]!
  }

  input StudioSearchQuery {
    query: String
    favorite: Boolean
    bookmark: Boolean
    # rating: number;
    include: [String!]
    exclude: [String!]
    sortBy: String
    sortDir: String
    skip: Int
    take: Int
    page: Int

    rawQuery: Json
  }

  extend type Query {
    numStudios: Int!
    getStudios(query: StudioSearchQuery!, seed: String): StudioSearchResults!
    getStudioById(id: String!): Studio
  }

  type Studio {
    _id: String!
    name: String!
    description: String
    url: String
    addedOn: Long!
    favorite: Boolean!
    bookmark: Long
    customFields: Object!
    rating: Int!

    # Resolvers
    aliases: [String!]!
    averageRating: Float!
    parent: Studio
    substudios: [Studio!]!
    numScenes: Int!
    thumbnail: Image
    scenes: [Scene!]!
    labels: [Label!]! # Inferred from scene labels
    actors: [Actor!]! # Inferred from scene actors
    movies: [Movie!]!
    availableFields: [CustomField!]!
  }

  input StudioUpdateOpts {
    name: String
    description: String
    url: String
    thumbnail: String
    favorite: Boolean
    bookmark: Long
    parent: String
    labels: [String!]
    aliases: [String!]
    rating: Int
  }

  extend type Mutation {
    addStudio(name: String!, labels: [String!]): Studio!
    updateStudios(ids: [String!]!, opts: StudioUpdateOpts!): [Studio!]!
    removeStudios(ids: [String!]!): Boolean!
    runStudioPlugins(id: String!): Studio
    attachStudioToUnmatchedScenes(id: String!): Studio
  }
`;
