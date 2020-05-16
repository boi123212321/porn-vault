import { walk } from "../src/fs/async";
import tests from "./walk.fixture";
import { expect } from "chai";
import { isAbsolute } from "path";

describe("Walk folders", () => {
  for (const test of tests) {
    it("Should do correct folder walk", async () => {
      let numFound = 0;

      await walk({
        dir: test.path,
        exclude: test.exclude,
        extensions: test.extensions,
        cb: async (path) => {
          numFound++;
          expect(isAbsolute(path)).to.be.true;
        },
      });

      expect(test.expected.num).to.equal(numFound);
    });
  }
});
