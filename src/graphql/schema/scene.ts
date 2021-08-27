import { gql } from "apollo-server-express";

export default gql`
  type Dimensions {
    width: Long
    height: Long
  }

  type SceneMeta {
    size: Long
    duration: Float
    dimensions: Dimensions!
    fps: Float
    bitrate: Int
  }

  type AvailableStream {
    label: String!
    mimeType: String
    streamType: String!
    transcode: Boolean!
  }

  type SceneSearchResults {
    numItems: Int!
    numPages: Int!
    items: [Scene!]!
  }

  input SceneSearchQuery {
    query: String
    favorite: Boolean
    bookmark: Boolean
    rating: Int
    include: [String!]
    exclude: [String!]
    studios: [String!]
    actors: [String!]
    sortBy: String
    sortDir: String
    skip: Int
    take: Int
    page: Int
    durationMin: Int
    durationMax: Int
    unwatchedOnly: Boolean

    rawQuery: Json
  }

  extend type Query {
    numScenes: Int!
    getScenes(query: SceneSearchQuery!, seed: String): SceneSearchResults!
    getSceneById(id: String!): Scene
    getScenesWithoutActors(num: Int): [Scene!]!
    getScenesWithoutLabels(num: Int): [Scene!]!
    getScenesWithoutStudios(num: Int): [Scene!]!
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
    availableStreams: [AvailableStream!]!
  }

  type RunFFProbeResult {
    # TODO: use Json instead
    ffprobe: String
    scene: Scene!
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
    path: String
  }

  extend type Mutation {
    addScene(name: String!, actors: [String!], labels: [String!]): Scene!
    screenshotScene(id: String!, sec: Float!): Image
    watchScene(id: String!): Scene!
    unwatchScene(id: String!): Scene!
    updateScenes(ids: [String!]!, opts: SceneUpdateOpts!): [Scene!]!
    removeScenes(ids: [String!]!, deleteImages: Boolean): Boolean!
    runScenePlugins(id: String!): Scene
    runFFProbe(id: String!): RunFFProbeResult
  }
`;
