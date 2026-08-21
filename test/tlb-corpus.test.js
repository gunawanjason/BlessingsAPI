const assert = require("node:assert/strict");
const test = require("node:test");

const tlb = require("../json/verses/TLB.json");

test("TLB corpus is complete and contains no placeholder formatting", () => {
  const chapters = Object.values(tlb).flatMap((book) => Object.values(book));
  const verses = chapters.flatMap((chapter) => Object.values(chapter));

  assert.equal(Object.keys(tlb).length, 66);
  assert.equal(chapters.length, 1189);
  assert.equal(verses.length, 28073);
  assert.equal(verses.some((verse) => !verse.trim()), false);
  assert.equal(verses.some((verse) => verse === "a"), false);
  assert.equal(verses.some((verse) => verse.includes("  ")), false);
});

test("TLB opening text is preserved from explicit source references", () => {
  assert.match(tlb["1 Chronicles"]["9"]["1"], /The Annals of the Kings of Israel/);
  assert.match(tlb.Proverbs["31"]["1"], /King Lemuel of Massa/);
  assert.match(tlb["Song of Solomon"]["1"]["1"], /composed by King Solomon/);
});
