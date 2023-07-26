import path from 'path';
import { promises as fs } from 'fs';

const express = require('express');
const bodyParser = require('body-parser');
//const fs = require('fs');

const app = express();
const port = 3000; // Change this to the desired port number

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Endpoint for fetching the verse
app.get('/:translation/:book/:chapter/:verse', (req, res) => {
  const translation = req.params.translation;
  const bookName = req.params.book;
  const chapter = parseInt(req.params.chapter);
  const verse = parseInt(req.params.verse);

  // Assuming the JSON files are named as 'translation.json', 'translation2.json', etc.
  const fileName = `${translation}.json`;
  // Get current directory
  const jsonDirectory = path.join(process.cwd());

  fs.readFile(jsonDirectory+"/"+fileName, 'utf8', (err, data) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error reading the file.' });
    }

    try {
      const jsonData = JSON.parse(data);
      const verseContent = findVerse(jsonData, bookName, chapter, verse);
      if (verseContent) {
        res.json({ content: verseContent });
      } else {
        res.status(404).json({ error: 'Verse not found.' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error parsing JSON data.' });
    }
  });
});

// Function to search for a particular verse in the JSON data
function findVerse(data, bookName, chapter, verse) {
  for (let i = 0; i < data.length; i++) {
    let book = data[i];
    if (book.book === bookName) {
      if (book.hasOwnProperty('chapters') && book.chapters.length >= chapter) {
        let targetChapter = book.chapters[chapter - 1];
        if (targetChapter.length >= verse) {
          return targetChapter[verse - 1];
        }
      }
    }
  }
  return null;
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
