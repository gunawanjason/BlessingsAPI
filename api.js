const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
  // Trim whitespace and slashes from the verse string
  verseString = verseString.trim().replace(/\/$/, '');
  console.log(`[${idx}] Fetching verses for:`, verseString); // Log the input

  const jsonData = await readTranslation(translation);
  const [book, range] = verseString.split(' ');

  let startChapter, startVerse, endChapter, endVerse;

  if (range.includes(':')) {
    const parts = range.split(/[:-]/).map(Number);
    if (parts.length === 4) {
      [startChapter, startVerse, endChapter, endVerse] = parts;
    } else {
      [startChapter, startVerse, endVerse] = parts;
      endChapter = startChapter;
    }
  } else {
    [startChapter, endChapter] = range.split('-').map(Number);
    startVerse = 1;
    endVerse = Object.keys(jsonData[book][endChapter]).length;
  }

  console.log(`[${idx}] Parsed range for ${book}: startChapter ${startChapter}, startVerse ${startVerse}, endChapter ${endChapter}, endVerse ${endVerse}`); // Log the parsed range

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

  console.log(`[${idx}] Fetched ${results.length} verses for ${book}`); // Log the number of verses fetched
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