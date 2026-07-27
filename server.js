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
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org https://api.open-meteo.com; img-src 'self' data: https://*.tile.openstreetmap.org https://unpkg.com");
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
  const { keyword, location, units, raw_text, delay } = req.body;
  const delayMinutes = parseInt(delay, 10) || 0;

  try {
    const stmt = db.prepare('INSERT INTO alarms (keyword, location, units, raw_text, delay) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(keyword, location, units, raw_text, delayMinutes);

    const alarmPayload = {
        id: info.lastInsertRowid,
        keyword,
        location,
        units,
        raw_text,
        delay: delayMinutes,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    if (delayMinutes > 0) {
        console.log(`Alarm scheduled. Delaying broadcast by ${delayMinutes} minutes.`);
        setTimeout(() => {
            sse.broadcast('new_alarm', alarmPayload);
        }, delayMinutes * 60 * 1000);
    } else {
        sse.broadcast('new_alarm', alarmPayload);
    }

    res.status(201).json({ id: info.lastInsertRowid, scheduled: delayMinutes > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to get all alarms
app.get('/api/alarms', verifyToken, (req, res) => {
  try {
    // Only return alarms whose effective time (timestamp + delay) has passed
    const stmt = db.prepare(`
      SELECT * FROM alarms
      WHERE datetime(timestamp, '+' || delay || ' minutes') <= datetime('now')
      ORDER BY timestamp DESC
      LIMIT 50
    `);
    const alarms = stmt.all();
    res.json(alarms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to end the active alarm
app.post('/api/alarms/:id/end', verifyToken, (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare("UPDATE alarms SET ended_at = datetime('now') WHERE id = ? AND ended_at IS NULL");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Alarm not found or already ended' });
    }

    sse.broadcast('alarm_ended', { id: parseInt(id, 10) });
    res.json({ success: true });
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

const VALID_FMS_STATUS = ['1', '2', '3', '4', '5', '6'];

app.patch('/api/vehicles/:id/status', verifyToken, (req, res) => {
  const { id } = req.params;
  const { fms_status } = req.body;
  if (!VALID_FMS_STATUS.includes(fms_status)) {
    return res.status(400).json({ error: 'Invalid FMS status' });
  }
  try {
    const stmt = db.prepare('UPDATE vehicles SET fms_status = ? WHERE id = ?');
    stmt.run(fms_status, id);
    sse.broadcast('vehicle_status', { id: parseInt(id, 10), fms_status });
    res.json({ success: true });
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

app.delete('/api/crew/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM assignments WHERE crew_id = ?').run(id);
    db.prepare('DELETE FROM crew WHERE id = ?').run(id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoints for assignments
app.get('/api/assignments', verifyToken, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT a.id, c.name as crew_name, c.role as crew_role, v.id as vehicle_id, v.callsign as vehicle_callsign, v.fms_status as vehicle_fms_status
      FROM assignments a
      JOIN crew c ON a.crew_id = c.id
      JOIN vehicles v ON a.vehicle_id = v.id
    `);
    res.json(stmt.all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments', verifyToken, (req, res) => {
  const { crew_id, vehicle_id } = req.body;
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO assignments (crew_id, vehicle_id) VALUES (?, ?)');
    const info = stmt.run(crew_id, vehicle_id);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assignments/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM assignments WHERE id = ?');
    stmt.run(id);
    res.sendStatus(204);
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
