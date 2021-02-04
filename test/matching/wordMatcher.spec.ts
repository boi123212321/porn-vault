import { expect } from "chai";

import defaultConfig from "../../src/config/default";
import { WordMatcher, WordMatcherOptions } from "../../src/matching/wordMatcher";
import {
  filterFixtures,
  matchingActorFixtures,
  matchingLabelFixtures,
} from "./fixtures/wordMatcher.fixtures";

describe("matcher", () => {
  describe("Word matcher", () => {
    describe("filterMatchingItems", () => {
      filterFixtures.forEach((fixture, fixtureIndex) => {
        fixture.compares.forEach((compareFixture, compareFixtureIndex) => {
          compareFixture.compareStrings.forEach((compareString, compareStringIndex) => {
            it(`${fixtureIndex}${compareFixtureIndex}${compareStringIndex} '${fixture.name}': gets expected match against '${compareString}'`, () => {
              const matchObjs = fixture.inputs.map((input) => ({
                _id: input,
                name: input,
                input,
              }));

              const matchedItems = new WordMatcher({
                ...(defaultConfig.matching.matcher.options as WordMatcherOptions),
                ...(fixture.options || {}),
              }).filterMatchingItems(
                matchObjs,
                compareString,
                (testItem) => [testItem.input],
                !!fixture.filterOptions?.sortByLongestMatch
              );

              const matchedStrs = matchedItems.map((i) => i.input);

              expect(matchedStrs).to.deep.equal(compareFixture.expected);
            });
          });
        });
      });
    });

    describe("isMatchingItem", () => {
      describe("Is matching actor", () => {
        matchingActorFixtures.forEach((fixture, idx) => {
          it(`${idx} Should ${fixture.expected ? "" : "not "}match ${fixture.actor.name}`, () => {
            const isMatch = new WordMatcher({
              ...(defaultConfig.matching.matcher.options as WordMatcherOptions),
              ...(fixture.options || {}),
            }).isMatchingItem(fixture.actor, fixture.str, (actor) => [
              actor.name,
              ...actor.aliases,
            ]);
            expect(isMatch).to.equal(fixture.expected);
          });
        });
      });

      describe("Is matching label", () => {
        matchingLabelFixtures.forEach((fixture, idx) => {
          it(`${idx} Should ${fixture.expected ? "" : "not "}match ${fixture.label.name}`, () => {
            const isMatch = new WordMatcher({
              ...(defaultConfig.matching.matcher.options as WordMatcherOptions),
              ...(fixture.options || {}),
            }).isMatchingItem(fixture.label, fixture.str, (label) => [
              label.name,
              ...label.aliases,
            ]);
            expect(isMatch).to.equal(fixture.expected);
          });
        });
      });
    });
  });
});
