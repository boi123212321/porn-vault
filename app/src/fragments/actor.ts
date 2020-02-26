import gql from "graphql-tag";

export default gql`
  fragment ActorFragment on Actor {
    _id
    name
    description
    bornOn
    age
    aliases
    rating
    favorite
    bookmark
    numScenes
    labels {
      _id
      name
    }
    thumbnail {
      _id
      color
    }
    watches
    customFields
    availableFields {
      _id
      name
      type
      values
      unit
    }
  }
`;
