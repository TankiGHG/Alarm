const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.disable('x-powered-by'); // also works natively in Express
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json());

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'data', 'alarms.sqlite');
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

// Basic health endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Alarm system is running' });
});

// Endpoint to create an alarm
app.post('/alarms', (req, res) => {
  const { keyword, location, units, raw_text } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO alarms (keyword, location, units, raw_text) VALUES (?, ?, ?, ?)');
    const info = stmt.run(keyword, location, units, raw_text);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get all alarms
app.get('/alarms', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM alarms ORDER BY timestamp DESC');
    const alarms = stmt.all();
    res.json(alarms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit();
});
process.on('SIGTERM', () => {
  db.close();
  process.exit();
});
