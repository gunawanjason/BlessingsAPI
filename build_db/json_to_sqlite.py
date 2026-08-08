import sqlite3
import json
import os
import glob

OLD_TESTAMENT = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
    "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi"
]

NEW_TESTAMENT = [
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
    "Jude", "Revelation"
]

BOOKS = (
    [(name, "old") for name in OLD_TESTAMENT] +
    [(name, "new") for name in NEW_TESTAMENT]
)

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR      = os.path.dirname(SCRIPT_DIR)

DB_PATH       = os.path.join(ROOT_DIR, "bible.db")
VERSES_DIR    = os.path.join(ROOT_DIR, "json", "verses")
PERICOPE_DIR = os.path.join(ROOT_DIR, "json", "pericope")

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"Removed existing {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA synchronous = NORMAL")
conn.execute("PRAGMA foreign_keys = ON")

conn.executescript("""
    CREATE TABLE books (
        name        TEXT PRIMARY KEY,
        testament   TEXT NOT NULL CHECK(testament IN ('old', 'new'))
    );

    CREATE TABLE verses (
        id          INTEGER PRIMARY KEY,
        translation TEXT NOT NULL,
        book        TEXT NOT NULL REFERENCES books(name),
        chapter     INTEGER NOT NULL,
        verse       INTEGER NOT NULL,
        text        TEXT NOT NULL
    );

    CREATE UNIQUE INDEX idx_verses_point ON verses(translation, book, chapter, verse);
    CREATE INDEX        idx_verses_book  ON verses(translation, book, chapter);

    CREATE VIRTUAL TABLE verses_fts USING fts5(
        text,
        content = verses,
        content_rowid = id
    );

    CREATE TABLE pericopes (
        id          INTEGER PRIMARY KEY,
        translation TEXT NOT NULL,
        book        TEXT NOT NULL REFERENCES books(name),
        chapter     INTEGER NOT NULL,
        heading     TEXT NOT NULL,
        start_verse INTEGER NOT NULL,
        end_verse   INTEGER NOT NULL
    );

    CREATE INDEX idx_pericopes_lookup ON pericopes(translation, book, chapter);
""")

conn.executemany("INSERT INTO books (name, testament) VALUES (?, ?)", BOOKS)
conn.commit()
print(f"Inserted {len(BOOKS)} books")

verse_files = glob.glob(os.path.join(VERSES_DIR, "*.json"))
total_verses = 0

for filepath in verse_files:
    translation = os.path.splitext(os.path.basename(filepath))[0]
    print(f"Processing verses: {translation}")
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for book, chapters in data.items():
        for chapter_str, verses in chapters.items():
            for verse_str, text in verses.items():
                rows.append((
                    translation,
                    book,
                    int(chapter_str),
                    int(verse_str),
                    text
                ))

    with conn:
        conn.executemany(
            "INSERT INTO verses (translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
            rows
        )

    total_verses += len(rows)
    print(f"  [{translation}] {len(rows):,} verses inserted")

print(f"Total verses: {total_verses:,}")

pericope_files = glob.glob(os.path.join(PERICOPE_DIR, "*.json"))
total_pericopes = 0

for filepath in pericope_files:
    translation = os.path.splitext(os.path.basename(filepath))[0]
    print(f"Processing pericope: {translation}")
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for book, chapters in data.items():
        for chapter_str, headings in chapters.items():
            for entry in headings:
                rows.append((
                    translation,
                    book,
                    int(chapter_str),
                    entry["heading"],
                    int(entry["start"]),
                    int(entry["end"])
                ))

    with conn:
        conn.executemany(
            "INSERT INTO pericopes (translation, book, chapter, heading, start_verse, end_verse) VALUES (?, ?, ?, ?, ?, ?)",
            rows
        )

    total_pericopes += len(rows)
    print(f"  [{translation}] {len(rows):,} pericope entries inserted")

print(f"Total pericope entries: {total_pericopes:,}")

print("Building FTS index...")
conn.execute("INSERT INTO verses_fts(verses_fts) VALUES('rebuild')")
conn.commit()
print("FTS index built")

conn.close()
print(f"\nDone. Database written to: {DB_PATH}")