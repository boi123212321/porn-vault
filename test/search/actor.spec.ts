import { expect } from "chai";

import Actor from "../../src/types/actor";
import { indexActors, searchActors } from "../../src/search/actor";
import { startTestServer, stopTestServer } from "../testServer";
import { actorCollection } from "../../src/database";

describe("Search", () => {
  describe("Actor", () => {
    afterEach(() => {
      stopTestServer();
    });

    describe("Actor searches with space separator", () => {
      const actor = new Actor("Ginebra Bellucci");
      before(async function () {
        await startTestServer.call(this);

        expect(await Actor.getAll()).to.be.empty;
        await actorCollection.upsert(actor._id, actor);
        await indexActors([actor]);
        expect(await Actor.getAll()).to.have.lengthOf(1);
      });

      it("Should find actor by name", async function () {
        const searchResult = await searchActors({ query: "ginebra" });
        expect(searchResult).to.deep.equal({
          items: [actor._id],
          total: 1,
          numPages: 1,
        });
      });

      it.skip("Should not find actor with bad query", async function () {
        const searchResult = await searchActors({
          query: "asdva35aeb5se5b",
        });
        expect(searchResult).to.deep.equal({
          items: [],
          total: 0,
          numPages: 1,
        });
      });

      it("Should find actor with 1 typo", async function () {
        const searchResult = await searchActors({
          query: "Belucci",
        });
        expect(searchResult).to.deep.equal({
          items: [actor._id],
          total: 1,
          numPages: 1,
        });
      });
    });

    it("Should find actor by name with underscores", async function () {
      await startTestServer.call(this);

      expect(await Actor.getAll()).to.be.empty;
      const actor = new Actor("Ginebra_Bellucci");
      await actorCollection.upsert(actor._id, actor);
      await indexActors([actor]);
      expect(await Actor.getAll()).to.have.lengthOf(1);

      const searchResult = await searchActors({
        query: "ginebra",
      });
      expect(searchResult).to.deep.equal({
        items: [actor._id],
        total: 1,
        numPages: 1,
      });
    });
  });
});
