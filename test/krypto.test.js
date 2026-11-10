'use strict';
// Tests für src/main/krypto.js (Spezifikation D-6, K-6). safeStorage ist eine Attrappe, „Local State“ ausgedacht.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const K = require('../src/main/krypto.js');

function tmpOrdner() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'noteline-krypto-'));
  test.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}
const SCHLUESSEL = 'RFBBUEkBAAAAdGVzdHNjaGx1ZXNzZWw=';
const localState = (ud, inhalt) => { fs.mkdirSync(ud, { recursive: true }); fs.writeFileSync(path.join(ud, 'Local State'), JSON.stringify(inhalt)); };
const lsSchluessel = (ud) => JSON.parse(fs.readFileSync(path.join(ud, 'Local State'), 'utf8')).os_crypt.encrypted_key;

test('D-6: createKrypto nur, wenn Windows verschlüsseln kann', () => {
  assert.equal(K.createKrypto(null), null);
  assert.equal(K.createKrypto({ isEncryptionAvailable: () => false }), null);
  const k = K.createKrypto({ isEncryptionAvailable: () => true, encryptString: (t) => Buffer.from([...t].reverse().join('')),
    decryptString: (b) => [...b.toString()].reverse().join('') });
  assert.equal(k.entschluesseln(k.verschluesseln('Hallo')), 'Hallo');
});

test('D-6: Schlüssel wird im Datenordner gesichert, aber nicht ungefragt überschrieben', () => {
  const basis = tmpOrdner(), ud = path.join(basis, 'userData'), daten = path.join(basis, 'Noteline');
  fs.mkdirSync(daten);
  assert.equal(K.schluesselSichern(ud, daten), false);                 // noch kein Local State
  localState(ud, { os_crypt: { encrypted_key: SCHLUESSEL }, anderes: 1 });
  assert.equal(K.schluesselSichern(ud, daten), true);
  assert.equal(fs.readFileSync(path.join(daten, K.SCHLUESSEL_DATEI), 'utf8'), SCHLUESSEL);
  assert.equal(K.schluesselSichern(ud, daten), false);                 // unverändert
  localState(ud, { os_crypt: { encrypted_key: 'QU5ERVJFUg==' } });
  assert.equal(K.schluesselSichern(ud, daten), false);                 // anderer Schlüssel: alte Sicherung bleibt
  assert.equal(K.schluesselSichern(ud, daten, { ueberschreiben: true }), true);
});

test('D-6: fehlender Schlüssel wird vor dem Start wiederhergestellt', () => {
  const basis = tmpOrdner(), ud = path.join(basis, 'userData'), daten = path.join(basis, 'Noteline');
  fs.mkdirSync(daten);
  assert.equal(K.schluesselWiederherstellen(ud, daten), 'keine-sicherung');
  fs.writeFileSync(path.join(daten, K.SCHLUESSEL_DATEI), SCHLUESSEL + '\n');
  assert.equal(K.schluesselWiederherstellen(ud, daten), 'wiederhergestellt');   // AppData-Ordner fehlte ganz
  assert.equal(lsSchluessel(ud), SCHLUESSEL);
  assert.equal(K.schluesselWiederherstellen(ud, daten), 'vorhanden');
  localState(ud, { browser: { x: 1 } });                                         // Local State ohne Schlüssel
  assert.equal(K.schluesselWiederherstellen(ud, daten), 'wiederhergestellt');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ud, 'Local State'), 'utf8')), { browser: { x: 1 }, os_crypt: { encrypted_key: SCHLUESSEL } });
  fs.writeFileSync(path.join(daten, K.SCHLUESSEL_DATEI), 'kein base64 <script>');
  fs.rmSync(ud, { recursive: true });
  assert.equal(K.schluesselWiederherstellen(ud, daten), 'keine-sicherung');
});
