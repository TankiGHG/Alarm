# Lightweight Alerting System

Ein extrem leichtgewichtiges, schnelles und sicheres Alarmierungs-System (ähnlich Alamos/FE2), das komplett auf "Zero Bloatware" setzt. Entwickelt mit Node.js, Express.js und SQLite.

## Architektur & Philosophie
- **Zero Bloatware:** Nur das Nötigste. Security-Header werden manuell gesetzt, keine überflüssigen NPM-Abhängigkeiten wie `helmet` oder ORMs.
- **Höchste Performance:** Nutzt die synchron arbeitende `better-sqlite3` Bibliothek.
- **Lock-Free Concurrency:** Die SQLite-Datenbank wird zwingend im **WAL-Modus (Write-Ahead Logging)** und mit `synchronous = NORMAL` betrieben, um parallele Lese- und Schreibzugriffe ohne Locks zu ermöglichen.
- **Security:** Alle Datenbank-Queries nutzen Prepared Statements (Schutz vor SQL-Injection). Der Docker-Container läuft restriktiv unter dem non-root User `node`.
- **IMAP Ingest:** Integrierter IMAP-Listener (via `imap-simple`), der kontinuierlich E-Mails ausliest, mit einem Regex-Parser Einsatzdaten extrahiert und persistiert. Bei Serverausfall greift eine robuste Auto-Reconnect-Logik.

## Voraussetzungen
- Docker und Docker Compose

## Installation & Start

1. Das Repository klonen oder die Dateien bereitstellen.
2. Umgebungsvariablen anpassen (optional via `.env` Datei im Root, die von Docker Compose automatisch gelesen wird):

```env
PORT=3000
IMAP_USER=dein_email@example.com
IMAP_PASSWORD=dein_passwort
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_TLS=true
```

3. System starten:
```bash
docker compose up -d --build
```
Die SQLite-Datenbank wird automatisch im Verzeichnis `./data` (welches als lokales Volume gemountet wird) angelegt, um Persistenz zu garantieren.

## Proof of Concept / Tests

Das System beinhaltet ein Skript, um den Regex-Parser und die Datenbankanbindung (Prepared Statements) zu testen. Das Skript jagt einen Mock-String (z. B. `Einsatzauftrag: Brand B3 Dachstuhl, Feuerwehr Lengfeld, Laurentiusstraße, 97076 Würzburg`) durch den Parser und speichert das Ergebnis.

Starten des Tests (lokal):
```bash
npm install
node test-parser.js
```

## API Endpoints

- `GET /` - Basic Health Endpoint.
- `GET /alarms` - Gibt alle gespeicherten Alarme chronologisch absteigend zurück.
- `POST /alarms` - Erstellt manuell einen neuen Alarm. Erwartet JSON: `{"keyword":"...","location":"...","units":"...","raw_text":"..."}`
