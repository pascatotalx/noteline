'use strict';
// Tests für src/main/storage.js (Spezifikation D-1 bis D-4). Läuft in temporären Ordnern.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStorage, lokalesDatum, BACKUP_TAGE } = require('../src/main/storage.js');

function tmpOrdner() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'noteline-test-'));
  test.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}
const gueltig = (n = 0) => JSON.stringify({ version: 2, notizen: Array.from({ length: n }, (_, i) => ({ id: 'n' + i })), wissen: [] });

test('D-1: neuer Ordner → Status „neu“', () => {
  const s = createStorage({ ordner: path.join(tmpOrdner(), 'Noteline') });
  assert.equal(s.load().status, 'neu');
  assert.ok(fs.existsSync(s.pfade.backupOrdner));
});

test('D-1: speichern und wieder laden', () => {
  const ordner = tmpOrdner();
  const s = createStorage({ ordner });
  s.save(gueltig(2));
  const r = createStorage({ ordner }).load();
  assert.equal(r.status, 'ok');
  assert.equal(r.daten.notizen.length, 2);
  assert.ok(!fs.existsSync(s.pfade.datenDatei + '.tmp'));
});

test('D-1: Migration aus dem Prototyp-Ordner, Original bleibt', () => {
  const basis = tmpOrdner();
  const alt = path.join(basis, 'Hotline-Notizen');
  fs.mkdirSync(alt);
  fs.writeFileSync(path.join(alt, 'daten.json'), gueltig(3));
  const r = createStorage({ ordner: path.join(basis, 'Noteline'), altOrdner: alt }).load();
  assert.equal(r.status, 'ok');
  assert.equal(r.migriert, true);
  assert.equal(r.daten.notizen.length, 3);
  assert.ok(fs.existsSync(path.join(alt, 'daten.json')));
});

test('D-1: keine Migration, wenn schon Daten da sind', () => {
  const basis = tmpOrdner();
  const alt = path.join(basis, 'alt'); fs.mkdirSync(alt);
  fs.writeFileSync(path.join(alt, 'daten.json'), gueltig(5));
  const s = createStorage({ ordner: path.join(basis, 'neu'), altOrdner: alt });
  s.save(gueltig(1));
  assert.equal(s.load().daten.notizen.length, 1);
});

test('D-3: defekte Datei → Schutzmodus, Kopie, kein Speichern', () => {
  const ordner = tmpOrdner();
  fs.writeFileSync(path.join(ordner, 'daten.json'), '{ kaputt');
  const s = createStorage({ ordner });
  const r = s.load();
  assert.equal(r.status, 'defekt');
  assert.ok(fs.existsSync(r.kopie));
  assert.equal(s.gesperrt, true);
  assert.throws(() => s.save(gueltig(0)), /Schutzmodus/);
  assert.equal(fs.readFileSync(path.join(ordner, 'daten.json'), 'utf8'), '{ kaputt');
});

test('D-3: gültiges JSON im falschen Format → Schutzmodus', () => {
  const ordner = tmpOrdner();
  fs.writeFileSync(path.join(ordner, 'daten.json'), '{"hallo": 1}');
  assert.equal(createStorage({ ordner }).load().status, 'defekt');
});

test('D-3: ungültiges JSON wird nie geschrieben', () => {
  const s = createStorage({ ordner: tmpOrdner() });
  assert.throws(() => s.save('{ nein'));
  assert.equal(fs.existsSync(s.pfade.datenDatei), false);
});

test('D-2: tägliches Backup, auch über Mitternacht, mit lokalem Datum', () => {
  let jetzt = new Date(2026, 10, 6, 23, 59);
  const s = createStorage({ ordner: tmpOrdner(), jetzt: () => jetzt });
  s.save(gueltig(1));              // noch keine Datei vorher → kein Backup
  s.save(gueltig(2));              // Backup vom 06.11. mit Stand 1
  jetzt = new Date(2026, 10, 7, 0, 30);
  s.save(gueltig(3));              // Backup vom 07.11. mit Stand 2
  const dateien = fs.readdirSync(s.pfade.backupOrdner).sort();
  assert.deepEqual(dateien, ['daten-2026-11-06.json', 'daten-2026-11-07.json']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(s.pfade.backupOrdner, 'daten-2026-11-07.json'))).notizen.length, 2);
});

