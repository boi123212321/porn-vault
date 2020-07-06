import { makeExecutableSchema } from "graphql-tools";

import RootResolver from "./resolvers";
import actorSchema from "./schema/actor";
import customFieldSchema from "./schema/custom_field";
import imageSchema from "./schema/image";
import indexSchema from "./schema/index";
import labelSchema from "./schema/label";
import markerSchema from "./schema/marker";
import movieSchema from "./schema/movie";
import sceneSchema from "./schema/scene";
import studioSchema from "./schema/studio";

export default makeExecutableSchema({
  typeDefs: [
    actorSchema,
    indexSchema,
    imageSchema,
    sceneSchema,
    studioSchema,
    movieSchema,
    labelSchema,
    customFieldSchema,
    markerSchema,
  ],
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  resolvers: RootResolver,
  resolverValidationOptions: {
    requireResolversForResolveType: false,
  },
});
