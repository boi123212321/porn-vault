import gql from "graphql-tag";

export default gql`
  fragment ActorFragment on Actor {
    _id
    name
    bornOn
    aliases
    rating
    favorite
    bookmark
    labels {
      _id
      name
    }
    thumbnail {
      _id
    }
  }
`;
