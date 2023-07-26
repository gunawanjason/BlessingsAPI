// api/verse.js

const axios = require('axios');

module.exports = async (req, res) => {
  const { translation, book, chapter: chapterStr, verse: verseStr } = req.query;
  const chapter = parseInt(chapterStr);
  const verse = parseInt(verseStr);

  // Construct the URL for the GitHub JSON file
  const url = `https://raw.githubusercontent.com/gunawanjason/bible_json/main/repo/${translation}.json`;

  try {
    const response = await axios.get(url);
    const jsonData = response.data;

    const verseContent = findVerse(jsonData, book, chapter, verse);
    if (verseContent) {
      res.json({ content: verseContent });
    } else {
      res.status(404).json({ error: 'Verse not found.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error fetching or parsing JSON data.' });
  }
};

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
