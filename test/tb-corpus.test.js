const assert = require("node:assert/strict");
const test = require("node:test");

const tb = require("../json/verses/TB.json");

test("TB corpus uses complete YouVersion 306 native versification", () => {
  let chapterCount = 0;
  let verseCount = 0;

  for (const chapters of Object.values(tb)) {
    chapterCount += Object.keys(chapters).length;
    for (const verses of Object.values(chapters)) {
      verseCount += Object.keys(verses).length;
    }
  }

  assert.equal(Object.keys(tb).length, 66);
  assert.equal(chapterCount, 1189);
  assert.equal(verseCount, 31172);

  // TB numbers many Psalm superscriptions and uses native chapter boundaries.
  assert.equal(Object.keys(tb.Psalms["3"]).length, 9);
  assert.equal(tb.Psalms["3"]["1"], "Mazmur Daud, ketika ia lari dari Absalom, anaknya.");
  assert.match(tb.Exodus["5"]["24"], /^Tetapi TUHAN berfirman kepada Musa:/);
  assert.match(tb.Exodus["6"]["1"], /^Selanjutnya berfirmanlah Allah kepada Musa:/);
  assert.deepEqual(
    ["38", "39", "40", "41"].map((chapter) => Object.keys(tb.Job[chapter]).length),
    [38, 38, 28, 25],
  );
  assert.equal(Object.keys(tb.Romans["7"]).length, 26);
});

test("TB corpus has no legacy embedded source-number markers or markup", () => {
  const serialized = JSON.stringify(tb);

  assert.doesNotMatch(serialized, /\(\d+-\d+[a-z]?\)/);
  assert.doesNotMatch(serialized, /<[^>]+>|data-usfm|\(#|\|\)/);
});
