const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "bible.db"));

db.pragma("journal_mode = WAL");

const schema = `
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

    CREATE UNIQUE INDEX idx_verses_point    ON verses(translation, book, chapter, verse);
    CREATE INDEX        idx_verses_book     ON verses(translation, book, chapter);

    CREATE VIRTUAL TABLE verses_fts USING fts5(
        text,
        content = verses,
        content_rowid = id
    );

    CREATE TABLE periscopes (
        id          INTEGER PRIMARY KEY,
        translation TEXT NOT NULL,
        book        TEXT NOT NULL REFERENCES books(name),
        chapter     INTEGER NOT NULL,
        heading     TEXT NOT NULL,
        start_verse INTEGER NOT NULL,
        end_verse   INTEGER NOT NULL
    );

    CREATE INDEX idx_periscopes_lookup ON periscopes(translation, book, chapter);
`;

const tableExists = db
  .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='verses'`)
  .get();

if (!tableExists) {
  db.exec(schema);
}

module.exports = db;
