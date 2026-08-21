const assert = require("node:assert/strict");
const test = require("node:test");

const shen = require("../json/verses/CUNPSS-神.json");
const shangdi = require("../json/verses/CUNPSS-上帝.json");
const manifest = require("../scripts/cunpss_chapter_verses.json");

function corpusCounts(corpus) {
  const chapters = Object.values(corpus).flatMap((book) => Object.values(book));
  return {
    books: Object.keys(corpus).length,
    chapters: chapters.length,
    entries: chapters.reduce((total, chapter) => total + Object.keys(chapter).length, 0),
  };
}

test("CUNPSS paired corpora have canonical structure and exact counterpart text", () => {
  assert.deepEqual(corpusCounts(shen), { books: 66, chapters: 1189, entries: 31035 });
  assert.deepEqual(corpusCounts(shangdi), { books: 66, chapters: 1189, entries: 31035 });
  assert.deepEqual(Object.keys(shen), Object.keys(shangdi));

  let divineOccurrences = 0;
  let literalShenOccurrences = 0;
  for (const [book, chapters] of Object.entries(shen)) {
    assert.deepEqual(Object.keys(chapters), Object.keys(shangdi[book]));
    for (const [chapter, verses] of Object.entries(chapters)) {
      assert.deepEqual(Object.keys(verses), Object.keys(shangdi[book][chapter]));
      for (const [verse, text] of Object.entries(verses)) {
        const counterpart = shangdi[book][chapter][verse];
        assert.equal(counterpart.replaceAll("上帝", "神"), text, `${book} ${chapter}:${verse}`);
        assert.equal(text.includes("上帝"), false, `${book} ${chapter}:${verse}`);
        divineOccurrences += counterpart.split("上帝").length - 1;
        literalShenOccurrences += counterpart.split("神").length - 1;
      }
    }
  }
  assert.equal(divineOccurrences, 4086);
  assert.equal(literalShenOccurrences, 640);
});

test("CUNPSS manifest accounts for every explicit and bridged verse number once", () => {
  const bridgesByChapter = new Map();
  for (const bridge of manifest.bridges) {
    const list = bridgesByChapter.get(bridge.reference) || [];
    list.push(bridge);
    bridgesByChapter.set(bridge.reference, list);
  }

  let chapterCount = 0;
  let coveredVerseNumbers = 0;
  for (const [book, verseCounts] of Object.entries(manifest.chapterVerseCounts)) {
    assert.equal(verseCounts.length, Object.keys(shen[book]).length, book);
    for (const [index, expectedMax] of verseCounts.entries()) {
      const chapter = String(index + 1);
      const chapterRef = `${book} ${chapter}`;
      const entries = shen[book][chapter];
      const coverage = new Map(Object.keys(entries).map((verse) => [Number(verse), 1]));

      for (const bridge of bridgesByChapter.get(chapterRef) || []) {
        assert.equal(Object.hasOwn(entries, String(bridge.sourceKey)), true, chapterRef);
        for (let verse = bridge.start; verse <= bridge.end; verse += 1) {
          assert.equal(Object.hasOwn(entries, String(verse)), false, `${chapterRef}:${verse}`);
          coverage.set(verse, (coverage.get(verse) || 0) + 1);
        }
      }

      assert.deepEqual([...coverage.keys()].sort((a, b) => a - b),
        Array.from({ length: expectedMax }, (_, verse) => verse + 1), chapterRef);
      assert.equal([...coverage.values()].every((count) => count === 1), true, chapterRef);
      chapterCount += 1;
      coveredVerseNumbers += expectedMax;
    }
  }
  assert.equal(Object.keys(manifest.chapterVerseCounts).length, 66);
  assert.equal(chapterCount, 1189);
  assert.equal(coveredVerseNumbers, 31103);
  assert.equal(manifest.bridges.length, 67);
});

test("CUNPSS preserves reviewed literal 神 occurrences and source numbering", () => {
  assert.match(shen["Song of Solomon"]["5"]["6"], /神不守舍/);
  assert.match(shangdi["Song of Solomon"]["5"]["6"], /神不守舍/);
  assert.match(shen.Psalms["90"]["1"], /^神人摩西/);
  assert.match(shangdi.Psalms["90"]["1"], /^神人摩西/);

  assert.match(shangdi.Jeremiah["46"]["25"], /以色列的上帝/);
  assert.equal(shangdi.Jeremiah["46"]["25"].split("神").length - 1, 2);

  assert.equal(Object.hasOwn(shen.Numbers["1"], "20"), false);
  assert.equal(Object.hasOwn(shen.Numbers["1"], "21"), true);
  assert.equal(Object.hasOwn(shen["1 Chronicles"]["21"], "31"), true);
  assert.equal(Object.hasOwn(shen["1 Chronicles"]["22"], "19"), false);
});
