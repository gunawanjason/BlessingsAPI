# 🙏 Blessings API

A comprehensive Bible verse API that provides access to multiple Bible translations through a simple REST interface. Built with Node.js and Express, this API allows developers to fetch single verses or multiple verse ranges with flexible formatting options.

## 🌐 Live API

**The API is already hosted and available for everyone to use at:**
**https://api.blessings365.top**

You can start using it immediately without any setup required!

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Available Translations](#available-translations)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- 📖 **Multiple Bible Translations**: Support for 11+ Bible translations including NIV, ESV, KJV, NASB, and more
- 🔍 **Single Verse Lookup**: Fetch individual verses by book, chapter, and verse number
- 📚 **Multiple Verse Ranges**: Retrieve verse ranges, entire chapters, or multiple references in one request
- 🌐 **CORS Enabled**: Ready for web application integration
- 🚀 **Fast & Lightweight**: Minimal dependencies with efficient JSON data structure
- 📱 **Flexible Formatting**: Support for various verse reference formats
- 🔧 **Easy Integration**: Simple REST API with JSON responses

## 🚀 Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd BlessingsAPI

# Install dependencies
npm install

# Start the server
npm start
```

The API will be available at `http://localhost:3000`

## 🏃‍♂️ Quick Start

### Get a Single Verse

```bash
curl "https://api.blessings365.top/NIV/single?book=John&chapter=3&verse=16"
```

### Get Multiple Verses

```bash
curl "https://api.blessings365.top/ESV/multiple?verses=Genesis 1:1-3,Psalms 23:1-6"
```

### Local Development

If you want to run the API locally:

```bash
# Clone and setup the project
git clone <repository-url>
cd BlessingsAPI
npm install
npm start

# Then use localhost
curl "http://localhost:3000/NIV/single?book=John&chapter=3&verse=16"
```

## 📖 API Documentation

For complete API documentation with interactive examples, open [`index.html`](index.html) in your browser after starting the server.

### Base URL

**Hosted API (Recommended):**
```
https://api.blessings365.top
```

**Local Development:**
```
http://localhost:3000
```

### Endpoints

#### Single Verse
```
GET /{translation}/single
```

**Parameters:**
- `translation` (path): Bible translation code (e.g., NIV, ESV, KJV)
- `book` (query): Bible book name (e.g., Genesis, Matthew, Psalms)
- `chapter` (query): Chapter number (integer)
- `verse` (query): Verse number (integer)

**Example:**
```
GET https://api.blessings365.top/NIV/single?book=Genesis&chapter=1&verse=1
```

#### Multiple Verses
```
GET /{translation}/multiple
```

**Parameters:**
- `translation` (path): Bible translation code
- `verses` (query): Comma-separated list of verse references

**Supported Formats:**
- Single verse: `"Genesis 1:1"`
- Verse range: `"Genesis 1:1-3"`
- Chapter range: `"Genesis 1:1-2:3"`
- Entire chapter: `"Genesis 1"`
- Multiple chapters: `"Genesis 1-3"`

**Example:**
```
GET https://api.blessings365.top/NIV/multiple?verses=Genesis 1:1-3,Matthew 1:1-25,Psalms 1:1-6
```

## 📚 Available Translations

| Code | Translation | Language |
|------|-------------|----------|
| `NIV` | New International Version | English |
| `ESV` | English Standard Version | English |
| `KJV` | King James Version | English |
| `NASB` | New American Standard Bible | English |
| `NLT` | New Living Translation | English |
| `TLB` | The Living Bible | English |
| `CNVS` | Chinese New Version Simplified | Chinese |
| `CUNPSS-上帝` | Chinese Union (上帝) | Chinese |
| `CUNPSS-神` | Chinese Union (神) | Chinese |
| `TB` | Terjemahan Baru | Indonesian |

## 💡 Usage Examples

### JavaScript/Fetch

```javascript
// Single verse
async function getVerse() {
  const response = await fetch('https://api.blessings365.top/NIV/single?book=John&chapter=3&verse=16');
  const verse = await response.json();
  console.log(`${verse.book} ${verse.chapter}:${verse.verse} - ${verse.content}`);
}

// Multiple verses
async function getVerses() {
  const response = await fetch('https://api.blessings365.top/ESV/multiple?verses=Psalms 23:1-6,John 14:6');
  const verses = await response.json();
  verses.forEach(verse => {
    console.log(`${verse.book} ${verse.chapter}:${verse.verse} - ${verse.content}`);
  });
}
```

### Python

```python
import requests

# Single verse
def get_single_verse():
    response = requests.get('https://api.blessings365.top/NLT/single',
                           params={'book': 'Philippians', 'chapter': 4, 'verse': 13})
    verse = response.json()
    print(f"{verse['book']} {verse['chapter']}:{verse['verse']} - {verse['content']}")

# Multiple verses
def get_multiple_verses():
    response = requests.get('https://api.blessings365.top/ESV/multiple',
                           params={'verses': 'Isaiah 40:31,Jeremiah 29:11'})
    verses = response.json()
    for verse in verses:
        print(f"{verse['book']} {verse['chapter']}:{verse['verse']} - {verse['content']}")
```

### cURL

```bash
# Single verse
curl "https://api.blessings365.top/KJV/single?book=Romans&chapter=8&verse=28"

# Multiple verses with URL encoding
curl "https://api.blessings365.top/NASB/multiple?verses=1%20Corinthians%2013:4-8,Ephesians%202:8-9"
```

## ⚠️ Error Handling

### Common Error Responses

**404 - Verse Not Found**
```json
{
  "error": "Verse not found: Genesis 1:999"
}
```

**500 - Server Error**
```json
{
  "error": "Error fetching the verse."
}
```

### Best Practices

- Always check the response status code
- Handle network errors appropriately
- Validate translation codes before making requests
- URL-encode verse references with special characters

## 🗂️ Project Structure

```
BlessingsAPI/
├── api.js                 # Main API server
├── package.json           # Project dependencies
├── vercel.json           # Vercel deployment config
├── index.html            # API documentation
├── README.md             # This file
├── .gitignore            # Git ignore rules
├── json/                 # Bible translation data
│   ├── NIV.json
│   ├── ESV.json
│   ├── KJV.json
│   └── ...
└── scrape_biblegateway/  # Data scraping utilities
    ├── bible_vars.py
    └── scrappy.py
```

## 🛠️ Development

### Adding New Translations

1. Add the JSON file to the `json/` directory
2. Follow the existing JSON structure:
   ```json
   {
     "BookName": {
       "ChapterNumber": {
         "VerseNumber": "Verse content"
       }
     }
   }
   ```
3. Update the translation list in the documentation

### Running Tests

```bash
# Test single verse endpoint
curl "https://api.blessings365.top/NIV/single?book=John&chapter=3&verse=16"

# Test multiple verses endpoint
curl "https://api.blessings365.top/ESV/multiple?verses=Genesis 1:1-3"
```

## 🚀 Deployment

### Vercel

This project is configured for easy deployment on Vercel:

```bash
vercel deploy
```

### Other Platforms

The API can be deployed on any platform that supports Node.js:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS Lambda (with serverless framework)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Bible translations provided by various publishers
- Built with Express.js for robust API functionality
- Inspired by the need to make scripture accessible through technology

---

**Made with ❤️ to spread the Word through technology**