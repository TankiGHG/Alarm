const express = require('express');
const db = require('./src/db/database');
const { startImapListener } = require('./src/ingest/imapService');

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

  // Start IMAP listener in the background
  startImapListener();
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
