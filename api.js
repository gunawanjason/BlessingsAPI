//import path from 'path';
//import { promises as fs } from 'fs';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path')

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
  const jsonDirectory = path.join(process.cwd(), 'json');

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
  try {
    return data[bookName][chapter][verse];
  } catch (e) {
    return null;
  }
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
