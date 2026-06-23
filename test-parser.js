const { processMessage } = require('./src/ingest/imapService');
const db = require('./src/db/database');

const mockString = 'Einsatzauftrag: Brand B3 Dachstuhl, Feuerwehr Lengfeld, Laurentiusstraße, 97076 Würzburg';

console.log('Running mock test...');
processMessage(mockString);

const stmt = db.prepare('SELECT * FROM alarms ORDER BY timestamp DESC LIMIT 1');
const lastAlarm = stmt.get();

console.log('\nLast database entry:');
console.log(lastAlarm);

process.exit(0);
