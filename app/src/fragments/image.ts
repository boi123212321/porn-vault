import gql from "graphql-tag";

export default gql`
  fragment ImageFragment on Image {
    _id
    name
    bookmark
    favorite
    rating
  }
`;
