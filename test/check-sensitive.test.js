'use strict';
// Tests für scripts/check-sensitive.js (Spezifikation R-1).
// Die Beispiel-Token werden zusammengesetzt, damit diese Datei selbst die Prüfung besteht.
const test = require('node:test');
const assert = require('node:assert/strict');
const { pruefe, pruefePfad, pruefeInhalt } = require('../scripts/check-sensitive.js');

const fake = (prefix, n) => prefix + 'A1b2C3d4E5'.repeat(Math.ceil(n / 10)).slice(0, n);

test('blockiert Datendateien von Noteline', () => {
  for (const p of ['daten.json', 'x/daten.json', 'daten-defekt-2026.json', 'Backups/daten-2026-11-06.json', 'fenster.json', 'einstellungen.json', 'demo-data/a.txt', 'daten.enc', 'Backups/daten-2026-11-10.enc', 'daten-defekt-2026.enc', 'einstellungen.enc', 'schluessel.dpapi', 'pruefung.enc', 'einstellungen-defekt-2026.enc']) {
    assert.ok(pruefePfad(p).length, p);
  }
});

test('blockiert Schlüssel- und Umgebungsdateien', () => {
  for (const p of ['.env', '.env.local', 'cert.pfx', 'id.pem', 'build\\sign.p12']) assert.ok(pruefePfad(p).length, p);
});

test('lässt normale Projektdateien durch', () => {
  for (const p of ['package.json', 'src/main/storage.js', 'specs/plan.md', 'test/daten-format.md', '.gitignore']) {
    assert.equal(pruefePfad(p).length, 0, p);
  }
});

test('erkennt Token im Inhalt mit Zeilennummer', () => {
  const inhalt = ['ok', 'token = "' + fake('gh' + 'p_', 36) + '"', 'ok'].join('\n');
  const f = pruefeInhalt('src/x.js', inhalt);
  assert.equal(f.length, 1);
  assert.equal(f[0].zeile, 2);
  assert.match(f[0].grund, /GitHub/);
});

test('erkennt weitere Zugangsdaten', () => {
  const faelle = [
    fake('github' + '_pat_', 50),
    'AK' + 'IA' + 'ABCDEFGHIJKLMNOP',
    'xo' + 'xb-1234567890-abcdef',
    fake('sk-' + 'ant-', 30),
    '-----BEGIN ' + 'PRIVATE KEY-----',
  ];
  for (const z of faelle) assert.equal(pruefeInhalt('a.txt', z).length, 1, z);
});

test('Binärdateien und package-lock werden nur über den Pfad geprüft', () => {
  const lesen = () => fake('gh' + 'p_', 36);
  assert.equal(pruefe(['build/icon.png', 'package-lock.json'], lesen).length, 0);
  assert.equal(pruefe(['src/a.js'], lesen).length, 1);
});
