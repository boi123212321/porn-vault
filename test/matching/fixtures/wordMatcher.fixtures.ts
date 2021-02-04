import { WordMatcherOptions } from "../../../src/matching/wordMatcher";

export const filterFixtures: {
  name: string;
  options?: Partial<WordMatcherOptions>;
  filterOptions?: {
    sortByLongestMatch?: boolean;
  };
  inputs: string[];
  compares: { compareStrings: string[]; expected: string[] }[];
}[] = [
  {
    name: "handles single word input",
    inputs: ["Studio"],
    compares: [
      {
        compareStrings: [
          "my studio",
          "my_studio",
          "my-studio",
          "my   studio",
          "some studio thumbnail",
          "amy studio",
          "  studio",
          "-studio",
          "studio thumbnail",
          "studio-thumbnail",
          "studio_thumbnail",
        ],
        expected: ["Studio"],
      },
      {
        compareStrings: [
          "MyStudio",
          "myStudio",
          "Mystudio",
          "basicStudio thumbnail",
          "anotherStudio thumbnail",
          "MysTudio",
          "m ystudio",
          "mys tudio",
          "amystudio",
          "  mystudio",
          "-mystudio",
          "mystudio thumbnail",
          "mystudio-thumbnail",
          "mystudio_thumbnail",
        ],
        expected: [],
      },
    ],
  },
  {
    name: "ignores single word input",
    options: {
      ignoreSingleNames: true,
    },
    inputs: ["Studio"],
    compares: [
      {
        compareStrings: [
          "my studio",
          "my_studio",
          "my-studio",
          "my   studio",
          "some studio thumbnail",
          "amy studio",
          "  studio",
          "-studio",
          "studio thumbnail",
          "studio-thumbnail",
          "studio_thumbnail",
        ],
        expected: [],
      },
      {
        compareStrings: [
          "MyStudio",
          "myStudio",
          "Mystudio",
          "basicStudio thumbnail",
          "anotherStudio thumbnail",
          "MysTudio",
          "m ystudio",
          "mys tudio",
          "amystudio",
          "  mystudio",
          "-mystudio",
          "mystudio thumbnail",
          "mystudio-thumbnail",
          "mystudio_thumbnail",
        ],
        expected: [],
      },
    ],
  },
  {
    name: "handles two word inputs, PascalCase, camelCase, kebab-case",
    options: {
      overlappingMatchPreference: "all",
    },
    // If the studio contains known separators, or is PascalCase or camelCase,
    // all of its parts have to match
    inputs: [
      "My Studio",
      "My studio",
      "my Studio",
      "my studio",
      "MyStudio",
      "myStudio",
      "my_studio",
      "my-studio",
    ],
    compares: [
      {
        compareStrings: [
          "my studio",
          "my_studio",
          "my-studio",
          "MyStudio",
          "myStudio",
          "my   studio",
          "again my   studio",
          "again my-studio",
          "my studio thumbnail",
          "MyStudio thumbnail",
          "myStudio thumbnail",
          "myStudio-thumbnail",
          "MyStudio_thumbnail",
          "myStudio -thumbnail",
        ],
        expected: [
          "My Studio",
          "My studio",
          "my Studio",
          "my studio",
          "MyStudio",
          "myStudio",
          "my_studio",
          "my-studio",
        ],
      },
      {
        compareStrings: [
          "Mystudio",
          "MysTudio",
          "m ystudio",
          "mys tudio",
          "amy studio",
          "amystudio",
          "  mystudio",
          "-mystudio",
          "mystudio thumbnail",
          "mystudio-thumbnail",
          "mystudio_thumbnail",
          "my studio-thumbnail", // would be allowed with non strict word matching
          "my studio_thumbnail", // would be allowed with non strict word matching
        ],
        expected: [],
      },
    ],
  },
  {
    name: "returns all when no word groups",
    options: {
      overlappingMatchPreference: "all",
    },
    inputs: ["My Studio", "Second My Studio"],
    compares: [
      {
        compareStrings: ["second my studio"],
        expected: ["My Studio", "Second My Studio"],
      },
    ],
  },
  {
    name: "returns all with word groups",
    options: {
      overlappingMatchPreference: "all",
    },
    inputs: ["My Studio", "Second MyStudio"],
    compares: [
      {
        compareStrings: ["second myStudio", "second MyStudio"],
        expected: ["My Studio", "Second MyStudio"],
      },
    ],
  },
  {
    name: "returns shortest input when conflicting & want shortest",
    options: {
      overlappingMatchPreference: "shortest",
    },
    inputs: ["My Studio", "Second My Studio"],
    compares: [
      {
        compareStrings: ["second my studio"],
        expected: ["My Studio"],
      },
    ],
  },
  {
    name: "with word groups, returns shortest input when conflicting & want shortest",
    options: {
      overlappingMatchPreference: "shortest",
    },
    inputs: ["My Studio", "Second My Studio"],
    compares: [
      {
        compareStrings: ["second MyStudio"],
        expected: ["My Studio"],
      },
    ],
  },
  {
    name: "with word groups, returns longest input when conflicting & want longest",
    options: {
      overlappingMatchPreference: "longest",
    },
    inputs: ["My Studio", "Second MyStudio"],
    compares: [
      {
        compareStrings: ["second MyStudio"],
        expected: ["Second MyStudio"],
      },
    ],
  },
  {
    name: "no word groups, returns longest input when conflicting & want longest",
    options: {
      overlappingMatchPreference: "longest",
    },
    inputs: ["My Studio", "Second My Studio"],
    compares: [
      {
        compareStrings: ["second My Studio"],
        expected: ["Second My Studio"],
      },
    ],
  },
  {
    name: "returns longest input when conflicting & want longest",
    options: {
      overlappingMatchPreference: "longest",
    },
    inputs: ["My Studio", "Second My Studio"],
    compares: [
      {
        compareStrings: ["second my studio"],
        expected: ["Second My Studio"],
      },
    ],
  },
  {
    name: "lowercase",
    options: {
      overlappingMatchPreference: "all",
    },
    inputs: [
      // lowercase should only match a full word occurrence, since we don't know where to split
      "mystudio",
      "Mystudio",
    ],
    compares: [
      {
        compareStrings: [
          "Mystudio",
          "mystudio",
          "___mystudio",
          "  mystudio",
          "-mystudio",
          "mystudio thumbnail",
          "mystudio-thumbnail",
          "mystudio_thumbnail",
        ],
        expected: ["mystudio", "Mystudio"],
      },
      {
        compareStrings: [
          "MyStudio thumbnail",
          "myStudio thumbnail",
          "MyStudio",
          "MysTudio",
          "my studio",
          "my_studio",
          "my-studio",
          "my   studio",
          "my studio thumbnail",
          "m ystudio",
          "mys tudio",
          "amy studio",
          "amystudio",
        ],
        expected: [],
      },
    ],
  },
  {
    name: "handles word groups in inputs",
    options: {
      overlappingMatchPreference: "all",
    },
    inputs: ["MultiWord studio", "MultiWord Studio", "multiWord studio", "multiWord Studio"],
    compares: [
      {
        compareStrings: [
          "my multi word studio",
          "my multi word Studio",
          "my multiWord studio",
          "my multiWord Studio",
          "my MultiWord studio",
          "my MultiWord Studio",
          "my__multi_word_studio",
          "my-multi-word-studio",
          "MultiWord Studio",
          "multiWord studio",
          "my  multi word   studio",
        ],
        expected: ["MultiWord studio", "MultiWord Studio", "multiWord studio", "multiWord Studio"],
      },
      {
        compareStrings: [
          "multiword studio",
          "multiword studiotwo",
          "multiword studioTwo",
          "multiWord StudioTwo",
          "MultiWord StudioTwo",
          "my multi word studiotwo",
          "my multi word studioTwo",
          "my multi word Studiotwo",
          "my multi word StudioTwo",
          "my MultiWord Studiotwo",
          "my MultiWord StudioTwo",
          "mymultiword studio",
          "MyMultiWord studio",
          "myMultiWord studio",
          "again myMultiWord studio",
          " multi word   my    studio",
          "again multi word  my   studio",
        ],
        expected: [],
      },
    ],
  },
  {
    name: "handles kebab case as primary separator",
    inputs: ["multi-word-studio"],
    compares: [
      {
        compareStrings: [
          "my multi word studio",
          "my multi word Studio",
          "my__multi_word_studio",
          "my-multi-word-studio",
          "my  multi word   studio",
          "MultiWordStudio",
          "my MultiWordStudio",
          "my-multi-word-studio",
        ],
        expected: ["multi-word-studio"],
      },
      {
        compareStrings: [
          "multiword studio",
          "multiword studiotwo",
          "multiword studioTwo",
          "multiWord StudioTwo",
          "MultiWord StudioTwo",
          "my multi word studiotwo",
          "my multi word studioTwo",
          "my multi word Studiotwo",
          "my multi word StudioTwo",
          "my MultiWord Studiotwo",
          "my MultiWord StudioTwo",
          "mymultiword studio",
          "MyMultiWord studio",
          "myMultiWord studio",
          "again myMultiWord studio",
          " multi word   my    studio",
          "again multi word  my   studio",
          // would be allowed with non strict word matching
          "my multiWord studio",
          "my multiWord Studio",
          "my MultiWord studio",
          "my MultiWord Studio",
          "MultiWord Studio",
          "multiWord studio",
          "again my-multi-word-studio",
        ],
        expected: [],
      },
    ],
  },
  {
    name: "enableWordGroups",
    options: {
      enableWordGroups: false,
    },
    inputs: ["multi-word-studio"],
    compares: [
      {
        compareStrings: [
          "my multi word studio",
          "my multi word Studio",
          "my__multi_word_studio",
          "my-multi-word-studio",
          "my  multi word   studio",
          "my multiWord studio",
          "my multiWord Studio",
          "my MultiWord studio",
          "my MultiWord Studio",
          "MultiWord Studio",
          "multiWord studio",
          // allowed because of non strict word matching
          "multiWord StudioTwo",
          "MultiWord StudioTwo",
          "my multi word studioTwo",
          "my multi word StudioTwo",
          "my MultiWord StudioTwo",
          "MyMultiWord studio",
          "myMultiWord studio",
          "again myMultiWord studio",
        ],
        expected: ["multi-word-studio"],
      },
      {
        compareStrings: [
          // lowercase words still cannot be split
          "multiword studio",
          "multiword studiotwo",
          "multiword studioTwo",
          "my multi word studiotwo",
          "my multi word Studiotwo",
          "my MultiWord Studiotwo",
          "mymultiword studio",
          " multi word   my    studio",
          "again multi word  my   studio",
        ],
        expected: [],
      },
    ],
  },
  {
    name: "!enableWordGroups with overlapping inputs",
    options: {
      enableWordGroups: true,
    },
    inputs: ["My Studio", "My StudioTwo"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: ["My StudioTwo"],
      },
    ],
  },
  {
    name: "enableWordGroups, with overlapping inputs, want longest",
    options: {
      enableWordGroups: false,
      overlappingMatchPreference: "longest",
    },
    inputs: ["My Studio", "My StudioTwo"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: ["My StudioTwo"],
      },
    ],
  },
  {
    name: "enableWordGroups, with overlapping inputs, want shortest",
    options: {
      enableWordGroups: false,
      overlappingMatchPreference: "shortest",
    },
    inputs: ["My Studio", "My StudioTwo"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: ["My Studio"],
      },
    ],
  },
  {
    name: "enableWordGroups, with only small input",
    options: {
      enableWordGroups: false,
    },
    inputs: ["My Studio"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: ["My Studio"],
      },
    ],
  },
  {
    name: "!enableWordGroups, with only small input",
    options: {
      enableWordGroups: true,
    },
    inputs: ["My Studio"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: [],
      },
    ],
  },
  {
    name: "enableWordGroups, with only long input",
    options: {
      enableWordGroups: true,
    },
    inputs: ["My StudioTwo"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: ["My StudioTwo"],
      },
    ],
  },
  {
    name: "!enableWordGroups, with only long input",
    options: {
      enableWordGroups: true,
    },
    inputs: ["My StudioTwo"],
    compares: [
      {
        compareStrings: ["my studioTwo"],
        expected: ["My StudioTwo"],
      },
    ],
  },
  {
    name: "doesn't match accross spaces",
    options: {
      enableWordGroups: true,
    },
    inputs: ["dp"],
    compares: [
      {
        // Make sure "dp" is not found from "an*d* *P*ussy"
        compareStrings: ["Carolina Sweets Popsicles and Pussy Tiny4k [facial].mp4"],
        expected: [],
      },
    ],
  },
  {
    name: "doesn't match accross spaces, even with flattened words",
    options: {
      enableWordGroups: false,
    },
    inputs: ["dp"],
    compares: [
      {
        compareStrings: ["Carolina Sweets Popsicles and Pussy Tiny4k [facial].mp4"],
        expected: [],
      },
    ],
  },
  {
    name: "doesn't match inside a word",
    options: {
      enableWordGroups: true,
    },
    inputs: ["ir"],
    compares: [
      {
        // "ir" should not match from inside "G*ir*l"
        compareStrings: ["AGirlKnows.20.10.26.Lola.Myluv.And.Little.Caprice.Best.Friends.Forever"],
        expected: [],
      },
    ],
  },
  {
    name: "doesn't match inside a PascalCase word, when !enableWordGroups",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "all",
    },
    inputs: ["AlettaOceanLive", "Aletta Ocean Live", "Aletta Ocean", "Ocean Live", "Ocean"],
    compares: [
      {
        compareStrings: ["AlettaOceanLive.20.10.30.mp4"],
        expected: ["AlettaOceanLive", "Aletta Ocean Live"],
      },
    ],
  },
  {
    name: "does match inside a word, when enableWordGroups",
    options: {
      enableWordGroups: false,
      overlappingMatchPreference: "all",
    },
    inputs: ["AlettaOceanLive", "Aletta Ocean Live", "Aletta Ocean", "Ocean Live", "Ocean"],
    compares: [
      {
        compareStrings: ["AlettaOceanLive.20.10.30"],
        expected: ["AlettaOceanLive", "Aletta Ocean Live", "Aletta Ocean", "Ocean Live", "Ocean"],
      },
    ],
  },
  {
    name: "matches separately on folders, basename with !enableWordGroups",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "all",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "AlettaOceanLive", "Aletta Ocean Live"],
      },
    ],
  },
  {
    name: "matches separately on folders, basename with enableWordGroups",
    options: {
      enableWordGroups: false,
      overlappingMatchPreference: "all",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOceanLive.20.10.30.mp4"],
        expected: [
          "test",
          "videos",
          "AlettaOceanLive",
          "Aletta Ocean Live",
          "Aletta Ocean",
          "Ocean Live",
          "Ocean",
        ],
      },
    ],
  },
  {
    name: "matches separately on folders, basename with !enableWordGroups, longest overlap",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "longest",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "Aletta Ocean Live"],
      },
    ],
  },
  {
    name: "matches separately on folders, basename with !enableWordGroups, shortest overlap",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "shortest",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "AlettaOceanLive"],
      },
    ],
  },
  {
    name:
      "matches overlaps separately on folders, basename with !enableWordGroups, longest overlap",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "longest",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOcean/AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "Aletta Ocean", "Aletta Ocean Live"],
      },
    ],
  },
  {
    name:
      "matches overlaps separately on folders, basename with !enableWordGroups, shortest overlap",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "shortest",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOcean/AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "Aletta Ocean", "AlettaOceanLive"],
      },
    ],
  },
  {
    name: "matches separately on folders, basename with windows separator with !enableWordGroups",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "all",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["C:\\test\\videos\\AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "AlettaOceanLive", "Aletta Ocean Live"],
      },
    ],
  },
  {
    name: "matches separately on folders, basename with windows separator with enableWordGroups",
    options: {
      enableWordGroups: false,
      overlappingMatchPreference: "all",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["C:\\test\\videos\\AlettaOceanLive.20.10.30.mp4"],
        expected: [
          "test",
          "videos",
          "AlettaOceanLive",
          "Aletta Ocean Live",
          "Aletta Ocean",
          "Ocean Live",
          "Ocean",
        ],
      },
    ],
  },
  {
    name: "matches words adjacent to non separator character",
    options: {
      overlappingMatchPreference: "all",
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
      "my",
      "studio",
      "My Studio",
      "some",
      "Some Actor",
      "testMyStudio",
      "MyStudioVideos",
      "videosSomeActor",
    ],
    compares: [
      {
        compareStrings: ["/test(MyStudio)/videos(SomeActor)/AlettaOceanLive.20.10.30.mp4"],
        expected: [
          "test",
          "My Studio",
          "videos",
          "Some Actor",
          "AlettaOceanLive",
          "Aletta Ocean Live",
        ],
      },
      {
        compareStrings: ["/test (MyStudio)/videos (SomeActor)/AlettaOceanLive.20.10.30.mp4"],
        expected: [
          "test",
          "My Studio",
          "videos",
          "Some Actor",
          "AlettaOceanLive",
          "Aletta Ocean Live",
        ],
      },
      {
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive"],
        expected: [
          "test",
          "videos",
          "AlettaOceanLive",
          "Aletta Ocean Live",
          "My Studio",
          "Some Actor",
        ],
      },
      {
        compareStrings: ["test(MyStudio)videos(SomeActor)AlettaOceanLive"],
        expected: [
          "test",
          "videos",
          "AlettaOceanLive",
          "Aletta Ocean Live",
          "My Studio",
          "Some Actor",
        ],
      },
    ],
  },
  {
    name: "cannot match (supposed) group when inside another group",
    options: {
      wordSeparators: ["[-_]"],
      groupSeparators: ["[\\s',()[\\]{}*\\.]"],
    },
    inputs: ["Aletta Ocean Live"],
    compares: [
      {
        // '.' is a group separator which allows 'AlettaOceanLive' to be split from the date
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive.20.10.30.mp4"],
        expected: ["Aletta Ocean Live"],
      },
      {
        // '-' is a word separator so 'AlettaOceanLive' is stuck to the date
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive-20-10-30-mp4"],
        expected: [],
      },
      {
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive-Still-Same-Group"],
        expected: [],
      },
    ],
  },
  {
    name: "cannot match group when stuck to another, if character is a word separator",
    options: {
      wordSeparators: ["[-_\\.]"],
      groupSeparators: ["[\\s',()[\\]{}*]"],
    },
    inputs: ["Aletta Ocean Live"],
    compares: [
      {
        // '.' is a word separator so 'AlettaOceanLive' is stuck to the date
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive.20.10.30.mp4"],
        expected: [],
      },
      {
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive-20-10-30-mp4"],
        expected: [],
      },
      {
        compareStrings: ["test (MyStudio)videos (SomeActor) AlettaOceanLive-Still-Same-Group"],
        expected: [],
      },
    ],
  },
  {
    name: "uses word separator as group, when fallback enabled",
    options: {
      wordSeparators: ["[-_]"],
      groupSeparators: ["[\\s',()[\\]{}*\\.]"],
    },
    inputs: ["Aletta Ocean Live"],
    compares: [
      {
        compareStrings: ["test-AlettaOceanLive-20-10-30-mp4"],
        expected: ["Aletta Ocean Live"],
      },
    ],
  },
  {
    name: "does not use word separator as group, when fallback disabled",
    options: {
      wordSeparators: ["[-_]"],
      groupSeparators: ["[\\s',()[\\]{}*\\.]"],
      wordSeparatorFallback: false,
    },
    inputs: ["Aletta Ocean Live"],
    compares: [
      {
        compareStrings: ["test-AlettaOceanLive-20-10-30-mp4"],
        expected: [],
      },
    ],
  },
  {
    name: "allows regex",
    options: {},
    inputs: ["regex:aletta"],
    compares: [
      {
        compareStrings: ["/test(MyStudio)/videos(SomeActor)/AlettaOceanLive.20.10.30.mp4"],
        expected: ["regex:aletta"],
      },
    ],
  },
  {
    name: "does not transform str for regex",
    options: {},
    inputs: ["regex:double anal"],
    compares: [
      {
        compareStrings: ["7on1 Double Anal GangBang with Kira Thorn"],
        expected: ["regex:double anal"],
      },
    ],
  },
  {
    name: "allows regex across path groups",
    options: {},
    inputs: ["regex:videos/AlettaOcean"],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOceanLive.20.10.30.mp4"],
        expected: ["regex:videos/AlettaOcean"],
      },
    ],
  },
  {
    name: "sorts overlaps by input order",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "shortest",
    },
    filterOptions: {
      sortByLongestMatch: false,
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOcean/AlettaOceanLive.20.10.30.mp4"],
        expected: ["test", "videos", "Aletta Ocean", "AlettaOceanLive"],
      },
    ],
  },
  {
    name: "sorts overlaps by longest match",
    options: {
      enableWordGroups: true,
      overlappingMatchPreference: "shortest",
    },
    filterOptions: {
      sortByLongestMatch: true,
    },
    inputs: [
      "test",
      "videos",
      "AlettaOceanLive",
      "Aletta Ocean Live",
      "Aletta Ocean",
      "Ocean Live",
      "Ocean",
      "testvideos",
    ],
    compares: [
      {
        compareStrings: ["/test/videos/AlettaOcean/AlettaOceanLive.20.10.30.mp4"],
        expected: ["AlettaOceanLive", "Aletta Ocean", "videos", "test"],
      },
    ],
  },
];

