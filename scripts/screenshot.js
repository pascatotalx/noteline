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
  id, kunde, ticket, telefon: '', text, status: 'offen', prio: 'normal', rueckruf: null, erinnertFuer: null,
  erstellt: extra.erstellt || h(9), geaendert: extra.geaendert || extra.erstellt || h(9), ...extra,
});

const demo = {
  version: 2,
  notizen: [
    n('d1', 'Praxis Sonnenschein', '#10234', 'Kartenterminal meldet Verbindungsfehler\nNeustart Konnektor besprochen', { prio: 'hoch', erstellt: h(8, 40), rueckruf: h(23, 0), erinnertFuer: h(23, 0) }),
    n('d2', 'Muster Logistik GmbH', '#10251', 'Drucker im Lager druckt leere Seiten', { erstellt: h(9, 15) }),
    n('d3', 'Beispiel & Söhne', '', 'Fragt nach Zugang für neue Mitarbeiterin', { erstellt: tag(-1, 14) }),
    n('d4', 'Café Morgenrot', '#10198', 'Wartet auf Rückmeldung vom Hersteller', { status: 'wartet', erstellt: tag(-2, 11) }),
    n('d5', 'Stadtbibliothek Nord', '#10177', 'Passwort zurückgesetzt, Anmeldung klappt', { status: 'erledigt', erstellt: tag(-1, 10) }),
  ],
  wissen: [
    { id: 'w1', gruppe: 'Befehle', titel: 'Erreichbarkeit prüfen', wert: 'ping <IP> -n 4' },
    { id: 'w2', gruppe: 'Ports', titel: 'Fernwartung', wert: '5938' },
    { id: 'w3', gruppe: 'Ports', titel: 'Webserver intern', wert: '8443' },
    { id: 'w4', gruppe: 'Netz', titel: 'Testserver', wert: '192.0.2.10' },
    { id: 'w5', gruppe: 'Netz', titel: 'DNS', wert: '198.51.100.53' },
    { id: 'w6', gruppe: 'Links', titel: 'Herstellerportal', wert: 'https://example.org/support' },
  ],
  ui: { closed: { erledigt: false }, platzhalter: { w1: { IP: '192.0.2.10' } } },
};

const ziel = path.join(__dirname, '..', 'docs');
fs.mkdirSync(ziel, { recursive: true });

for (const tab of ['hotline', 'wissen', 'einstellungen']) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'noteline-demo-'));
  try {
    fs.writeFileSync(path.join(ordner, 'daten.json'), JSON.stringify(demo));
    const datei = path.join(ziel, `screenshot-${tab}.png`);
    const r = spawnSync(electron, ['.'], {
      cwd: path.join(__dirname, '..'), stdio: 'inherit', timeout: 60000,
      env: { ...process.env, NOTELINE_DATA_DIR: ordner, NOTELINE_SCREENSHOT: datei, NOTELINE_SCREENSHOT_TAB: tab },
    });
    if (r.status !== 0 || !fs.existsSync(datei)) throw new Error(`Screenshot ${tab} fehlgeschlagen (Code ${r.status})`);
    console.log('✓', path.relative(process.cwd(), datei));
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}