test(`D-2: höchstens ${BACKUP_TAGE} Backups`, () => {
  const s = createStorage({ ordner: tmpOrdner() });
  for (let i = 1; i <= 35; i++) fs.writeFileSync(path.join(s.pfade.backupOrdner, `daten-2026-01-${String(i).padStart(2, '0')}.json`), '{}');
  fs.writeFileSync(path.join(s.pfade.backupOrdner, 'eigene-notiz.txt'), 'bleibt');
  s.save(gueltig(0));
  s.save(gueltig(0));
  const backups = fs.readdirSync(s.pfade.backupOrdner).filter(f => f.startsWith('daten-'));
  assert.equal(backups.length, BACKUP_TAGE);
  assert.ok(!backups.includes('daten-2026-01-01.json'));
  assert.ok(fs.existsSync(path.join(s.pfade.backupOrdner, 'eigene-notiz.txt')));
});

test('D-1: Einstellungen werden zusammengeführt', () => {
  const s = createStorage({ ordner: tmpOrdner() });
  s.speichereEinstellungen({ immerVorne: true });
  s.speichereEinstellungen({ theme: 'hell' });
  assert.deepEqual(s.ladeEinstellungen(), { immerVorne: true, theme: 'hell' });
  assert.ok(fs.existsSync(s.pfade.einstellungenDatei));
});

test('D-1: fenster.json aus Version 1.0 wird übernommen und danach entfernt', () => {
  const ordner = tmpOrdner();
  fs.writeFileSync(path.join(ordner, 'fenster.json'), JSON.stringify({ immerVorne: true, bounds: { x: 1, y: 2, width: 3, height: 4 } }));
  const s = createStorage({ ordner });
  assert.equal(s.ladeEinstellungen().immerVorne, true);
  s.speichereEinstellungen({ theme: 'dunkel' });
  assert.deepEqual(s.ladeEinstellungen(), { immerVorne: true, bounds: { x: 1, y: 2, width: 3, height: 4 }, theme: 'dunkel' });
  assert.equal(fs.existsSync(path.join(ordner, 'fenster.json')), false);
});

test('lokalesDatum nutzt die lokale Zeitzone', () => {
  assert.equal(lokalesDatum(new Date(2026, 0, 2, 0, 15)), '2026-01-02');
});

// ---------- D-6: Verschlüsselung (Attrappe statt Windows-DPAPI) ----------
const { KOPF } = require('../src/main/storage.js');
const xor = (buf) => Buffer.from(buf.map(b => b ^ 0x5a));
function attrappe({ falscherSchluessel = false } = {}) {
  return {
    verschluesseln: (text) => xor(Buffer.from('ok:' + text, 'utf8')),
    entschluesseln: (buf) => {
      const t = xor(buf).toString('utf8');
      if (falscherSchluessel || !t.startsWith('ok:')) throw new Error('falscher Schlüssel');
      return t.slice(3);
    },
  };
}
const notiz = (kunde) => JSON.stringify({ version: 2, notizen: [{ id: 'n1', kunde, tvPw: 'geheim123' }], wissen: [] });
const nurVerschluesselt = (datei, ...woerter) => {
  const roh = fs.readFileSync(datei);
  assert.ok(roh.subarray(0, KOPF.length).equals(KOPF), `${path.basename(datei)} beginnt mit der Kennung`);
  for (const w of woerter) assert.ok(!roh.toString('latin1').includes(w), `${path.basename(datei)} enthält „${w}“ nicht im Klartext`);
};

