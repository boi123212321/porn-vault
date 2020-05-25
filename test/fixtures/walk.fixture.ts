export default [
  {
    path: "test/fixtures/files",
    exclude: [],
    extensions: [".jpg"],
    expected: {
      num: 10,
    },
  },
  {
    path: "test/fixtures/files",
    exclude: [],
    extensions: [".mp4"],
    expected: {
      num: 1,
    },
  },
  {
    path: "test/fixtures/files",
    exclude: [],
    extensions: [".jpg", ".mp4"],
    expected: {
      num: 11,
    },
  },
  {
    path: "test/fixtures/files",
    exclude: ["some_"],
    extensions: [".jpg"],
    expected: {
      num: 5,
    },
  },
];
