#!/usr/bin/env node
// Comprehensive pericope range audit across all versions.
// Writes one JSON report per (version, shard) into scripts/audit_reports/v2/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PERICOPE_DIR = path.join(ROOT, 'json/pericope');
const VERSES_DIR = path.join(ROOT, 'json/verses');
const SOURCE_COVERAGE_PATH = path.join(__dirname, 'source_coverage.json');
const OUT_DIR = path.join(__dirname, 'audit_reports/v2');

const VERSIONS = ['CNVS', 'CUNPSS-神', 'CUNPSS-上帝', 'CUV', 'ESV', 'KJV', 'NASB', 'NIV', 'NLT', 'TB'];
const SINGLE_CHAPTER_BOOKS = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

const SHARDS = {
  shard1: ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles'],
  shard2: ['Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon'],
  shard3: ['Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi'],
  shard4: ['Matthew','Mark','Luke','John'],
  shard5: ['Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation']
};

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function loadSourceCoverage() {
  const document = JSON.parse(fs.readFileSync(SOURCE_COVERAGE_PATH, 'utf8'));
  if (document.schemaVersion !== 1 || !document.versions) {
    throw new Error('Unsupported or invalid scripts/source_coverage.json');
  }
  return document.versions;
}

function parseRangeBound(value) {
  const normalized = String(value).trim();
  return /^-?\d+$/.test(normalized) ? Number(normalized) : NaN;
}

function expandCompactRanges(ranges, context) {
  if (!Array.isArray(ranges)) throw new Error(`Missing source coverage for ${context}`);
  const numbers = [];
  let previousEnd = 0;
  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 2) {
      throw new Error(`Invalid source coverage range for ${context}`);
    }
    const [start, end] = range;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > end) {
      throw new Error(`Invalid source coverage bounds for ${context}: ${start}-${end}`);
    }
    if (start <= previousEnd) throw new Error(`Overlapping source coverage ranges for ${context}`);
    for (let verse = start; verse <= end; verse++) numbers.push(verse);
    previousEnd = end;
  }
  return numbers;
}

function findUncoveredRanges(covered, requiredVerses) {
  const ranges = [];
  let start = null;
  let previous = null;
  for (const verse of requiredVerses) {
    if (!covered.has(verse) && start === null) start = verse;
    if ((covered.has(verse) || (previous !== null && verse !== previous + 1)) && start !== null) {
      ranges.push([start, previous]);
      start = null;
      if (!covered.has(verse)) start = verse;
    }
    previous = verse;
  }
  if (start !== null) ranges.push([start, previous]);
  return ranges;
}

function findPseudoChapters(book, verseBook, pericopeBook) {
  const chapterOne = verseBook && verseBook['1'];
  if (!SINGLE_CHAPTER_BOOKS.has(book)
      || !chapterOne
      || typeof chapterOne !== 'object'
      || Array.isArray(chapterOne)) return [];

  return Object.keys(verseBook).filter(chapter => {
    if (chapter === '1' || pericopeBook[chapter]) return false;
    const candidate = verseBook[chapter];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    const keys = Object.keys(candidate);
    return keys.length === 1 && keys[0] === '1';
  });
}