test('D-6: Daten, Einstellungen und Backups liegen verschlüsselt', () => {
  let jetzt = new Date(2026, 10, 9, 12, 0);
  const ordner = tmpOrdner();
  const s = createStorage({ ordner, krypto: attrappe(), jetzt: () => jetzt });
  assert.equal(s.verschluesselt, true);
  s.save(notiz('Praxis Sonnenschein'));
  jetzt = new Date(2026, 10, 10, 12, 0);
  s.save(notiz('Praxis Sonnenschein am Park'));
  s.speichereEinstellungen({ ticketLink: 'https://tickets.example.org/{ticket}' });
  assert.deepEqual(fs.readdirSync(ordner).sort(), ['Backups', 'daten.enc', 'einstellungen.enc', 'pruefung.enc']);
  nurVerschluesselt(path.join(ordner, 'pruefung.enc'));
  nurVerschluesselt(path.join(ordner, 'daten.enc'), 'Sonnenschein', 'geheim123');
  nurVerschluesselt(path.join(ordner, 'einstellungen.enc'), 'tickets.example.org');
  nurVerschluesselt(path.join(ordner, 'Backups', 'daten-2026-11-10.enc'), 'Sonnenschein');
  const r = createStorage({ ordner, krypto: attrappe() }).load();
  assert.equal(r.status, 'ok');
  assert.equal(r.daten.notizen[0].kunde, 'Praxis Sonnenschein am Park');
  assert.equal(createStorage({ ordner, krypto: attrappe() }).ladeEinstellungen().ticketLink, 'https://tickets.example.org/{ticket}');
});

test('D-6: vorhandene Klartext-Dateien werden umgestellt und danach gelöscht', () => {
  const ordner = tmpOrdner();
  fs.mkdirSync(path.join(ordner, 'Backups'));
  fs.writeFileSync(path.join(ordner, 'daten.json'), notiz('Praxis Sonnenschein'));
  fs.writeFileSync(path.join(ordner, 'einstellungen.json'), JSON.stringify({ theme: 'hell' }));
  fs.writeFileSync(path.join(ordner, 'fenster.json'), JSON.stringify({ immerVorne: true }));
  fs.writeFileSync(path.join(ordner, 'Backups', 'daten-2026-11-01.json'), notiz('Praxis Alt'));
  fs.writeFileSync(path.join(ordner, 'daten-defekt-2026-11-02_10-00-00.json'), '{ kaputt Sonnenschein');
  const s = createStorage({ ordner, krypto: attrappe() });
  const r = s.load();
  assert.equal(r.status, 'ok');
  assert.equal(r.daten.notizen[0].kunde, 'Praxis Sonnenschein');
  assert.equal(s.ladeEinstellungen().theme, 'hell');
  const alle = [...fs.readdirSync(ordner), ...fs.readdirSync(path.join(ordner, 'Backups'))];
  assert.deepEqual(alle.filter(f => f.endsWith('.json')), [], 'keine Klartext-Datei mehr');
  nurVerschluesselt(path.join(ordner, 'daten.enc'), 'Sonnenschein');
  nurVerschluesselt(path.join(ordner, 'Backups', 'daten-2026-11-01.enc'), 'Praxis Alt');
  nurVerschluesselt(path.join(ordner, 'daten-defekt-2026-11-02_10-00-00.enc'), 'Sonnenschein');
});

test('D-6: defekte Klartext-Datei wird nicht umgestellt, Schutzmodus greift', () => {
  const ordner = tmpOrdner();
  fs.writeFileSync(path.join(ordner, 'daten.json'), '{ kaputt Sonnenschein');
  const s = createStorage({ ordner, krypto: attrappe() });
  const r = s.load();
  assert.equal(r.status, 'defekt');
  assert.equal(fs.readFileSync(path.join(ordner, 'daten.json'), 'utf8'), '{ kaputt Sonnenschein'); // Original unangetastet
  assert.ok(r.kopie.endsWith('.enc'));
  nurVerschluesselt(r.kopie, 'Sonnenschein');
  assert.throws(() => s.save(notiz('X')), /Schutzmodus/);
});

test('D-6: nicht zu entschlüsseln → Schutzmodus mit Ursache, nichts wird überschrieben', () => {
  const ordner = tmpOrdner();
  createStorage({ ordner, krypto: attrappe() }).save(notiz('Praxis Sonnenschein'));
  const vorher = fs.readFileSync(path.join(ordner, 'daten.enc'));
  const s = createStorage({ ordner, krypto: attrappe({ falscherSchluessel: true }) });
  const r = s.load();
  assert.equal(r.status, 'defekt');
  assert.match(r.fehler, /neu starten.*anderen Windows-Konto/);
  assert.throws(() => s.save(notiz('X')), /Schutzmodus/);
  assert.ok(fs.readFileSync(path.join(ordner, 'daten.enc')).equals(vorher));
  assert.equal(r.kopie, undefined); // bei falschem Schlüssel entsteht keine weitere Datei (1.5.2)
});

