import gql from "graphql-tag";

export default gql`
  fragment MovieFragment on Movie {
    _id
    name
    releaseDate
    description
    rating
    favorite
    bookmark
    labels {
      _id
      name
    }
    frontCover {
      _id
      color
    }
    backCover {
      _id
    }
    spineCover {
      _id
    }
    studio {
      _id
      name
    }
    duration
    size
  }
`;
