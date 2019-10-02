export default `
scalar Long

type VideoDimensions {
  width: Long
  height: Long
}

type ImageMeta {
  size: Long
}

type SceneMeta {
  size: Long
  duration: Int
  dimensions: VideoDimensions!
}

type Query {
  getSceneById(id: String!): Scene
  getScenes: [Scene]
  getActorScenes(id: String!): [Scene]

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
  addedOn: Long!
  bornOn: Long
  images: [String!]!
  coverIndex: Int!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  labels: [String!]!
  scenes: [Scene!]
  #customFields
}

type Label {
  id: String!
  name: String!
  aliases: [String!]!
  addedOn: Long!
}

type Scene {
  id: String!
  name: String!
  addedOn: Long!
  releaseDate: String
  images: [String!]!
  coverIndex: Int!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  actors: [String!]!
  labels: [String!]!
  movies: [String!]!
  path: String
  streamLinks: [String!]!
  watches: [Long!]!
  meta: SceneMeta!
  #customFields
}

type Image {
  id: String!
  name: String!
  path: String!
  addedOn: Long!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  #customFields
  labels: [String!]!
  size: ImageMeta!
  scene: String
  actors: [String!]!
  movies: [String!]!
}

type Mutation {
  addActor(name: String!, aliases: [String!]): Actor
  addLabel(name: String!, aliases: [String!]): Label

  uploadScene(file: Upload!, name: String, actors: [String!], labels: [String!]): Scene
}
`;