function auditVersionShard(version, shardName, books, sourceCoverage) {
  const pericopePath = path.join(PERICOPE_DIR, version + '.json');
  const versesPath = path.join(VERSES_DIR, version + '.json');

  const pericope = JSON.parse(fs.readFileSync(pericopePath, 'utf8'));
  const verses = JSON.parse(fs.readFileSync(versesPath, 'utf8'));
  const sourceVersion = sourceCoverage[version];
  if (!sourceVersion || !sourceVersion.chapterMax) {
    throw new Error(`Missing authoritative source coverage for ${version}`);
  }

  const issues = [];
  const summary = {
    booksAudited: 0,
    booksMissingInPericope: [],
    booksMissingInVerses: [],
    booksMissingInSourceCoverage: [],
    chaptersAudited: 0,
    pericopesAudited: 0,
    issueCountsByType: {}
  };

  function addIssue(type, ref, detail, extra = {}) {
    issues.push({ type, ref, detail, ...extra });
    summary.issueCountsByType[type] = (summary.issueCountsByType[type] || 0) + 1;
  }

  for (const book of books) {
    const pBook = pericope[book];
    const vBook = verses[book];
    const sourceBook = sourceVersion.chapterMax[book];

    if (!sourceBook) {
      summary.booksMissingInSourceCoverage.push(book);
      addIssue('BOOK_MISSING_IN_SOURCE_COVERAGE', book, 'Book not present in source coverage');
      continue;
    }
    if (!vBook) {
      summary.booksMissingInVerses.push(book);
      addIssue('BOOK_MISSING_IN_VERSES', book, 'Book not present in verse corpus');
    }
    if (!pBook) {
      summary.booksMissingInPericope.push(book);
      addIssue('BOOK_MISSING_IN_PERICOPE', book, 'Book not present in pericope corpus');
      continue;
    }
    summary.booksAudited++;

    // Local pseudo-chapters remain a corpus-schema error, but canonical chapter
    // coverage and range bounds come from the edition-specific source manifest.
    const pseudoChapters = findPseudoChapters(book, vBook, pBook);
    if (pseudoChapters.length) {
      addIssue(
        'VERSE_SCHEMA_PSEUDO_CHAPTERS',
        `${book}`,
        'Single-chapter book contains duplicated verse-as-chapter entries',
        { chapters: pseudoChapters },
      );
    }
    const sourceChapters = Object.keys(sourceBook);
    const pChapters = Object.keys(pBook);
    const missingChapters = sourceChapters.filter(c => !pChapters.includes(c));
    if (missingChapters.length) {
      addIssue('CHAPTER_MISSING_IN_PERICOPE', `${book}`, `Chapters not covered`, { chapters: missingChapters });
    }
    const extraChapters = pChapters.filter(c => !sourceChapters.includes(c));
    if (extraChapters.length) {
      addIssue('CHAPTER_EXTRA_IN_PERICOPE', `${book}`, 'Pericope chapters not in source coverage', { chapters: extraChapters });
    }

    for (const ch of pChapters) {
      summary.chaptersAudited++;
      const arr = pBook[ch];
      if (!Array.isArray(arr)) {
        addIssue('INVALID_STRUCTURE', `${book} ${ch}`, 'Chapter entry is not an array');
        continue;
      }
      if (!Object.hasOwn(sourceBook, ch)) continue;
      const maxVerse = Number(sourceBook[ch]) || 0;
      const requiredVerses = expandCompactRanges(
        sourceVersion.chapterCoverage && sourceVersion.chapterCoverage[book] && sourceVersion.chapterCoverage[book][ch],
        `${version} ${book} ${ch}`,
      );
      if (!requiredVerses.length || requiredVerses[requiredVerses.length - 1] !== maxVerse) {
        throw new Error(`Source coverage maximum mismatch for ${version} ${book} ${ch}`);
      }
      const requiredVerseSet = new Set(requiredVerses);

      const covered = new Map(); // verseNum -> [pericopeIndex,...]
      for (let i = 0; i < arr.length; i++) {
        summary.pericopesAudited++;
        const p = arr[i];
        const heading = p && p.heading;
        const startRaw = p && p.start;
        const endRaw = p && p.end;
        const refBase = `${book} ${ch} #${i}`;
        const refWithHead = `${book} ${ch} "${heading || ''}"`;

        if (!p || typeof p !== 'object') { addIssue('INVALID_PERICOPE', refBase, 'Not an object'); continue; }
        if (!heading) addIssue('EMPTY_HEADING', refBase, 'Missing heading');
        if (startRaw == null || endRaw == null) {
          addIssue('EMPTY_RANGE', refWithHead, 'Missing start or end');
          continue;
        }

        const s = parseRangeBound(startRaw);
        const e = parseRangeBound(endRaw);
        if (!Number.isFinite(s) || !Number.isFinite(e)) {
          addIssue('NON_NUMERIC_RANGE', refWithHead, `start=${startRaw} end=${endRaw}`);
          continue;
        }
        if (s > e) {
          addIssue('INVERTED_RANGE', refWithHead, `start ${s} > end ${e}`);
        }

        if (maxVerse) {
          if (s < 1) addIssue('START_UNDERFLOW', refWithHead, `start ${s} < 1`, { start: s, min: 1 });
          if (e < 1) addIssue('END_UNDERFLOW', refWithHead, `end ${e} < 1`, { end: e, min: 1 });
          if (s > maxVerse) addIssue('START_OVERFLOW', refWithHead, `start ${s} > max ${maxVerse}`, { start: s, max: maxVerse });
          if (e > maxVerse) addIssue('END_OVERFLOW', refWithHead, `end ${e} > max ${maxVerse}`, { end: e, max: maxVerse });
        }

        // Missing internal JSON keys may be source omissions or bridge members.
        // Track declared coverage only within the authoritative chapter bounds.
        for (let v = Math.max(s, 1); v <= Math.min(e, maxVerse); v++) {
          if (!requiredVerseSet.has(v)) continue;
          if (!covered.has(v)) covered.set(v, []);
          covered.get(v).push(i);
        }
      }

      // A combined source record is addressable at sourceKey but may cover
      // additional verse labels. Assign uncovered bridge members to the same
      // pericope as their source anchor without inventing duplicate text.
      const chapterBridges = (
        sourceVersion.chapterBridges
        && sourceVersion.chapterBridges[book]
        && sourceVersion.chapterBridges[book][ch]
      ) || [];
      for (const bridge of chapterBridges) {
        if (!Array.isArray(bridge) || bridge.length !== 3) {
          throw new Error(`Invalid source bridge for ${version} ${book} ${ch}`);
        }
        const [sourceKey, start, end] = bridge;
        if (![sourceKey, start, end].every(Number.isInteger)
            || start < 1 || start > end || end > maxVerse
            || !requiredVerseSet.has(sourceKey)) {
          throw new Error(`Invalid source bridge bounds for ${version} ${book} ${ch}`);
        }
        const sourceIndexes = covered.get(sourceKey) || [];
        if (!sourceIndexes.length) continue;
        for (let verse = start; verse <= end; verse++) {
          if (covered.has(verse) || !requiredVerseSet.has(verse)) continue;
          covered.set(verse, [...sourceIndexes]);
        }
      }

      // Overlaps
      const overlapVerses = [];
      for (const [v, idxs] of covered.entries()) {
        if (idxs.length > 1) overlapVerses.push({ verse: v, pericopeIndexes: idxs });
      }
      if (overlapVerses.length) {
        addIssue('OVERLAP', `${book} ${ch}`, `${overlapVerses.length} verse(s) covered by multiple pericopes`, { overlaps: overlapVerses.slice(0, 20) });
      }

      // The source coverage set excludes omitted labels and includes bridge
      // members, so gaps are evaluated against the edition's actual numbering.
      for (const range of findUncoveredRanges(covered, requiredVerses)) {
        const [start, end] = range;
        const firstRequired = requiredVerses[0];
        const lastRequired = requiredVerses[requiredVerses.length - 1];
        if (start === firstRequired && end === lastRequired) {
          addIssue('UNCOVERED_CHAPTER', `${book} ${ch}`, `Verses ${start}-${end} not in any pericope`, { range });
        } else if (start === firstRequired) {
          addIssue('UNCOVERED_START', `${book} ${ch}`, `Verses ${start}-${end} not in any pericope`, { range });
        } else if (end === lastRequired) {
          addIssue('UNCOVERED_END', `${book} ${ch}`, `Verses ${start}-${end} not in any pericope`, { range });
        } else {
          addIssue('GAP_BETWEEN_PERICOPES', `${book} ${ch}`, `Uncovered verses ${start}-${end}`, { gap: range });
        }
      }
    }
  }

  return { version, shard: shardName, books, summary, issues };
}

