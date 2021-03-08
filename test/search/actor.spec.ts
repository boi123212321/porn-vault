import { expect } from "chai";

import Actor from "../../src/types/actor";
import { indexActors, searchActors } from "../../src/search/actor";
import { startTestServer, stopTestServer } from "../testServer";
import { actorCollection } from "../../src/database";

describe("Search", () => {
  describe("Actor", () => {
    const actor = new Actor("Ginebra Bellucci", ["Ginebra Spainish"]);

    before(async function () {
      await startTestServer.call(this);

      expect(await Actor.getAll()).to.be.empty;
      await actorCollection.upsert(actor._id, actor);
      await indexActors([actor]);
      expect(await Actor.getAll()).to.have.lengthOf(1);
    });

    after(() => {
      stopTestServer();
    });

    it("Should find actor by name", async function () {
      const searchResult = await searchActors({
        query: "ginebra",
      });
      expect(searchResult).to.deep.equal({
        items: [actor._id],
        total: 1,
        numPages: 1,
      });
    });

    it("Should not find actor with bad query", async function () {
      const searchResult = await searchActors({
        query: "asdva35aeb5se5b",
      });
      expect(searchResult).to.deep.equal({
        items: [],
        total: 0,
        numPages: 0,
      });
    });

    it("Should find actor through alias", async function () {
      const searchResult = await searchActors({
        query: "Spainish",
      });
      expect(searchResult).to.deep.equal({
        items: [actor._id],
        total: 1,
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

    it("Should find actor by name with underscores", async function () {
      stopTestServer();
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
