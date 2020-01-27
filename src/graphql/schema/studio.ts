import { gql } from "apollo-server-express";

export default gql`
  extend type Query {
    numStudios: Int!
    getStudios(query: String): [Studio!]!
    getStudioById(id: String!): Studio
  }

  type Studio {
    _id: String!
    name: String!
    description: String
    addedOn: Long!
    favorite: Boolean!
    bookmark: Boolean!
    customFields: Object!
    aliases: [String!]

    # Resolvers
    parent: Studio
    substudios: [Studio!]!
    numScenes: Int!
    thumbnail: Image
    rating: Int # Inferred from scene ratings
    scenes: [Scene!]!
    labels: [Label!]! # Inferred from scene labels
    actors: [Actor!]! # Inferred from scene actors
    movies: [Movie!]!
  }

  input StudioUpdateOpts {
    name: String
    description: String
    thumbnail: String
    favorite: Boolean
    bookmark: Boolean
    parent: String
    labels: [String!]
    aliases: [String!]
  }

  extend type Mutation {
    addStudio(name: String!): Studio!
    updateStudios(ids: [String!]!, opts: StudioUpdateOpts!): [Studio!]!
    removeStudios(ids: [String!]!): Boolean!
  }
`;
