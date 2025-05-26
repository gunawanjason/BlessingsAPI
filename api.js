const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const util = require("util");
const cors = require("cors");

const readFile = util.promisify(fs.readFile);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve the documentation page at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/:translation/single", async (req, res) => {
  const { translation } = req.params;
  let { book, chapter, verse } = req.query;
  chapter = parseInt(chapter, 10);
  verse = parseInt(verse, 10);

  try {
    const jsonData = await readTranslation(translation);
    if (
      jsonData[book] &&
      jsonData[book][chapter] &&
      jsonData[book][chapter][verse]
    ) {
      res.json({
        book,
        chapter,
        verse,
        content: jsonData[book][chapter][verse],
      });
    } else {
      res
        .status(404)
        .json({ error: `Verse not found: ${book} ${chapter}:${verse}` });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching the verse." });
  }
});

app.get("/:translation/multiple", async (req, res) => {
  const { translation } = req.params;
  const verses = req.query.verses.split(",");
  try {
    const allVerses = await Promise.all(
      verses.map((verse, idx) => fetchVerses(translation, verse, idx))
    );
    const flattenedVerses = allVerses.flat();
    res.json(flattenedVerses);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching the verses." });
  }
});

// Keyword search endpoint that searches across specified translation(s)
app.get("/:translation/search", async (req, res) => {
  const { translation } = req.params;
  const { keyword, limit = 50, book, testament } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: "Keyword parameter is required" });
  }

  try {
    const jsonData = await readTranslation(translation);
    const results = searchInTranslation(
      jsonData,
      keyword,
      parseInt(limit),
      book,
      testament
    );

    res.json({
      translation,
      keyword,
      book_filter: book || "all",
      testament_filter: testament || "all",
      total_results: results.length,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Error performing search." });
  }
});

// Multi-translation keyword search endpoint
app.get("/search", async (req, res) => {
  const { keyword, translations, limit = 50, book, testament } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: "Keyword parameter is required" });
  }

  const translationList = translations ? translations.split(",") : ["NIV"];

  try {
    const searchPromises = translationList.map(async (translation) => {
      try {
        const jsonData = await readTranslation(translation.trim());
        const results = searchInTranslation(
          jsonData,
          keyword,
          parseInt(limit),
          book,
          testament
        );
        return {
          translation: translation.trim(),
          results,
        };
      } catch (error) {
        console.error(`Error searching in ${translation}:`, error);
        return {
          translation: translation.trim(),
          error: "Translation not found or error loading data",
          results: [],
        };
      }
    });

    const allResults = await Promise.all(searchPromises);
    const totalResults = allResults.reduce(
      (sum, tr) => sum + tr.results.length,
      0
    );

    res.json({
      keyword,
      translations: translationList,
      book_filter: book || "all",
      testament_filter: testament || "all",
      total_results: totalResults,
      results_by_translation: allResults,
    });
  } catch (error) {
    console.error("Multi-search error:", error);
    res
      .status(500)
      .json({ error: "Error performing multi-translation search." });
  }
});

// Define Old Testament and New Testament books
const OLD_TESTAMENT_BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Songs",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
];