export const matchingActorFixtures = [
  {
    str: "jill kassidy swallowed",
    actor: {
      _id: "test",
      name: "Kassidy",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "jill kassidy swallowed",
    actor: {
      _id: "test",
      name: "Jill Kassidy",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Jill Kassidy - Jill’s Oral Expertise - Swallowed",
    actor: {
      _id: "test",
      name: "Jill Kassidy",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Jill Kassidy - Jill’s Oral Expertise - Swallowed",
    actor: {
      _id: "test",
      name: "abcdef abc",
      aliases: ["regex:kassidy"],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Jill’s Oral Expertise - Swallowed",
    actor: {
      _id: "test",
      name: "Jill",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str:
      "Jill And Gina In A Sloppy Gargling Suck Party - Gina Valentina & Jill Kassidy - Swallowed",
    actor: {
      _id: "test",
      name: "Gina Valentina",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str:
      "Jill And Gina In A Sloppy Gargling Suck Party - Gina Valentina & Jill KaSSidy - Swallowed",
    actor: {
      _id: "test",
      name: "Jill Kassidy",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Jill And Gina In A Sloppy Gargling Suck Party - gina Valentina&jill Kassidy - Swallowed",
    actor: {
      _id: "test",
      name: "Gina Valentina",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Kali Rose - Scene",
    actor: {
      _id: "test",
      name: "Kali Roses",
      aliases: ["Kali Rose"],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Kali Rose - Swallowed",
    actor: {
      _id: "test",
      name: "Kali Roses",
      aliases: ["regex:(Kali.*Swallowed)|(Swallowed.*Kali)"],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Swallowed - Kali Rose",
    actor: {
      _id: "test",
      name: "Kali Roses",
      aliases: ["regex:(Kali.*Swallowed)|(Swallowed.*Kali)"],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Swallowed - Kali Rose",
    actor: {
      _id: "test",
      name: "Kali Roses",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "Swallowed - Kali Rose",
    actor: {
      _id: "test",
      name: "kali",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str:
      "Jill.And.Gina.In.A.Sloppy.Gargling.Suck.Party.Gina.Valentina.&.Jill.Kassidy.Swallowed.mp4",
    actor: {
      _id: "test",
      name: "Gina Valentina",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "[jill kassidy] swallowed",
    actor: {
      _id: "test",
      name: "Jill Kassidy",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: true,
    },
  },
  {
    str: "[jill kassidy] swallowed",
    actor: {
      _id: "test",
      name: "Test",
      aliases: ["jill"],
    },
    expected: false,
    options: {
      ignoreSingleNames: true,
    },
  },
];

export const matchingLabelFixtures = [
  {
    str: "jill kassidy swallowed",
    label: {
      _id: "test",
      name: "Anal",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "Layla Love All Anal Blonde",
    label: {
      _id: "test",
      name: "Anal",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "Chanel Grey's First DP",
    label: {
      _id: "test",
      name: "Anal",
      aliases: ["dp"],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "7on1 Double Anal GangBang with Kira Thorn",
    label: {
      _id: "test",
      name: "Double penetration",
      aliases: ["regex:double.*"],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "7on1 Double Anal GangBang with Kira Thorn",
    label: {
      _id: "test",
      name: "Double penetration",
      aliases: ["double.*"],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "7on1 Double Anal GangBang with Kira Thorn",
    label: {
      _id: "test",
      name: "Double anal",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "7on1 Double Anal GangBang with Kira Thorn",
    label: {
      _id: "test",
      name: "dap",
      aliases: ["double anal"],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "7on1 Double Anal GangBang with Kira Thorn",
    label: {
      _id: "test",
      name: "dap",
      aliases: ["regex:double anal"],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "test title with female performers",
    label: {
      _id: "test",
      name: "female",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "test title with female performers",
    label: {
      _id: "test",
      name: "male",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "test title with black haired performers",
    label: {
      _id: "test",
      name: "black",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "test title with black haired performers",
    label: {
      _id: "test",
      name: "black haired",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "test title with (black haired) performers",
    label: {
      _id: "test",
      name: "black",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "test title with (black haired) performers",
    label: {
      _id: "test",
      name: "black haired",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
  {
    str: "Hegre-Art.14.09.23.A.Day.In.The.Life.Of.Supermodel.Victoria.R",
    label: {
      _id: "test",
      name: "hegre",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
      wordSeparators: ["[-_\\.]"],
      groupSeparators: ["[\\s',()[\\]{}*]"],
    },
  },
  {
    str: "Hegre-Art.14.09.23.A.Day.In.The.Life.Of.Supermodel.Victoria.R",
    label: {
      _id: "test",
      name: "hegre art",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
      wordSeparators: ["[-_\\.]"],
      groupSeparators: ["[\\s',()[\\]{}*]"],
    },
  },
  {
    str: "Hegre-Art.14.09.23.A.Day.In.The.Life.Of.Supermodel.Victoria.R",
    label: {
      _id: "test",
      name: "hegre",
      aliases: [],
    },
    expected: false,
    options: {
      ignoreSingleNames: false,
      wordSeparators: ["[-_]"],
      groupSeparators: ["[\\s',()[\\]{}*\\.]"],
    },
  },
  {
    str: "Hegre-Art.14.09.23.A.Day.In.The.Life.Of.Supermodel.Victoria.R",
    label: {
      _id: "test",
      name: "hegre art",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
      wordSeparators: ["[-_]"],
      groupSeparators: ["[\\s',()[\\]{}*\\.]"],
    },
  },
  {
    str: "téèst",
    label: {
      _id: "test",
      name: "teest",
      aliases: [],
    },
    expected: true,
    options: {
      ignoreSingleNames: false,
    },
  },
];
