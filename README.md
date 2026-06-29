# Alarm System

Ein leichtgewichtiges Alarmierungs-System basierend auf Node.js, Express und SQLite.

## Architektur & Features
- **Backend:** Node.js (v20) mit Express.js
- **Datenbank:** SQLite (`better-sqlite3`) zwingend im WAL-Modus (`PRAGMA journal_mode = WAL;`) konfiguriert, um parallele Lese- und Schreibzugriffe ohne Locks zu ermöglichen.
- **Echtzeit-Updates:** Server-Sent Events (SSE) übertragen neue Alarme sofort an verbundene Web-Clients.
- **Authentifizierung:** JWT-basierte Authentifizierung mit rudimentärem Login.
- **Ingest:** Ein integrierter IMAP-Listener (via `imap-simple`), um Alarm-E-Mails auszulesen und in der Datenbank abzulegen.
- **Containerisierung:** Bereitgestellt als Docker-Container (`node:20-alpine`), der aus Sicherheitsgründen als non-root (`USER node`) ausgeführt wird.
- **Verzögerte / Geplante Alarme:** Alarme können beim manuellen Dispatch im Admin-Interface um x Minuten verzögert werden, bevor sie auf dem Monitor erscheinen.
- **Crew-Vehicle Zuweisungen:** Crew-Mitglieder können im Admin-Interface festen Fahrzeugen zugewiesen werden; der Monitor zeigt die aktuelle Besatzung pro Fahrzeug.
- **Einsatzmonitor:** Kartenansicht (Leaflet/OpenStreetMap), Live-Wetterdaten (Open-Meteo), Einsatz-Timer und eine Liste der letzten Einsätze.

## Installation & Start

### Mit Docker (Empfohlen)
Die Anwendung bringt ein vollständiges `docker-compose.yml` mit. Die SQLite-Datenbank wird in einem lokalen Volume (`./data`) persistiert.

1. Repository klonen.
2. Umgebungsvariablen für IMAP in einer `.env` Datei oder in der `docker-compose.yml` konfigurieren (optional, falls E-Mail-Ingest benötigt wird).
3. Container starten:
   ```bash
   docker-compose up -d --build
   ```
4. Die Applikation ist unter `http://localhost:3000` erreichbar.

### Lokale Entwicklung
1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. Anwendung starten:
   ```bash
   node server.js
   ```

## Nächste Schritte
- **Standortbasierte Zuweisung:** Crew-Vehicle-Zuweisungen automatisch anhand des Alarm-Standorts vorschlagen, statt sie ausschließlich manuell im Admin-Interface zu pflegen.
