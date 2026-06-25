const express = require('express');
const path = require('path');
const db = require('./src/db/database');
const { startImapListener } = require('./src/ingest/imapService');
const { requireLogin, verifyToken } = require('./src/auth/authMiddleware');
const authRoutes = require('./src/auth/routes');
const sse = require('./src/sse');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.disable('x-powered-by'); // also works natively in Express
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json());

// Auth routes
app.use('/api', authRoutes);

// Protected Static Files
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Redirect root to monitor
app.get('/', (req, res) => {
    res.redirect('/monitor.html');
});

// Serve monitor and admin with requireLogin
app.get('/monitor.html', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});
app.get('/admin.html', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// SSE Endpoint
app.get('/api/stream', verifyToken, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    sse.addClient(res);

    req.on('close', () => {
        sse.removeClient(res);
    });
});

// Endpoint to create an alarm
app.post('/api/alarms', verifyToken, (req, res) => {
  const { keyword, location, units, raw_text } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO alarms (keyword, location, units, raw_text) VALUES (?, ?, ?, ?)');
    const info = stmt.run(keyword, location, units, raw_text);

    sse.broadcast('new_alarm', {
        id: info.lastInsertRowid,
        keyword,
        location,
        units,
        raw_text,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get all alarms
app.get('/api/alarms', verifyToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM alarms ORDER BY timestamp DESC LIMIT 50');
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

// Endpoints for vehicles
app.get('/api/vehicles', verifyToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM vehicles ORDER BY callsign ASC');
    res.json(stmt.all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', verifyToken, (req, res) => {
  const { callsign } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO vehicles (callsign) VALUES (?)');
    const info = stmt.run(callsign);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoints for crew
app.get('/api/crew', verifyToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM crew ORDER BY name ASC');
    res.json(stmt.all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/crew', verifyToken, (req, res) => {
  const { name, role } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO crew (name, role) VALUES (?, ?)');
    const info = stmt.run(name, role);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
