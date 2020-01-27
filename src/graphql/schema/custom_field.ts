import { gql } from "apollo-server-express";

export default gql`
  extend type Query {
    getCustomFields: [CustomField!]!
  }

  enum CustomFieldType {
    NUMBER
    STRING
    BOOLEAN
    SINGLE_SELECT
    MULTI_SELECT
  }

  enum CustomFieldTarget {
    SCENES
    ACTORS
    MOVIES
    IMAGES
    STUDIOS
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

  extend type Mutation {
    createCustomField(
      name: String!
      target: [CustomFieldTarget!]!
      type: CustomFieldType!
      values: [String!]
      unit: String
    ): CustomField!

    updateCustomField(
      id: String!
      name: String
      values: [String!]
      unit: String
    ): CustomField!

    removeCustomField(id: String!): Boolean!
  }
`;
