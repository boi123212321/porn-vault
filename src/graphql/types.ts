export default `
scalar Long

type Dimensions {
  width: Long
  height: Long
}

type SceneMeta {
  size: Long
  duration: Int
  dimensions: Dimensions!
}

type ImageMeta {
  size: Long
  dimensions: Dimensions!
}

type QueueInfo {
  length: Int!
}

type Query {
  getScenes(query: String): [Scene!]!
  getActors(query: String): [Actor!]!
  getImages(query: String): [Image!]!

  getSceneById(id: String!): Scene

  getActorById(id: String!): Actor
  findActors(name: String!): [Actor!]

  getLabelById(id: String!): Label
  findLabel(name: String!): Label
  getLabels: [Label!]!

  getMovies: [Movie!]

  getQueueInfo: QueueInfo!
}

type Actor {
  _id: String!
  name: String!
  aliases: [String!]!
  addedOn: Long!
  bornOn: Long
  thumbnail: Image
  images: [Image!]!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  labels: [Label!]!
  scenes: [Scene!]
  #customFields
}

type Label {
  _id: String!
  name: String!
  aliases: [String!]!
  addedOn: Long!
  thumbnail: Image
}

type Scene {
  _id: String!
  name: String!
  description: String
  addedOn: Long!
  releaseDate: Long
  thumbnail: Image
  images: [Image!]!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  actors: [Actor!]!
  labels: [Label!]!
  path: String
  streamLinks: [String!]!
  watches: [Long!]!
  meta: SceneMeta!
  #customFields
}

type Image {
  _id: String!
  name: String!
  addedOn: Long!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  #customFields
  labels: [Label!]!
  meta: ImageMeta!
  scene: Scene
  actors: [Actor!]!
  thumbnail: Image
}

type Movie {
  _id: String!
  name: String!
  description: String
  addedOn: Long!
  releaseDate: Long
  frontCover: Image
  backCover: Image
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  scenes: [Scene!]!

  actors: [Actor!]!
  labels: [Label!]!
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
}

input ImageUpdateOpts {
  name: String
  rating: Int
  labels: [String!]
  actors: [String!]
  favorite: Boolean
  bookmark: Boolean
}

input LabelUpdateOpts {
  name: String
  aliases: [String!]
  thumbnail: String
}

input SceneUpdateOpts {
  favorite: Boolean
  bookmark: Boolean
  actors: [String!]
  name: String
  description: String
  rating: Int
  labels: [String!]
  streamLinks: [String!]
  thumbnail: String
  releaseDate: Long
}

input MovieUpdateOpts {
  name: String
  description: String
  releaseDate: Long
  frontCover: String
  backCover: String
  favorite: Boolean
  bookmark: Boolean
  rating: Int
  scenes: [String!]
}

input Crop {
  left: Int!
  top: Int!
  width: Int!
  height: Int!
}

type Mutation {
  addActor(name: String!, aliases: [String!], labels: [String!]): Actor!
  updateActors(ids: [String!]!, opts: ActorUpdateOpts!): [Actor!]!
  removeActors(ids: [String!]!): Boolean!

  uploadImage(file: Upload!, name: String, actors: [String!], labels: [String!], scene: String, crop: Crop): Image!
  addActorsToImage(id: String!, actors: [String!]!): Image!
  updateImages(ids: [String!]!, opts: ImageUpdateOpts!): [Image!]!
  removeImages(ids: [String!]!): Boolean!
  
  addLabel(name: String!, aliases: [String!]): Label!
  updateLabels(ids: [String!]!, opts: LabelUpdateOpts!): [Label!]!
  removeLabels(ids: [String!]!): Boolean!
  
  addScene(name: String!, actors: [String!], labels: [String!]): Scene!
  addActorsToScene(id: String!, actors: [String!]!): Scene!
  watchScene(id: String!): Scene!
  uploadScene(file: Upload!, name: String, actors: [String!], labels: [String!]): Boolean!
  updateScenes(ids: [String!]!, opts: SceneUpdateOpts!): [Scene!]!
  removeScenes(ids: [String!]!): Boolean!

  addMovie(name: String!, scenes: [String!]): Movie!
  addScenesToMovie(id: String!, scenes: [String!]!): Movie!
  updateMovies(ids: [String!]!, opts: MovieUpdateOpts!): [Movie!]!
  removeMovies(ids: [String!]!): Boolean!
}
`;
