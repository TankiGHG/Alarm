const db = require('./src/db/database');

try {
  db.exec(`
    ALTER TABLE alarms ADD COLUMN delay INTEGER DEFAULT 0;
  `);
  console.log("Added delay column");
} catch(e) {
  console.log("Column may already exist:", e.message);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crew_id INTEGER,
      vehicle_id INTEGER,
      FOREIGN KEY(crew_id) REFERENCES crew(id),
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
      UNIQUE(crew_id)
    );
  `);
  console.log("Created assignments table");
} catch(e) {
  console.log("Error creating assignments:", e.message);
}
