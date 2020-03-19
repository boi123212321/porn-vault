import { gql } from "apollo-server-express";

export default gql`
  scalar Long
  scalar Object
  scalar Upload

  type IndexStatus {
    version: String!
    indexing: Boolean!
  }

  type Query {
    getQueueInfo: QueueInfo!
    twigs: IndexStatus
  }

  type Mutation {
    hello: String!
  }

  input Crop {
    left: Int!
    top: Int!
    width: Int!
    height: Int!
  }

  type QueueInfo {
    length: Int!
    processing: Boolean!
  }
`;
