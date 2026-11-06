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
