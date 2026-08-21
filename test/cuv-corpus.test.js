const assert = require("node:assert/strict");
const test = require("node:test");

const cuv = require("../json/verses/CUV.json");

test("CUV corpus is complete and omits BibleGateway continuation markers", () => {
  const chapters = Object.values(cuv).flatMap((book) => Object.values(book));
  const verses = chapters.flatMap((chapter) => Object.values(chapter));

  assert.equal(Object.keys(cuv).length, 66);
  assert.equal(chapters.length, 1189);
  assert.equal(verses.length, 31032);
  assert.equal(verses.some((verse) => !verse.trim()), false);
  assert.equal(verses.some((verse) => verse.trim() === "a"), false);
});

test("CUV merged verse markers are represented by the source text, not a placeholder", () => {
  assert.match(cuv.Genesis["24"]["29"], /拉班/);
  assert.equal(Object.hasOwn(cuv.Genesis["24"], "30"), false);
  assert.match(cuv.Ephesians["6"]["2"], /父母/);
  assert.equal(Object.hasOwn(cuv.Ephesians["6"], "3"), false);
});
