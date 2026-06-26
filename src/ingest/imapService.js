const imaps = require('imap-simple');
const db = require('../db/database');
const sse = require('../sse');

const config = {
    imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: parseInt(process.env.IMAP_PORT) || 993,
        tls: process.env.IMAP_TLS !== 'false',
        authTimeout: 3000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

let connection;
let isReconnecting = false;

// Robust Regex Parser for 'Einsatzauftrag: Brand B3 Dachstuhl, Feuerwehr Lengfeld, Laurentiusstraße, 97076 Würzburg'
// Format assumed: "Einsatzauftrag: <Keyword>, <Units>, <Location>"
function parseEmailBody(text) {
    const regex = /Einsatzauftrag:\s*(.*?),\s*(.*?),\s*(.*)/;
    const match = text.match(regex);

    if (match) {
        return {
            keyword: match[1].trim(),
            units: match[2].trim(),
            location: match[3].trim(),
            raw_text: text
        };
    }
    return null;
}

function processMessage(messageText) {
    const parsedData = parseEmailBody(messageText);

    if (parsedData) {
        try {
            const stmt = db.prepare('INSERT INTO alarms (keyword, location, units, raw_text) VALUES (?, ?, ?, ?)');
            const info = stmt.run(parsedData.keyword, parsedData.location, parsedData.units, parsedData.raw_text);

            const alarmPayload = {
                id: info.lastInsertRowid,
                keyword: parsedData.keyword,
                location: parsedData.location,
                units: parsedData.units,
                raw_text: parsedData.raw_text,
                delay: 0,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };

            sse.broadcast('new_alarm', alarmPayload);
            console.log('Alarm successfully processed and saved:', parsedData.keyword);
        } catch (error) {
            console.error('Error saving alarm to database:', error);
        }
    } else {
        console.warn('Could not parse email body:', messageText);
    }
}

async function connectImap() {
    if (isReconnecting) return;

    try {
        console.log('Connecting to IMAP server...');
        connection = await imaps.connect(config);
        console.log('Connected to IMAP server successfully.');

        await connection.openBox('INBOX');

        // Setup event listeners for new mail and connection drop
        connection.on('mail', async (numNewMsgs) => {
            console.log(`Received ${numNewMsgs} new messages`);
            try {
                const searchCriteria = ['UNSEEN'];
                const fetchOptions = { bodies: ['TEXT'], markSeen: true };

                const messages = await connection.search(searchCriteria, fetchOptions);
                for (const item of messages) {
                    const bodyPart = item.parts.find(part => part.which === 'TEXT');
                    if (bodyPart) {
                        const messageText = bodyPart.body.toString('utf8');
                        processMessage(messageText);
                    }
                }
            } catch (err) {
                console.error('Error processing new mail:', err);
            }
        });

        connection.on('error', (err) => {
            console.error('IMAP Error:', err);
            handleReconnect();
        });

        connection.on('close', () => {
            console.log('IMAP Connection closed');
            handleReconnect();
        });

    } catch (err) {
        console.error('Failed to connect to IMAP server:', err);
        handleReconnect();
    }
}

function handleReconnect() {
    if (isReconnecting) return;
    isReconnecting = true;
    console.log('Attempting to reconnect to IMAP server in 10 seconds...');
    setTimeout(() => {
        isReconnecting = false;
        connectImap();
    }, 10000);
}

function startImapListener() {
    // Only attempt connection if IMAP configuration is present (skips attempting local undefined connection)
    if (process.env.IMAP_HOST) {
        connectImap();
    } else {
        console.log('IMAP configuration missing (IMAP_HOST). Skipping IMAP listener startup.');
    }
}

module.exports = {
    startImapListener,
    parseEmailBody,
    processMessage
};
