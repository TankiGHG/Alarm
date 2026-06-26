const Database = require('better-sqlite3');
const path = require('path');

// Initialize SQLite Database
const dbPath = path.join(__dirname, '../../data', 'alarms.sqlite');
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
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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

module.exports = db;
