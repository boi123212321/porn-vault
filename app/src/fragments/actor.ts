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
