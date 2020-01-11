import GraphQLLong from "graphql-type-long";
import QueryResolvers from "./resolvers/query";
import ActorResolver from "./resolvers/actor";
import SceneResolver from "./resolvers/scene";
import MutationResolver from "./mutation";
import ImageResolver from "./resolvers/image";
import LabelResolver from "./resolvers/label";
import MovieResolver from "./resolvers/movie";
import StudioResolver from "./resolvers/studio";
import CustomFieldResolver from "./resolvers/custom_field";
import { GraphQLJSONObject } from "graphql-type-json";

const resolvers = {
  Long: GraphQLLong,
  Object: GraphQLJSONObject,

  Actor: ActorResolver,
  Scene: SceneResolver,
  Image: ImageResolver,
  Query: QueryResolvers,
  Mutation: MutationResolver,
  Label: LabelResolver,
  Movie: MovieResolver,
  Studio: StudioResolver,
  CustomField: CustomFieldResolver
};

export default resolvers;
