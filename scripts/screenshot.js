#!/usr/bin/env node
// Erzeugt die README-Screenshots mit ausgedachten Demodaten (Spezifikation R-1: keine echten Daten).
// Die Demodaten liegen nur in einem temporären Ordner und werden danach gelöscht.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const electron = require('electron');

const h = (stunden, minuten = 0) => { const d = new Date(); d.setHours(stunden, minuten, 0, 0); return d.toISOString(); };
const tag = (delta, stunden) => { const d = new Date(); d.setDate(d.getDate() + delta); d.setHours(stunden, 0, 0, 0); return d.toISOString(); };
const n = (id, kunde, ticket, text, extra = {}) => ({
  id, kunde, ansprechpartner: '', ticket, telefon: '', text, status: 'offen', prio: 'normal', rueckruf: null, erinnertFuer: null,
  erstellt: extra.erstellt || h(9), geaendert: extra.geaendert || extra.erstellt || h(9), ...extra,
});

const demo = {
  version: 2,
  notizen: [
    n('d1', 'Praxis Sonnenschein', '#10234', 'Kartenterminal meldet Verbindungsfehler\nNeustart Konnektor besprochen', { ansprechpartner: 'Frau Beispiel', prio: 'hoch', erstellt: h(8, 40), rueckruf: h(23, 0), erinnertFuer: h(23, 0) }),
    n('d2', 'Muster Logistik GmbH', '#10251', 'Drucker im Lager druckt leere Seiten\nTreiber neu installiert, Testseite ok\nKunde meldet sich, falls es wieder auftritt', { erstellt: h(9, 15), telefon: '+49 123 4567890', ansprechpartner: 'Herr Muster' }),
    n('d3', 'Beispiel & Söhne', '', 'Fragt nach Zugang für neue Mitarbeiterin', { erstellt: tag(-1, 14) }),
    n('d4', 'Café Morgenrot', '#10198', 'Wartet auf Rückmeldung vom Hersteller', { status: 'wartet', erstellt: tag(-2, 11) }),
    n('d5', 'Stadtbibliothek Nord', '#10177', 'Passwort zurückgesetzt, Anmeldung klappt', { status: 'erledigt', erstellt: tag(-1, 10) }),
  ],
  wissen: [
    { id: 'w1', titel: 'Support-Hotline', wert: '0800 1234567', favorit: true },
    { id: 'w2', titel: 'Support-E-Mail', wert: 'support@example.org', favorit: true },
    { id: 'w3', titel: 'Software-Download', wert: 'https://example.org/download' },
    { id: 'w4', titel: 'Firmware Kartenterminal', wert: 'https://example.org/firmware' },
    { id: 'w5', titel: 'Fachdienst A', wert: '192.0.2.10' },
    { id: 'w6', titel: 'Fachdienst B', wert: '198.51.100.20' },
    { id: 'w7', titel: 'Fernwartung', wert: '5938' },
    { id: 'w8', titel: 'Webserver intern', wert: '8443' },
    { id: 'w9', titel: 'Route Fachdienst', wert: 'route add <IP> mask 255.255.255.255 <GATEWAY>' },
  ],
  ui: { closed: { erledigt: false }, platzhalter: { w9: { IP: '192.0.2.10', GATEWAY: '192.0.2.1' } } },
};

const ziel = path.join(__dirname, '..', 'docs');
fs.mkdirSync(ziel, { recursive: true });

// Name → Ansicht, Fenstergröße, Erscheinungsbild
const AUFNAHMEN = [
  { name: 'hotline', tab: 'hotline', groesse: '460x900', theme: 'dunkel' },
  { name: 'wissen', tab: 'wissen', groesse: '460x900', theme: 'dunkel' },
  { name: 'einstellungen', tab: 'einstellungen', groesse: '460x900', theme: 'dunkel' },
  { name: 'breit', tab: 'notiz', groesse: '880x560', theme: 'dunkel' },
  { name: 'breit-hell', tab: 'hotline', groesse: '880x560', theme: 'hell' },
];
const nur = process.argv.slice(2);

for (const a of AUFNAHMEN.filter(x => !nur.length || nur.includes(x.name))) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'noteline-demo-'));
  try {
    fs.writeFileSync(path.join(ordner, 'daten.json'), JSON.stringify(demo));
    fs.writeFileSync(path.join(ordner, 'einstellungen.json'), JSON.stringify({ ticketLink: 'https://support.example.org/tickets?id=<TICKET>' }));
    const datei = path.join(ziel, `screenshot-${a.name}.png`);
    fs.rmSync(datei, { force: true }); // alte Aufnahme darf nicht als Erfolg zählen
    const r = spawnSync(electron, ['.'], {
      cwd: path.join(__dirname, '..'), stdio: 'inherit', timeout: 60000,
      env: { ...process.env, NOTELINE_DATA_DIR: ordner, NOTELINE_SCREENSHOT: datei, NOTELINE_SCREENSHOT_TAB: a.tab,
        NOTELINE_SCREENSHOT_SIZE: a.groesse, NOTELINE_SCREENSHOT_THEME: a.theme },
    });
    if (r.status !== 0 || !fs.existsSync(datei)) throw new Error(`Screenshot ${a.name} fehlgeschlagen (Code ${r.status})`);
    console.log('✓', path.relative(process.cwd(), datei));
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}
