const test = require("node:test");
const assert = require("node:assert/strict");

const nlt = require("../json/verses/NLT.json");
const cunpssShen = require("../json/verses/CUNPSS-神.json");
const cunpssShangdi = require("../json/verses/CUNPSS-上帝.json");

test("NLT 1 Chronicles 9:1 retains the stripped book title", () => {
  assert.equal(
    nlt["1 Chronicles"]["9"]["1"],
    "So all Israel was listed in the genealogical records in The Book of the Kings of Israel. The people of Judah were exiled to Babylon because they were unfaithful to the LORD.",
  );
});

test("both CUNPSS editions contain the restored Song of Solomon", () => {
  for (const corpus of [cunpssShen, cunpssShangdi]) {
    assert.equal(Object.keys(corpus).length, 66);
    assert.equal(Object.keys(corpus["Song of Solomon"]).length, 8);
    assert.equal(
      corpus["Song of Solomon"]["1"]["1"],
      "所罗门的歌，是歌中的雅歌。",
    );
  }
});
