export default [
  {
    path: "test/files",
    exclude: [],
    extensions: [".jpg"],
    expected: {
      num: 10,
    },
  },
  {
    path: "test/files",
    exclude: [],
    extensions: [".mp4"],
    expected: {
      num: 1,
    },
  },
  {
    path: "test/files",
    exclude: [],
    extensions: [".jpg", ".mp4"],
    expected: {
      num: 11,
    },
  },
  {
    path: "test/files",
    exclude: ["some_"],
    extensions: [".jpg"],
    expected: {
      num: 5,
    },
  },
];
