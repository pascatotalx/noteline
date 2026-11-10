// Noteline – Verschlüsselung der Daten auf der Festplatte (Spezifikation D-6, K-6, plan.md §15).
// Nutzt Electron `safeStorage`: AES-GCM mit einem Schlüssel, den Windows per DPAPI an das Benutzerkonto bindet.
// Ohne Electron testbar: `safeStorage` wird hineingereicht.
'use strict';
const fs = require('fs');
const path = require('path');
const { schreibeAtomar } = require('./storage');

const SCHLUESSEL_DATEI = 'schluessel.dpapi';
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Verschlüsselung für `createStorage` oder `null`, wenn Windows sie nicht anbietet. */
function createKrypto(safeStorage) {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) return null;
  return {
    verschluesseln: (text) => safeStorage.encryptString(String(text)),
    entschluesseln: (buf) => safeStorage.decryptString(buf),
  };
}

const localStateDatei = (userData) => path.join(userData, 'Local State');

function localStateLesen(userData) {
  try { return JSON.parse(fs.readFileSync(localStateDatei(userData), 'utf8')); } catch { return null; }
}

/** Der von DPAPI geschützte Schlüssel aus Electrons „Local State“, sonst null. */
function schluesselAusLocalState(userData) {
  const ls = localStateLesen(userData);
  const k = ls && ls.os_crypt && ls.os_crypt.encrypted_key;
  return typeof k === 'string' && BASE64.test(k) ? k : null;
}

/**
 * Vor `app.whenReady()` aufrufen: Fehlt der Schlüssel in „Local State“ (z. B. weil AppData\Roaming\Noteline gelöscht wurde),
 * wird er aus der Sicherung im Datenordner zurückgeschrieben. Liefert 'vorhanden', 'wiederhergestellt' oder 'keine-sicherung'.
 */
function schluesselWiederherstellen(userData, datenOrdner) {
  if (schluesselAusLocalState(userData)) return 'vorhanden';
  let sicherung;
  try { sicherung = fs.readFileSync(path.join(datenOrdner, SCHLUESSEL_DATEI), 'utf8').trim(); } catch { return 'keine-sicherung'; }
  if (!BASE64.test(sicherung)) return 'keine-sicherung';
  const ls = localStateLesen(userData) || {};
  const neu = { ...ls, os_crypt: { ...(ls.os_crypt || {}), encrypted_key: sicherung } };
  fs.mkdirSync(userData, { recursive: true });
  schreibeAtomar(localStateDatei(userData), JSON.stringify(neu));
  return 'wiederhergestellt';
}

/**
 * Sichert den Schlüssel im Datenordner. Er bleibt dort per DPAPI geschützt, nur dasselbe Windows-Konto kann ihn nutzen.
 * `ueberschreiben` nur, wenn die Daten mit dem aktuellen Schlüssel gelesen wurden. Liefert true, wenn geschrieben wurde.
 */
function schluesselSichern(userData, datenOrdner, { ueberschreiben = false } = {}) {
  const schluessel = schluesselAusLocalState(userData);
  if (!schluessel) return false;
  const ziel = path.join(datenOrdner, SCHLUESSEL_DATEI);
  let bisher = null;
  try { bisher = fs.readFileSync(ziel, 'utf8').trim(); } catch { /* noch keine Sicherung */ }
  if (bisher === schluessel || (bisher && !ueberschreiben)) return false;
  schreibeAtomar(ziel, schluessel);
  return true;
}

module.exports = { createKrypto, schluesselWiederherstellen, schluesselSichern, SCHLUESSEL_DATEI };
