import gql from "graphql-tag";

export default gql`
  fragment StudioFragment on Studio {
    _id
    name
    description
    aliases
    thumbnail {
      _id
    }
    labels {
      _id
      name
    }
    parent {
      _id
      name
    }
    numScenes
    rating
    favorite
    bookmark
  }
`;
