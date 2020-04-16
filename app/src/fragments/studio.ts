import gql from "graphql-tag";

export default gql`
  fragment StudioFragment on Studio {
    _id
    name
    description
    aliases
    rating
    favorite
    bookmark
  }
`;
