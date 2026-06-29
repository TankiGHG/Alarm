const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Initialize SQLite Database
const dataDir = path.join(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });
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
    delay INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    callsign TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS crew (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER,
    vehicle_id INTEGER,
    FOREIGN KEY(crew_id) REFERENCES crew(id),
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
    UNIQUE(crew_id)
  );
`);

// Migration for databases created before the ended_at column existed
try {
  db.exec('ALTER TABLE alarms ADD COLUMN ended_at DATETIME DEFAULT NULL');
} catch (err) {
  // Column already exists, ignore
}

module.exports = db;
