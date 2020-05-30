import ActorMutations from "./mutations/actor";
import LabelMutations from "./mutations/label";
import SceneMutations from "./mutations/scene";
import ImageMutations from "./mutations/image";
import MovieMutations from "./mutations/movie";
import StudioMutations from "./mutations/studio";
import MarkerMutations from "./mutations/marker";
import CustomFieldMutations from "./mutations/custom_field";
import MissingSceneMutations from "./mutations/missing_scene";

export default {
  ...ImageMutations,
  ...ActorMutations,
  ...LabelMutations,
  ...SceneMutations,
  ...MovieMutations,
  ...StudioMutations,
  ...MarkerMutations,
  ...CustomFieldMutations,
  ...MissingSceneMutations,
};
