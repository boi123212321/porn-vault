import GraphQLLong from 'graphql-type-long';
import QueryResolvers from "./resolvers/query";
import ActorResolver from "./resolvers/actor";
import SceneResolver from "./resolvers/scene";
import MutationResolver from "./mutation";
import ImageResolver from "./resolvers/image";
import LabelResolver from "./resolvers/label";

const resolvers = {
  Long: GraphQLLong,
  Actor: ActorResolver,
  Scene: SceneResolver,
  Image: ImageResolver,
  Query: QueryResolvers,
  Mutation: MutationResolver,
  label: LabelResolver
}

export default resolvers;