const NEW_TESTAMENT_BOOKS = [
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function searchInTranslation(
  jsonData,
  keyword,
  limit = 50,
  bookFilter = null,
  testamentFilter = null
) {
  const results = [];
  const searchTerm = keyword.toLowerCase();

  // Determine which books to search based on filters
  let booksToSearch = Object.keys(jsonData);

  if (testamentFilter && testamentFilter.toLowerCase() !== "all") {
    if (
      testamentFilter.toLowerCase() === "old" ||
      testamentFilter.toLowerCase() === "ot"
    ) {
      booksToSearch = booksToSearch.filter((book) =>
        OLD_TESTAMENT_BOOKS.includes(book)
      );
    } else if (
      testamentFilter.toLowerCase() === "new" ||
      testamentFilter.toLowerCase() === "nt"
    ) {
      booksToSearch = booksToSearch.filter((book) =>
        NEW_TESTAMENT_BOOKS.includes(book)
      );
    }
  }

  if (bookFilter && bookFilter.toLowerCase() !== "all") {
    // Filter by specific book (case-insensitive)
    booksToSearch = booksToSearch.filter((book) =>
      book.toLowerCase().includes(bookFilter.toLowerCase())
    );
  }

  for (const book of booksToSearch) {
    if (!jsonData[book]) continue;

    for (const chapter in jsonData[book]) {
      for (const verse in jsonData[book][chapter]) {
        const content = jsonData[book][chapter][verse];
        if (content.toLowerCase().includes(searchTerm)) {
          results.push({
            book,
            chapter: parseInt(chapter),
            verse: parseInt(verse),
            content,
            match_context: getMatchContext(content, searchTerm),
            testament: OLD_TESTAMENT_BOOKS.includes(book)
              ? "Old Testament"
              : "New Testament",
          });

          if (results.length >= limit) {
            return results;
          }
        }
      }
    }
  }

  return results;
}

function getMatchContext(content, searchTerm) {
  const index = content.toLowerCase().indexOf(searchTerm);
  if (index === -1) return content;

  const start = Math.max(0, index - 30);
  const end = Math.min(content.length, index + searchTerm.length + 30);
  const context = content.substring(start, end);

  // Highlight the search term in the context
  const regex = new RegExp(`(${searchTerm})`, "gi");
  return context.replace(regex, "**$1**");
}

async function fetchVerses(translation, verseString, idx) {
  verseString = verseString.trim().replace(/\/$/, "");
  console.log(`[${idx}] Fetching verses for:`, verseString);

  const jsonData = await readTranslation(translation);

  // Support "Book Chapter" (e.g., "Genesis 1") and "Book Chapter:Verse" (e.g., "Genesis 1:1")
  let match = verseString.match(/^(.*\S)\s+(\d+:\d+(?:-\d+)?(?:-\d+:\d+)?)$/);
  let book, range, startChapter, startVerse, endChapter, endVerse;

  if (match) {
    [_, book, range] = match;
    const parts = range.split("-");
    if (parts[0].includes(":")) {
      [startChapter, startVerse] = parts[0].split(":").map(Number);
    } else {
      startChapter = Number(parts[0]);
      startVerse = 1;
    }

    if (parts[1] && parts[1].includes(":")) {
      [endChapter, endVerse] = parts[1].split(":").map(Number);
    } else if (parts[0].includes(":")) {
      endChapter = startChapter;
      if (parts.length > 1) {
        endVerse = Number(parts[1]);
      } else {
        endVerse = startVerse;
      }
    } else {
      endChapter = Number(parts[1]);
      endVerse = Object.keys(
        (jsonData[book] && jsonData[book][endChapter]) || {}
      ).length;
    }
  } else {
    // Try matching "Book Chapter" (e.g., "Genesis 1")
    match = verseString.match(/^(.*\S)\s+(\d+)$/);
    if (!match) {
      console.error(`Invalid verse format: ${verseString}`);
      throw new Error(`Invalid verse format: ${verseString}`);
    }
    [_, book, startChapter] = match;
    startChapter = Number(startChapter);
    startVerse = 1;
    endChapter = startChapter;
    endVerse = Object.keys(
      (jsonData[book] && jsonData[book][startChapter]) || {}
    ).length;
  }

  console.log(
    `[${idx}] Parsed range for ${book}: startChapter ${startChapter}, startVerse ${startVerse}, endChapter ${endChapter}, endVerse ${endVerse}`
  );

  const results = [];
  for (let chapter = startChapter; chapter <= endChapter; chapter++) {
    const startV = chapter === startChapter ? startVerse : 1;
    const endV =
      chapter === endChapter
        ? endVerse
        : Object.keys(jsonData[book][chapter]).length;
    for (let verse = startV; verse <= endV; verse++) {
      if (jsonData[book][chapter][verse]) {
        results.push({
          book,
          chapter,
          verse,
          content: jsonData[book][chapter][verse],
        });
      }
    }
  }

  console.log(`[${idx}] Fetched ${results.length} verses for ${book}`);
  return results;
}

async function readTranslation(translation) {
  const fileName = `${translation}.json`;
  const jsonDirectory = path.join(process.cwd(), "json");
  const data = await readFile(path.join(jsonDirectory, fileName), "utf8");
  return JSON.parse(data);
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//Example Arguments:

//Single Verse:
//http://localhost:3000/NIV/single?book=Genesis&chapter=1&verse=1

//Multiple Verses:
//http://localhost:3000/NIV/multiple?verses=Genesis%201:1-3:7,Matthew%201:1-25,Psalms%201:1-6,Proverbs%201:1-6/

//Keyword Search (Single Translation):
//http://localhost:3000/NIV/search?keyword=love&limit=10

//Keyword Search with Book Filter:
//http://localhost:3000/NIV/search?keyword=faith&book=Hebrews&limit=5

//Keyword Search with Testament Filter:
//http://localhost:3000/ESV/search?keyword=covenant&testament=old&limit=20

//Multi-Translation Search:
//http://localhost:3000/search?keyword=faith&translations=NIV,ESV,KJV&limit=5

//Multi-Translation Search with Filters:
//http://localhost:3000/search?keyword=grace&translations=NIV,ESV,KJV&testament=new&limit=5