test('D-6: verschlüsselte Daten ohne verfügbare Verschlüsselung → Schutzmodus statt leerem Neustart', () => {
  const ordner = tmpOrdner();
  createStorage({ ordner, krypto: attrappe() }).save(notiz('Praxis Sonnenschein'));
  const s = createStorage({ ordner });
  const r = s.load();
  assert.equal(r.status, 'defekt');
  assert.match(r.fehler, /nicht verfügbar/);
  assert.equal(s.verschluesselt, false);
});

test('D-6 (1.5.2): Prüfwert erkennt einen falsch geladenen Schlüssel, dann wird nichts geschrieben', () => {
  const ordner = tmpOrdner();
  const s1 = createStorage({ ordner, krypto: attrappe() });
  assert.equal(s1.schluessel, 'neu');
  s1.save(notiz('Praxis Sonnenschein'));
  s1.speichereEinstellungen({ ticketLink: 'https://tickets.example.org/{ticket}' });
  assert.ok(fs.existsSync(path.join(ordner, 'pruefung.enc')));
  assert.equal(createStorage({ ordner, krypto: attrappe() }).schluessel, 'ok');
  const vorher = Object.fromEntries(fs.readdirSync(ordner).filter(f => f.endsWith('.enc')).map(f => [f, fs.readFileSync(path.join(ordner, f))]));
  const s2 = createStorage({ ordner, krypto: attrappe({ falscherSchluessel: true }) });
  assert.equal(s2.schluessel, 'falsch');
  const r = s2.load();
  assert.equal(r.status, 'defekt');
  assert.equal(r.schluesselFalsch, true);
  assert.throws(() => s2.save(notiz('X')), /Schutzmodus/);
  s2.speichereEinstellungen({ theme: 'hell' });                       // bleibt nur im Speicher
  assert.equal(s2.ladeEinstellungen().theme, 'hell');
  for (const [f, inhalt] of Object.entries(vorher)) assert.ok(fs.readFileSync(path.join(ordner, f)).equals(inhalt), f + ' unverändert');
  assert.deepEqual(fs.readdirSync(ordner).filter(f => f.endsWith('.enc')).sort(), Object.keys(vorher).sort(), 'keine neuen Dateien');
  // Mit dem richtigen Schlüssel ist alles wieder da
  const s3 = createStorage({ ordner, krypto: attrappe() });
  assert.equal(s3.load().daten.notizen[0].kunde, 'Praxis Sonnenschein');
  assert.equal(s3.ladeEinstellungen().ticketLink, 'https://tickets.example.org/{ticket}');
});

test('D-6 (1.5.2): ohne Prüfwert entscheidet die Datendatei; unlesbare Einstellungen werden vor dem Ersetzen aufgehoben', () => {
  const ordner = tmpOrdner();
  createStorage({ ordner, krypto: attrappe() }).save(notiz('Praxis Sonnenschein'));
  fs.unlinkSync(path.join(ordner, 'pruefung.enc'));                    // Stand aus 1.5.0/1.5.1
  fs.writeFileSync(path.join(ordner, 'einstellungen.enc'), Buffer.concat([KOPF, Buffer.from('mit anderem Schlüssel')]));
  const s = createStorage({ ordner, krypto: attrappe() });
  assert.equal(s.schluessel, 'ok');
  assert.ok(fs.existsSync(path.join(ordner, 'pruefung.enc')), 'Prüfwert wird nachgetragen');
  assert.deepEqual(s.ladeEinstellungen(), {});
  s.speichereEinstellungen({ theme: 'hell' });
  assert.equal(fs.readdirSync(ordner).filter(f => f.startsWith('einstellungen-defekt-')).length, 1);
  assert.equal(createStorage({ ordner, krypto: attrappe() }).ladeEinstellungen().theme, 'hell');
  // Nur unlesbare verschlüsselte Dateien, kein Prüfwert → falsch
  const o2 = tmpOrdner();
  createStorage({ ordner: o2, krypto: attrappe() }).save(notiz('Praxis Sonnenschein'));
  fs.unlinkSync(path.join(o2, 'pruefung.enc'));
  assert.equal(createStorage({ ordner: o2, krypto: attrappe({ falscherSchluessel: true }) }).schluessel, 'falsch');
});
