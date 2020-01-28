import { gql } from "apollo-server-express";

export default gql`
  scalar Long
  scalar Object
  scalar Upload

  type Query {
    getQueueInfo: QueueInfo!
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
  }
`;
