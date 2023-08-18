const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const util = require('util');
const cors = require('cors');

const readFile = util.promisify(fs.readFile);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/:translation/single', async (req, res) => {
  const { translation } = req.params;
  let { book, chapter, verse } = req.query;
  chapter = parseInt(chapter, 10);
  verse = parseInt(verse, 10);

  try {
    const jsonData = await readTranslation(translation);
    if (jsonData[book] && jsonData[book][chapter] && jsonData[book][chapter][verse]) {
      res.json({ book, chapter, verse, content: jsonData[book][chapter][verse] });
    } else {
      res.status(404).json({ error: `Verse not found: ${book} ${chapter}:${verse}` });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error fetching the verse.' });
  }
});

app.get('/:translation/multiple', async (req, res) => {
  const { translation } = req.params;
  const verses = req.query.verses.split(',');
  try {
    const allVerses = await Promise.all(verses.map((verse, idx) => fetchVerses(translation, verse, idx)));
    const flattenedVerses = allVerses.flat();
    res.json(flattenedVerses);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error fetching the verses.' });
  }
});

async function fetchVerses(translation, verseString, idx) {
  verseString = verseString.trim().replace(/\/$/, '');
  console.log(`[${idx}] Fetching verses for:`, verseString);

  const jsonData = await readTranslation(translation);

  // Extract the book and range using a regular expression
  const match = verseString.match(/^(.*\S)(?:\s+)(\d+:\d+(?:-\d+)?(?:-\d+:\d+)?)$/);
  if (!match) {
    console.error(`Invalid verse format: ${verseString}`);
    throw new Error(`Invalid verse format: ${verseString}`);
  }
  const [_, book, range] = match;

  const parts = range.split('-');
  
  if (parts[0].includes(':')) {
    [startChapter, startVerse] = parts[0].split(':').map(Number);
  } else {
    startChapter = Number(parts[0]);
    startVerse = 1;
  }

  if (parts[1] && parts[1].includes(':')) {
    [endChapter, endVerse] = parts[1].split(':').map(Number);
  } else if (parts[0].includes(':')) {
    endChapter = startChapter;
    if (parts.length > 1) {
        endVerse = Number(parts[1]);
    } else {
        endVerse = startVerse;
    }
  } else {
    endChapter = Number(parts[1]);
    endVerse = Object.keys(jsonData[book] && jsonData[book][endChapter] || {}).length;
  }
  
  console.log(`[${idx}] Parsed range for ${book}: startChapter ${startChapter}, startVerse ${startVerse}, endChapter ${endChapter}, endVerse ${endVerse}`);

  const results = [];
  for (let chapter = startChapter; chapter <= endChapter; chapter++) {
    const startV = (chapter === startChapter) ? startVerse : 1;
    const endV = (chapter === endChapter) ? endVerse : Object.keys(jsonData[book][chapter]).length;
    for (let verse = startV; verse <= endV; verse++) {
      if (jsonData[book][chapter][verse]) {
        results.push({ book, chapter, verse, content: jsonData[book][chapter][verse] });
      }
    }
  }

  console.log(`[${idx}] Fetched ${results.length} verses for ${book}`);
  return results;
}

async function readTranslation(translation) {
  const fileName = `${translation}.json`;
  const jsonDirectory = path.join(process.cwd(), 'json');
  const data = await readFile(path.join(jsonDirectory, fileName), 'utf8');
  return JSON.parse(data);
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//Example Argument
//http://localhost:3000/NIV/multiple?verses=Genesis%201:1-3:7,Matthew%201:1-25,Psalms%201:1-6,Proverbs%201:1-6/

//Sample for Single Fetch
//http://localhost:3000/NIV/single?book=Genesis&chapter=1&verse=1