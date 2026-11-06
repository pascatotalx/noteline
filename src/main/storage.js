// Noteline – lokaler Speicher (Spezifikation D-1 bis D-4).
// Reines Node-Modul ohne Electron, damit es in Tests direkt läuft.
'use strict';
const fs = require('fs');
const path = require('path');

const BACKUP_TAGE = 30;
const BACKUP_MUSTER = /^daten-\d{4}-\d{2}-\d{2}\.json$/;

/** Lokales Datum als JJJJ-MM-TT (nicht UTC – sonst springt das Backup-Datum vor 1 Uhr nachts). */
function lokalesDatum(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function zeitstempel(d = new Date()) {
  return lokalesDatum(d) + '_' + [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join('-');
}

const warte = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Atomar schreiben: erst .tmp, dann umbenennen. Wiederholt bei kurz gesperrten Dateien (Virenscanner, OneDrive). */
function schreibeAtomar(datei, inhalt) {
  const tmp = datei + '.tmp';
  fs.writeFileSync(tmp, inhalt, 'utf8');
  for (let versuch = 1; ; versuch++) {
    try { fs.renameSync(tmp, datei); return; } catch (e) {
      if (versuch >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) {
        try { fs.unlinkSync(tmp); } catch {}
        throw e;
      }
      warte(50);
    }
  }
}

function leseJson(datei) {
  return JSON.parse(fs.readFileSync(datei, 'utf8').replace(/^﻿/, ''));
}

/**
 * @param {object} opt
 * @param {string} opt.ordner        Datenordner, z. B. Dokumente\Noteline
 * @param {string} [opt.altOrdner]   Ordner des Prototyps (Migration, D-1)
 * @param {() => Date} [opt.jetzt]   Uhr (für Tests)
 */
function createStorage({ ordner, altOrdner, jetzt = () => new Date() }) {
  const datenDatei = path.join(ordner, 'daten.json');
  const backupOrdner = path.join(ordner, 'Backups');
  const fensterDatei = path.join(ordner, 'fenster.json');
  let gesperrt = false;

  fs.mkdirSync(backupOrdner, { recursive: true });

  function dailyBackup() {
    if (!fs.existsSync(datenDatei)) return null;
    const ziel = path.join(backupOrdner, `daten-${lokalesDatum(jetzt())}.json`);
    if (!fs.existsSync(ziel)) fs.copyFileSync(datenDatei, ziel);
    const alle = fs.readdirSync(backupOrdner).filter(f => BACKUP_MUSTER.test(f)).sort();
    while (alle.length > BACKUP_TAGE) fs.unlinkSync(path.join(backupOrdner, alle.shift()));
    return ziel;
  }

  function migrieren() {
    if (!altOrdner || fs.existsSync(datenDatei)) return false;
    const alt = path.join(altOrdner, 'daten.json');
    if (!fs.existsSync(alt)) return false;
    fs.copyFileSync(alt, datenDatei);
    return true;
  }

  /** @returns {{status: 'neu'|'ok'|'defekt', daten: object|null, fehler?: string, migriert?: boolean}} */
  function load() {
    const migriert = migrieren();
    if (!fs.existsSync(datenDatei)) return { status: 'neu', daten: null };
    let daten;
    try {
      daten = leseJson(datenDatei);
      if (!daten || typeof daten !== 'object' || !Array.isArray(daten.notizen)) throw new Error('Kein gültiges Noteline-Format (Liste „notizen" fehlt).');
    } catch (e) {
      gesperrt = true;
      const kopie = path.join(ordner, `daten-defekt-${zeitstempel(jetzt())}.json`);
      try { fs.copyFileSync(datenDatei, kopie); } catch {}
      return { status: 'defekt', daten: null, fehler: e.message, kopie };
    }
    try { dailyBackup(); } catch {}
    return { status: 'ok', daten, migriert };
  }

  function save(json) {
    if (gesperrt) throw new Error('Schutzmodus: daten.json ist defekt, es wird nicht gespeichert.');
    if (typeof json !== 'string') throw new TypeError('json muss ein String sein');
    JSON.parse(json); // nie ungültiges JSON schreiben
    try { dailyBackup(); } catch {}
    schreibeAtomar(datenDatei, json);
  }

  function ladeFenster() { try { return leseJson(fensterDatei); } catch { return {}; } }
  function speichereFenster(patch) {
    const neu = { ...ladeFenster(), ...patch };
    try { schreibeAtomar(fensterDatei, JSON.stringify(neu)); } catch {}
    return neu;
  }

  return {
    load, save, dailyBackup, ladeFenster, speichereFenster,
    get gesperrt() { return gesperrt; },
    pfade: { ordner, datenDatei, backupOrdner, fensterDatei },
  };
}

module.exports = { createStorage, lokalesDatum, schreibeAtomar, BACKUP_TAGE };
