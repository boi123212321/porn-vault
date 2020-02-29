import { gql } from "apollo-server-express";

export default gql`
  type Image {
    _id: String!
    name: String!
    addedOn: Long!
    favorite: Boolean!
    bookmark: Long
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

  type ImageMeta {
    size: Long
    dimensions: Dimensions!
  }

  input ImageUpdateOpts {
    name: String
    rating: Int
    labels: [String!]
    actors: [String!]
    favorite: Boolean
    bookmark: Long
    studio: String
    scene: String
    customFields: Object
    color: String
  }

  extend type Query {
    numImages: Int!
    # auto = true will prevent thumbnails, previews and screenshots from being filtered out
    getImages(query: String, auto: Boolean): [Image!]!
    getImageById(id: String!): Image
  }

  extend type Mutation {
    uploadImage(
      file: Upload!
      name: String
      actors: [String!]
      labels: [String!]
      scene: String
      crop: Crop
      studio: String
      lossless: Boolean
      compress: Boolean
    ): Image!

    updateImages(ids: [String!]!, opts: ImageUpdateOpts!): [Image!]!

    removeImages(ids: [String!]!): Boolean!
  }
`;