function main() {
  ensureDir(OUT_DIR);
  const sourceCoverage = loadSourceCoverage();
  const target = process.argv[2]; // optional: "VERSION:shard"

  const tasks = [];
  for (const v of VERSIONS) {
    for (const sh of Object.keys(SHARDS)) {
      if (target && target !== `${v}:${sh}`) continue;
      tasks.push([v, sh, SHARDS[sh]]);
    }
  }

  const index = [];
  let failed = false;
  for (const [v, sh, books] of tasks) {
    try {
      const report = auditVersionShard(v, sh, books, sourceCoverage);
      const safeV = v.replace(/[^A-Za-z0-9_.-]/g, '_');
      const outPath = path.join(OUT_DIR, `${safeV}_${sh}.json`);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      index.push({ version: v, shard: sh, file: path.relative(ROOT, outPath), totalIssues: report.issues.length, counts: report.summary.issueCountsByType });
      if (report.issues.length) failed = true;
      console.log(`${v} ${sh}: ${report.issues.length} issues -> ${path.relative(ROOT, outPath)}`);
    } catch (err) {
      console.error(`FAIL ${v} ${sh}: ${err.message}`);
      index.push({ version: v, shard: sh, error: err.message });
      failed = true;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '_index.json'), JSON.stringify({ generated: new Date().toISOString(), reports: index }, null, 2));
  console.log(`\nIndex: ${path.relative(ROOT, path.join(OUT_DIR, '_index.json'))}`);
  if (failed) process.exitCode = 1;
}

main();
