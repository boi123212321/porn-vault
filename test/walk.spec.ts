import os from "os";
import { promisify } from "util";
import { chmod } from "fs";
import { expect } from "chai";
import { isAbsolute, resolve } from "path";

import { walk, writeFileAsync, existsAsync } from "../src/fs/async";
import tests from "./fixtures/walk.fixture";

import {
  createTempTestingDir,
  TEST_TEMP_DIR,
  unlinkTempTestingDir,
  mkdirAsync,
} from "./util";

const chmodAsync = promisify(chmod);

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

  // We cannot manipulate file modes properly on windows,
  // so do not run these tests
  if (os.type() !== "Windows_NT") {
    describe("permission tests", () => {
      const root = resolve(TEST_TEMP_DIR, "walk-perm");
      const normalDir = resolve(root, "normal");
      const deniedDir = resolve(root, "denied");

      const extension = ".png";
      const dummyFilename = `dummy${extension}`;

      beforeEach(async () => {
        await createTempTestingDir();

        if (await existsAsync(root)) {
          throw new Error(
            `"${root}" already exists, cannot create it for tests`
          );
        }

        await mkdirAsync(root);
        await mkdirAsync(normalDir);
        await mkdirAsync(deniedDir);

        await writeFileAsync(resolve(normalDir, dummyFilename), "", "utf-8");
        await writeFileAsync(resolve(deniedDir, dummyFilename), "", "utf-8");

        await chmodAsync(deniedDir, 0o055);
      });

      afterEach(async () => {
        await chmodAsync(deniedDir, 0o755);
        await unlinkTempTestingDir();
      });

      it("does not throw when a folder requires elevated permissions", async () => {
        const walkPromise = walk({
          dir: root,
          exclude: [],
          extensions: [extension],
          cb: async (path) => {},
        });

        await expect(walkPromise).to.eventually.be.fulfilled;
      });

      it("does not enter directory that requires elevated permissions", async () => {
        let numFound = 0;

        await walk({
          dir: root,
          exclude: [],
          extensions: [extension],
          cb: async (path) => {
            numFound++;
          },
        });

        expect(numFound).to.equal(1);
      });
    });
  }
});
