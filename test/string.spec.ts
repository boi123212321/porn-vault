import "../src/index";
import {
  isSingleWord,
  ignoreSingleNames,
  isMatchingItem,
  stripStr,
} from "../src/extractor";
import { expect } from "chai";
import { removeExtension } from "../src/types/utility";

describe("String functions", () => {
  describe("removeExtension", () => {
    const tests = require("./fixtures/remove_extension.fixture").default;
    for (const test of tests) {
      it("Should work as expected", () => {
        expect(removeExtension(test[0])).equals(test[1]);
      });
    }
  });

  describe("isSingleWord", () => {
    for (const word of ["test", "", "1234", "numbermix1234"])
      it("Should be a seen as a single word", () => {
        expect(isSingleWord(word)).to.be.true;
      });

    for (const word of [
      "avi love",
      "some fairly long sentence",
      "even works with 124124 numbers",
    ]) {
      it("Should not be a seen as a single word", () => {
        expect(isSingleWord(word)).to.be.false;
      });
    }
  });

  describe("ignoreSingleNames", () => {
    it("Should ignore single names", () => {
      expect(
        ignoreSingleNames(["", "name", "avi love", "kali roses"])
      ).deep.equals(["avi love", "kali roses"]);
    });

    it("Should not ignore regex", () => {
      expect(
        ignoreSingleNames(["regex:(avi love)|(avi looove)", "regex:[a-z]+"])
      ).deep.equals(["regex:(avi love)|(avi looove)", "regex:[a-z]+"]);
    });
  });

  describe("Strip string", () => {
    const tests = require("./fixtures/strip_string.fixture").default;
    for (const test of tests) {
      it("Should work as expected", () => {
        expect(stripStr(test[0])).equals(test[1]);
      });
    }
  });

  describe("Is matching actor", () => {
    const tests = require("./fixtures/matching_actor.fixture").default;
    for (const test of tests) {
      it(`Should ${test[2] ? "" : "not "}match ${test[1].name}`, () => {
        expect(isMatchingItem(test[0], test[1], true)).equals(test[2]);
      });
    }
  });

  describe("Is matching label", () => {
    const tests = require("./fixtures/matching_label.fixture").default;
    for (const test of tests) {
      it(`Should ${test[2] ? "" : "not "}match ${test[1].name}`, () => {
        expect(isMatchingItem(test[0], test[1], false)).equals(test[2]);
      });
    }
  });
});
