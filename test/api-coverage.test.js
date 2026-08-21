const assert = require("node:assert/strict");
const test = require("node:test");

const { app, getVerseRecord } = require("../api");
const cuv = require("../json/verses/CUV.json");
const tlb = require("../json/verses/TLB.json");

test("combined verse labels resolve to one authoritative source record", () => {
  assert.deepEqual(getVerseRecord(cuv, "Genesis", 24, 30, "CUV"), {
    book: "Genesis",
    chapter: 24,
    verse: 29,
    verse_end: 30,
    content: cuv.Genesis["24"]["29"],
  });

  assert.deepEqual(getVerseRecord(tlb, "Nehemiah", 7, 65, "TLB"), {
    book: "Nehemiah",
    chapter: 7,
    verse: 64,
    verse_end: 65,
    content: tlb.Nehemiah["7"]["64"],
  });
});

test("HTTP endpoints preserve arrays and expose repaired coverage", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const request = async (path) => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { response, body: await response.json() };
  };

  const nivRange = await request(
    `/NIV/multiple?verses=${encodeURIComponent("Nehemiah 7:61-73")}`
  );
  const nivChapter = await request(
    `/NIV/multiple?verses=${encodeURIComponent("Nehemiah 7")}`
  );
  const tlbRange = await request(
    `/TLB/multiple?verses=${encodeURIComponent("Nehemiah 7:61-73")}`
  );
  const tlbContinuation = await request(
    "/TLB/single?book=Nehemiah&chapter=7&verse=65"
  );
  const missingParameter = await request("/NIV/multiple");
  const pseudoChapter = await request(
    "/NIV/single?book=Obadiah&chapter=2&verse=1"
  );

  assert.equal(Array.isArray(nivRange.body), true);
  assert.equal(nivRange.body.length, 13);
  assert.equal(nivChapter.body.length, 73);
  assert.equal(Array.isArray(tlbRange.body), true);
  assert.equal(tlbRange.body.length, 11);
  assert.deepEqual(
    tlbRange.body
      .filter(({ verse_end }) => verse_end)
      .map(({ verse, verse_end }) => [verse, verse_end]),
    [
      [64, 65],
      [68, 69],
    ]
  );
  assert.equal(tlbContinuation.body.verse, 64);
  assert.equal(tlbContinuation.body.verse_end, 65);
  assert.equal(missingParameter.response.status, 400);
  assert.equal(pseudoChapter.response.status, 404);
});
