import gql from "graphql-tag";

export default gql`
  fragment SceneFragment on Scene {
    _id
    name
    releaseDate
    description
    rating
    favorite
    bookmark
    studio {
      _id
      name
    }
    labels {
      _id
      name
    }
    thumbnail {
      _id
      color
    }
    preview {
      _id
    }
    meta {
      size
      duration
      fps
      dimensions {
        width
        height
      }
    }
    watches
    streamLinks
    path
  }
`;
