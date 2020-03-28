import { gql } from "apollo-server-express";

export default gql`
  type Dimensions {
    width: Long
    height: Long
  }

  type SceneMeta {
    size: Long
    duration: Int
    dimensions: Dimensions!
    fps: Float
  }

  type ScoredLabels {
    label: Label!
    score: Int!
  }

  extend type Query {
    numScenes: Int!
    getScenes(query: String, random: Int): [Scene!]!
    getSceneById(id: String!): Scene
    getScenesWithoutActors(num: Int): [Scene!]!
    getScenesWithoutLabels(num: Int): [Scene!]!
    getScenesWithoutStudios(num: Int): [Scene!]!
    getSceneLabelUsage: [ScoredLabels!]!
  }

  type Scene {
    _id: String!
    name: String!
    description: String
    addedOn: Long!
    releaseDate: Long
    favorite: Boolean!
    bookmark: Long
    rating: Int
    path: String
    streamLinks: [String!]!
    watches: [Long!]!
    meta: SceneMeta!
    customFields: Object!
    processed: Boolean

    # Resolvers
    availableFields: [CustomField!]!
    thumbnail: Image
    preview: Image
    images: [Image!]!
    actors: [Actor!]!
    labels: [Label!]!
    studio: Studio
    markers: [Marker!]!
    movies: [Movie!]!
  }

  input SceneUpdateOpts {
    favorite: Boolean
    bookmark: Long
    actors: [String!]
    name: String
    description: String
    rating: Int
    labels: [String!]
    streamLinks: [String!]
    thumbnail: String
    releaseDate: Long
    studio: String
    customFields: Object
  }

  extend type Mutation {
    addScene(name: String!, actors: [String!], labels: [String!]): Scene!
    screenshotScene(id: String!, sec: Float!): Image
    watchScene(id: String!): Scene!
    unwatchScene(id: String!): Scene!
    updateScenes(ids: [String!]!, opts: SceneUpdateOpts!): [Scene!]!
    removeScenes(ids: [String!]!, deleteImages: Boolean): Boolean!
    runScenePlugins(ids: [String!]!): [Scene!]!
    runAllScenePlugins: [Scene!]!
  }
`;
