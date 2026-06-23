const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'alarms.sqlite');
const db = new Database(dbPath);

// Crucial: Set WAL mode and synchronous pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT,
    location TEXT,
    units TEXT,
    raw_text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
