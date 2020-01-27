import { gql } from "apollo-server-express";

export default gql`
  type Marker {
    _id: String!
    name: String!
    time: Int!
  }

  extend type Mutation {
    createMarker(scene: String!, name: String!, time: Int!): Marker!
    removeMarkers(ids: [String!]!): Boolean!
  }
`;
