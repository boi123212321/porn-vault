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

type Query {
  getImages: [Image]

  getSceneById(id: String!): Scene
  getScenes: [Scene]

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
  id: String!
  name: String!
  aliases: [String!]!
  addedOn: Long!
  image: String
}

type Scene {
  id: String!
  name: String!
  addedOn: Long!
  releaseDate: String
  thumbnail: Image
  images: [Image!]!
  favorite: Boolean!
  bookmark: Boolean!
  rating: Int
  actors: [Actor!]!
  labels: [Label!]!
  streamLinks: [String!]!
  watches: [Long!]!
  meta: SceneMeta!
  #customFields
}

type Image {
  id: String!
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

type Mutation {
  addActor(name: String!, aliases: [String!]): Actor
  setActorFavorite(id: String!, bool: Boolean!): Actor
  setActorBookmark(id: String!, bool: Boolean!): Actor
  setActorName(id: String!, name: String!): Actor
  setActorRating(id: String!, rating: String!): Actor
  setActorLabels(id: String!, labels: [String!]!): Actor
  setActorAliases(id: String!, aliases: [String!]!): Actor
  setActorThumbnail(id: String!, image: String!): Actor
  removeActor(id: String!): Boolean

  uploadImage(file: Upload!, name: String, actors: [String!], labels: [String!], scene: String): Image
  setImageFavorite(id: String!, bool: Boolean!): Image
  setImageBookmark(id: String!, bool: Boolean!): Image
  setImageName(id: String!, name: String!): Image
  setImageRating(id: String!, rating: String!): Image
  setImageLabels(id: String!, labels: [String!]!): Image
  setImageActors(id: String!, actors: [String!]!): Image
  setImageThumbnail(id: String!, image: String!): Image
  removeImage(id: String!): Boolean
  
  addLabel(name: String!, aliases: [String!]): Label
  updateLabel(id: String!, name: String, aliases: [String!]): Label
  removeLabel(id: String!): Boolean
  
  addScene(name: String!, actors: [String!], labels: [String!]): Scene
  setSceneFavorite(id: String!, bool: Boolean!): Scene
  setSceneBookmark(id: String!, bool: Boolean!): Scene
  setSceneActors(id: String!, actors: [String!]!): Scene
  setSceneName(id: String!, name: String!): Scene
  setSceneRating(id: String!, rating: String!): Scene
  setSceneLabels(id: String!, labels: [String!]!): Scene
  setSceneStreamLinks(id: String!, urls: [String!]!): Scene
  setSceneThumbnail(id: String!, image: String!): Scene
  uploadScene(file: Upload!, name: String, actors: [String!], labels: [String!]): Scene
  removeScene(id: String!): Boolean
}
`;