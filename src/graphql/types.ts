export default `
scalar Long
scalar Object

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
  # auto = true will prevent thumbnails, previews and screenshots from being filtered out
  getImages(query: String, auto: Boolean): [Image!]!
  getStudios(query: String): [Studio!]!
  getLabels: [Label!]!
  getCustomFields: [CustomField!]!

  getSceneById(id: String!): Scene
  getActorById(id: String!): Actor
  getMovieById(id: String!): Movie
  getStudioById(id: String!): Studio
  getLabelById(id: String!): Label
  
  getQueueInfo: QueueInfo!
  topActors(num: Int): [Actor!]!
  getActorsWithoutScenes(num: Int): [Actor!]!
  getActorsWithoutLabels(num: Int): [Actor!]!
  getScenesWithoutActors(num: Int): [Scene!]!
  getScenesWithoutLabels(num: Int): [Scene!]!
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
  customFields: Object!
  
  # Resolvers
  availableFields: [CustomField!]!
  thumbnail: Image
  preview: Image
  images: [Image!]!
  actors: [Actor!]!
  labels: [Label!]!
  studio: Studio
  markers: [Marker!]!
}

type Image {
  _id: String!
  name: String!
  addedOn: Long!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  customFields: Object!
  meta: ImageMeta!
  
  # Resolvers
  scene: Scene
  actors: [Actor!]!
  labels: [Label!]!
  thumbnail: Image
  studio: Studio
  color: String
}

type Movie {
  _id: String!
  name: String!
  description: String
  addedOn: Long!
  releaseDate: Long
  favorite: Boolean!
  bookmark: Boolean!
  customFields: Object!
  
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
  customFields: Object!
  
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

enum CustomFieldType {
  NUMBER,
  STRING,
  BOOLEAN,
  SINGLE_SELECT,
  MULTI_SELECT
}

enum CustomFieldTarget {
  SCENES,
  ACTORS,
  MOVIES,
  IMAGES,
  STUDIOS,
  ALBUMS
}

type CustomField {
  _id: String!
  name: String!
  target: [CustomFieldTarget!]!
  type: CustomFieldType!
  values: [String!]
  unit: String
}

type Marker {
  _id: String!
  name: String!
  time: Int!
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

input ImageUpdateOpts {
  name: String
  rating: Int
  labels: [String!]
  actors: [String!]
  favorite: Boolean
  bookmark: Boolean
  studio: String
  scene: String
  customFields: Object
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
  customFields: Object
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
  customFields: Object
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
  unwatchScene(id: String!): Scene!
  uploadScene(file: Upload!, name: String, actors: [String!], labels: [String!]): Boolean!
  updateScenes(ids: [String!]!, opts: SceneUpdateOpts!): [Scene!]!
  removeScenes(ids: [String!]!, deleteImages: Boolean): Boolean!

  addMovie(name: String!, scenes: [String!]): Movie!
  updateMovies(ids: [String!]!, opts: MovieUpdateOpts!): [Movie!]!
  removeMovies(ids: [String!]!): Boolean!

  addStudio(name: String!): Studio!
  updateStudios(ids: [String!]!, opts: StudioUpdateOpts!): [Studio!]!
  removeStudios(ids: [String!]!): Boolean!

  createMarker(scene: String!, name: String!, time: Int!): Marker!
  removeMarkers(ids: [String!]!): Boolean!

  createCustomField(name: String!, target: [CustomFieldTarget!]!, type: CustomFieldType!, values: [String!], unit: String): CustomField!
  updateCustomField(id: String!, name: String, values: [String!], unit: String): CustomField!
  removeCustomField(id: String!): Boolean!
}
`;
