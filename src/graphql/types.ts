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
  fps: Float
}

type ImageMeta {
  size: Long
  dimensions: Dimensions!
}

type QueueInfo {
  length: Int!
}

type Query {
  numScenes: Int!
  numActors: Int!
  numMovies: Int!
  numLabels: Int!
  numStudios: Int!
  numImages: Int!

  getScenes(query: String): [Scene!]!
  getActors(query: String): [Actor!]!
  getMovies(query: String): [Movie!]!
  getImages(query: String): [Image!]!
  getStudios(query: String): [Studio!]!

  getSceneById(id: String!): Scene

  getActorById(id: String!): Actor
  findActors(name: String!): [Actor!]

  getLabelById(id: String!): Label
  findLabel(name: String!): Label
  getLabels: [Label!]!

  getMovieById(id: String!): Movie

  getStudioById(id: String!): Studio

  getQueueInfo: QueueInfo!
}

type Actor {
  _id: String!
  name: String!
  aliases: [String!]!
  addedOn: Long!
  bornOn: Long
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  watches: [Long!]!
  #customFields
  
  # Resolvers
  labels: [Label!]!
  scenes: [Scene!]
  numScenes: Int!
  thumbnail: Image
  images: [Image!]!
}

type Label {
  _id: String!
  name: String!
  aliases: [String!]!
  addedOn: Long!
  
  # Resolvers
  thumbnail: Image
}

type Scene {
  _id: String!
  name: String!
  description: String
  addedOn: Long!
  releaseDate: Long
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  path: String
  streamLinks: [String!]!
  watches: [Long!]!
  meta: SceneMeta!
  #customFields
  
  # Resolvers
  thumbnail: Image
  images: [Image!]!
  actors: [Actor!]!
  labels: [Label!]!
  studio: Studio
}

type Image {
  _id: String!
  name: String!
  addedOn: Long!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  #customFields
  meta: ImageMeta!
  
  # Resolvers
  scene: Scene
  actors: [Actor!]!
  labels: [Label!]!
  thumbnail: Image
  studio: Studio
}

type Movie {
  _id: String!
  name: String!
  description: String
  addedOn: Long!
  releaseDate: Long
  favorite: Boolean!
  bookmark: Boolean!
  #customFields
  
  # Resolvers
  rating: Int # Inferred from scene ratings
  frontCover: Image
  backCover: Image
  scenes: [Scene!]!
  actors: [Actor!]!
  labels: [Label!]! # Inferred from scene labels
  duration: Long
  size: Long
  studio: Studio
}

type Studio {
  _id: String!
  name: String!
  description: String
  addedOn: Long!
  favorite: Boolean!
  bookmark: Boolean!
  #customFields
  
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
  studio: String
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
  studio: String
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
  studio: String
}

input StudioUpdateOpts {
  name: String
  description: String
  thumbnail: String
  favorite: Boolean
  bookmark: Boolean
  parent: String
  labels: [String!]
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

  uploadImage(file: Upload!, name: String, actors: [String!], labels: [String!], scene: String, crop: Crop, studio: String, lossless: Boolean): Image!
  updateImages(ids: [String!]!, opts: ImageUpdateOpts!): [Image!]!
  removeImages(ids: [String!]!): Boolean!
  
  addLabel(name: String!, aliases: [String!]): Label!
  updateLabels(ids: [String!]!, opts: LabelUpdateOpts!): [Label!]!
  removeLabels(ids: [String!]!): Boolean!
  
  addScene(name: String!, actors: [String!], labels: [String!]): Scene!
  watchScene(id: String!): Scene!
  uploadScene(file: Upload!, name: String, actors: [String!], labels: [String!]): Boolean!
  updateScenes(ids: [String!]!, opts: SceneUpdateOpts!): [Scene!]!
  removeScenes(ids: [String!]!, deleteImages: Boolean): Boolean!

  addMovie(name: String!, scenes: [String!]): Movie!
  updateMovies(ids: [String!]!, opts: MovieUpdateOpts!): [Movie!]!
  removeMovies(ids: [String!]!): Boolean!

  addStudio(name: String!): Studio!
  updateStudios(ids: [String!]!, opts: StudioUpdateOpts!): [Studio!]!
  removeStudios(ids: [String!]!): Boolean!
}
`;
