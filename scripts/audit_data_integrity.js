#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const VERSE_DIR = path.join(ROOT, "json", "verses");
const PERICOPE_DIR = path.join(ROOT, "json", "pericope");
const TRANSLATIONS = [
  "NIV",
  "ESV",
  "KJV",
  "NASB",
  "NLT",
  "TLB",
  "CNVS",
  "CUNPSS-上帝",
  "CUNPSS-神",
  "CUV",
  "TB",
];
const HEADING_TRANSLATIONS = TRANSLATIONS.filter((value) => value !== "TLB");
const ONE_CHAPTER_BOOKS = new Set(["Obadiah", "Philemon", "2 John", "3 John", "Jude"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function issue(list, translation, type, reference, detail) {
  list.push({ translation, type, reference, detail });
}

function auditVerses(translation, canonicalBooks) {
  const issues = [];
  const filePath = path.join(VERSE_DIR, `${translation}.json`);
  const data = readJson(filePath);
  const books = Object.keys(data);
  const missing = canonicalBooks.filter((book) => !books.includes(book));
  const extra = books.filter((book) => !canonicalBooks.includes(book));
  if (missing.length) issue(issues, translation, "MISSING_BOOKS", "Bible", missing.join(", "));
  if (extra.length) issue(issues, translation, "EXTRA_BOOKS", "Bible", extra.join(", "));

  let chapters = 0;
  let verses = 0;
  for (const [book, bookData] of Object.entries(data)) {
    if (!bookData || typeof bookData !== "object" || Array.isArray(bookData)) {
      issue(issues, translation, "INVALID_BOOK", book, "Expected an object of chapters");
      continue;
    }
    for (const [chapter, chapterData] of Object.entries(bookData)) {
      chapters += 1;
      if (!/^[1-9]\d*$/.test(chapter)) {
        issue(issues, translation, "INVALID_CHAPTER_KEY", `${book} ${chapter}`, "Expected a positive integer key");
      }
      if (ONE_CHAPTER_BOOKS.has(book) && chapter !== "1") {
        issue(issues, translation, "PSEUDO_CHAPTER", `${book} ${chapter}`, "Canonical one-chapter book");
      }
      if (!chapterData || typeof chapterData !== "object" || Array.isArray(chapterData)) {
        issue(issues, translation, "INVALID_CHAPTER", `${book} ${chapter}`, "Expected an object of verses");
        continue;
      }
      for (const [verse, content] of Object.entries(chapterData)) {
        verses += 1;
        const reference = `${book} ${chapter}:${verse}`;
        if (!/^[1-9]\d*$/.test(verse)) {
          issue(issues, translation, "INVALID_VERSE_KEY", reference, "Expected a positive integer key");
        }
        if (typeof content !== "string") {
          issue(issues, translation, "INVALID_VERSE_TEXT", reference, `Expected string, received ${typeof content}`);
        } else if (!content.trim()) {
          issue(issues, translation, "EMPTY_VERSE_TEXT", reference, "Blank verse values are not API-safe");
        } else if (content.trim().toLowerCase() === "a") {
          issue(issues, translation, "PLACEHOLDER_VERSE_TEXT", reference, "Literal placeholder marker");
        }
      }
    }
  }
  return { books: books.length, chapters, verses, issues };
}

function auditPericopes(translation, canonicalBooks) {
  const issues = [];
  const data = readJson(path.join(PERICOPE_DIR, `${translation}.json`));
  const books = Object.keys(data);
  const missing = canonicalBooks.filter((book) => !books.includes(book));
  const extra = books.filter((book) => !canonicalBooks.includes(book));
  if (missing.length) issue(issues, translation, "MISSING_PERICOPE_BOOKS", "Bible", missing.join(", "));
  if (extra.length) issue(issues, translation, "EXTRA_PERICOPE_BOOKS", "Bible", extra.join(", "));

  let pericopes = 0;
  for (const [book, chapters] of Object.entries(data)) {
    for (const [chapter, entries] of Object.entries(chapters || {})) {
      if (!Array.isArray(entries)) {
        issue(issues, translation, "INVALID_PERICOPE_CHAPTER", `${book} ${chapter}`, "Expected an array");
        continue;
      }
      entries.forEach((entry, index) => {
        pericopes += 1;
        const reference = `${book} ${chapter} #${index}`;
        if (!entry || typeof entry !== "object") {
          issue(issues, translation, "INVALID_PERICOPE", reference, "Expected an object");
          return;
        }
        if (typeof entry.heading !== "string" || !entry.heading.trim()) {
          issue(issues, translation, "EMPTY_HEADING", reference, "Heading is required");
        }
        if (!/^\d+$/.test(String(entry.start)) || !/^\d+$/.test(String(entry.end))) {
          issue(issues, translation, "INVALID_RANGE", reference, `start=${entry.start} end=${entry.end}`);
        } else if (Number(entry.start) > Number(entry.end)) {
          issue(issues, translation, "INVERTED_RANGE", reference, `start=${entry.start} end=${entry.end}`);
        }
      });
    }
  }
  return { books: books.length, pericopes, issues };
}

function main() {
  const canonicalBooks = Object.keys(readJson(path.join(VERSE_DIR, "KJV.json")));
  const allIssues = [];

  console.log("Verse corpora");
  for (const translation of TRANSLATIONS) {
    const result = auditVerses(translation, canonicalBooks);
    allIssues.push(...result.issues);
    console.log(
      `${translation.padEnd(12)} books=${String(result.books).padStart(2)} ` +
      `chapters=${String(result.chapters).padStart(4)} verses=${String(result.verses).padStart(5)} ` +
      `issues=${result.issues.length}`,
    );
  }

  console.log("\nPericope corpora");
  for (const translation of HEADING_TRANSLATIONS) {
    const result = auditPericopes(translation, canonicalBooks);
    allIssues.push(...result.issues);
    console.log(
      `${translation.padEnd(12)} books=${String(result.books).padStart(2)} ` +
      `pericopes=${String(result.pericopes).padStart(4)} issues=${result.issues.length}`,
    );
  }

  if (allIssues.length) {
    console.error(`\nIntegrity failures: ${allIssues.length}`);
    for (const item of allIssues.slice(0, 50)) {
      console.error(
        `- ${item.translation} ${item.type} ${item.reference}: ${item.detail}`,
      );
    }
    if (allIssues.length > 50) console.error(`... ${allIssues.length - 50} more`);
    process.exitCode = 1;
  } else {
    console.log("\nAll production corpora passed baseline integrity checks.");
  }
}

main();
