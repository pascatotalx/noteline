// Noteline – lokaler Speicher (Spezifikation D-1 bis D-6).
// Reines Node-Modul ohne Electron, damit es in Tests direkt läuft. Die Verschlüsselung wird als `krypto` hineingereicht.
'use strict';
const fs = require('fs');
const path = require('path');

const BACKUP_TAGE = 30;
const BACKUP_MUSTER = /^daten-\d{4}-\d{2}-\d{2}\.(?:json|enc)$/;
// Kennung am Anfang jeder verschlüsselten Datei (D-6)
const KOPF = Buffer.from('NOTELINE-ENC1\n', 'latin1');

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
  fs.writeFileSync(tmp, inhalt, typeof inhalt === 'string' ? 'utf8' : undefined);
  for (let versuch = 1; ; versuch++) {
    try { fs.renameSync(tmp, datei); return; } catch (e) {
      if (versuch >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) {
        try { fs.unlinkSync(tmp); } catch { /* nichts mehr aufzuräumen */ }
        throw e;
      }
      warte(50);
    }
  }
}

const istVerschluesselt = (buf) => buf.length >= KOPF.length && buf.subarray(0, KOPF.length).equals(KOPF);

/**
 * @param {object} opt
 * @param {string} opt.ordner        Datenordner, z. B. Dokumente\Noteline
 * @param {string} [opt.altOrdner]   Ordner des Prototyps (Migration, D-1)
 * @param {() => Date} [opt.jetzt]   Uhr (für Tests)
 * @param {{verschluesseln: (t: string) => Buffer, entschluesseln: (b: Buffer) => string} | null} [opt.krypto]
 *        Verschlüsselung (D-6). Ohne sie wird wie bis Version 1.4 als JSON gespeichert.
 */
function createStorage({ ordner, altOrdner, jetzt = () => new Date(), krypto = null }) {
  const endung = krypto ? '.enc' : '.json';
  const datenDatei = path.join(ordner, 'daten' + endung);
  const einstellungenDatei = path.join(ordner, 'einstellungen' + endung);
  const backupOrdner = path.join(ordner, 'Backups');
  const klar = { daten: path.join(ordner, 'daten.json'), einstellungen: path.join(ordner, 'einstellungen.json') };
  const verschluesselt = { daten: path.join(ordner, 'daten.enc') };
  const altFensterDatei = path.join(ordner, 'fenster.json'); // Version 1.0
  // Prüfwert: zeigt beim Start, ob der geladene Schlüssel zu den vorhandenen Dateien passt (D-6, 1.5.2)
  const pruefDatei = path.join(ordner, 'pruefung.enc');
  const PRUEFTEXT = 'NOTELINE-SCHLUESSEL-OK';
  let gesperrt = false;
  let einstellungenSitzung = null; // bei falschem Schlüssel: Einstellungen nur im Speicher, nie auf die Platte

  fs.mkdirSync(backupOrdner, { recursive: true });

  /** Datei als Text lesen, verschlüsselte Dateien entschlüsseln (D-6). */
  function lesen(datei) {
    const buf = fs.readFileSync(datei);
    if (!istVerschluesselt(buf)) return buf.toString('utf8').replace(/^\uFEFF/, '');
    if (!krypto) throw new Error('Die Datei ist verschlüsselt, die Verschlüsselung von Windows ist aber nicht verfügbar.');
    try {
      return krypto.entschluesseln(buf.subarray(KOPF.length));
    } catch {
      throw new Error('Die Datei lässt sich nicht entschlüsseln. Vermutlich gehört sie zu einem anderen Windows-Konto oder der Schlüssel fehlt.');
    }
  }

  /** Text schreiben, mit Verschlüsselung als Kennung + verschlüsselter Inhalt. */
  function schreiben(datei, text) {
    schreibeAtomar(datei, krypto ? Buffer.concat([KOPF, krypto.verschluesseln(text)]) : text);
  }

  const lesbar = (datei) => { try { lesen(datei); return true; } catch { return false; } };

  /**
   * Passt der geladene Schlüssel zu den vorhandenen verschlüsselten Dateien? (D-6, 1.5.2)
   * 'ok' = passt, 'neu' = noch nichts verschlüsselt, 'falsch' = Electron hat einen anderen Schlüssel geladen,
   * 'aus' = ohne Verschlüsselung. Bei 'falsch' schreibt Noteline in dieser Sitzung keine einzige Datei.
   */
  function schluesselPruefen() {
    if (!krypto) return 'aus';
    // Die Datendatei entscheidet (1.5.3): Nur sie zählt, Einstellungen oder ein alter Prüfwert können mit einem
    // anderen Schlüssel geschrieben sein.
    if (fs.existsSync(verschluesselt.daten)) return lesbar(verschluesselt.daten) ? 'ok' : 'falsch';
    if (fs.existsSync(pruefDatei)) return lesbar(pruefDatei) && lesen(pruefDatei) === PRUEFTEXT ? 'ok' : 'falsch';
    return 'neu';
  }

  /** Klartext-Datei verschlüsselt ablegen. Das Original wird erst gelöscht, wenn das Zurücklesen gelingt (D-6). */
  function umstellen(quelle, ziel) {
    const text = lesen(quelle);
    schreiben(ziel, text);
    if (lesen(ziel) !== text) throw new Error('Verschlüsselte Fassung weicht ab, Original bleibt erhalten.');
    fs.unlinkSync(quelle);
  }

  /** Beim Start: Backups, defekte Kopien und Einstellungen aus Klartext-Zeiten umstellen. Fehler stoppen nichts. */
  function klartextUmstellen() {
    if (!krypto) return;
    const versuche = (fn) => { try { fn(); } catch { /* bleibt im Klartext, nächster Start versucht es erneut */ } };
    for (const f of fs.readdirSync(backupOrdner)) {
      if (!/^daten-\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
      const quelle = path.join(backupOrdner, f), ziel = quelle.replace(/\.json$/, '.enc');
      versuche(() => (fs.existsSync(ziel) ? fs.unlinkSync(quelle) : umstellen(quelle, ziel)));
    }
    for (const f of fs.readdirSync(ordner)) {
      if (!/^daten-defekt-.+\.json$/.test(f)) continue;
      const quelle = path.join(ordner, f);
      versuche(() => umstellen(quelle, quelle.replace(/\.json$/, '.enc')));
    }
    if (!fs.existsSync(einstellungenDatei)) {
      for (const quelle of [klar.einstellungen, altFensterDatei]) {
        if (!fs.existsSync(quelle)) continue;
        let ok = false;
        versuche(() => { JSON.parse(lesen(quelle)); umstellen(quelle, einstellungenDatei); ok = true; });
        if (ok) break;
      }
    }
    if (fs.existsSync(einstellungenDatei)) for (const rest of [klar.einstellungen, altFensterDatei]) versuche(() => fs.existsSync(rest) && fs.unlinkSync(rest));
  }

  function dailyBackup() {
    if (!fs.existsSync(datenDatei)) return null;
    const ziel = path.join(backupOrdner, `daten-${lokalesDatum(jetzt())}${endung}`);
    if (!fs.existsSync(ziel)) fs.copyFileSync(datenDatei, ziel);
    const alle = fs.readdirSync(backupOrdner).filter(f => BACKUP_MUSTER.test(f)).sort();
    while (alle.length > BACKUP_TAGE) fs.unlinkSync(path.join(backupOrdner, alle.shift()));
    return ziel;
  }

  function migrieren() {
    if (!altOrdner || fs.existsSync(datenDatei) || fs.existsSync(klar.daten) || fs.existsSync(verschluesselt.daten)) return false;
    const alt = path.join(altOrdner, 'daten.json');
    if (!fs.existsSync(alt)) return false;
    fs.copyFileSync(alt, klar.daten);
    return true;
  }

  /** @returns {{status: 'neu'|'ok'|'defekt', daten: object|null, fehler?: string, kopie?: string, migriert?: boolean}} */
  function load() {
    if (schluessel === 'falsch') {
      gesperrt = true;
      return { status: 'defekt', daten: null, schluesselFalsch: true,
        fehler: 'Der Schlüssel passt nicht zu den gespeicherten Dateien, es wurde nichts verändert. Bitte Noteline über das Symbol im Infobereich beenden und neu starten. Bleibt der Hinweis, gehören die Dateien zu einem anderen Windows-Konto oder der Schlüssel fehlt.' };
    }
    const migriert = migrieren();
    // Verschlüsselte Datei zuerst; ohne Verschlüsselung führt sie in den Schutzmodus statt zu einem leeren Neustart.
    const quelle = [verschluesselt.daten, klar.daten].find(d => fs.existsSync(d));
    if (!quelle) return { status: 'neu', daten: null };
    let daten, text;
    try {
      text = lesen(quelle);
      daten = JSON.parse(text);
      if (!daten || typeof daten !== 'object' || !Array.isArray(daten.notizen)) throw new Error('Kein gültiges Noteline-Format (Liste „notizen“ fehlt).');
    } catch (e) {
      gesperrt = true;
      const kopie = path.join(ordner, `daten-defekt-${zeitstempel(jetzt())}${path.extname(quelle) === '.enc' ? '.enc' : endung}`);
      try {
        if (path.extname(quelle) === '.enc' || text === undefined) fs.copyFileSync(quelle, kopie);
        else schreiben(kopie, text); // lesbarer, aber falscher Klartext: Kopie gleich verschlüsselt
      } catch { /* Kopie ist nur eine Hilfe */ }
      return { status: 'defekt', daten: null, fehler: e.message, kopie };
    }
    if (quelle !== datenDatei) {
      try { umstellen(quelle, datenDatei); } catch { /* bleibt vorerst im Klartext, wird beim nächsten Speichern ersetzt */ }
    }
    try { dailyBackup(); } catch { /* Backup darf das Laden nicht verhindern */ }
    return { status: 'ok', daten, migriert };
  }

  function save(json) {
    if (gesperrt) throw new Error('Schutzmodus: Die Datendatei ist defekt, es wird nicht gespeichert.');
    if (typeof json !== 'string') throw new TypeError('json muss ein String sein');
    JSON.parse(json); // nie ungültiges JSON schreiben
    try { dailyBackup(); } catch { /* Backup darf das Speichern nicht verhindern */ }
    schreiben(datenDatei, json);
    if (krypto && fs.existsSync(klar.daten)) { try { fs.unlinkSync(klar.daten); } catch { /* nächster Versuch beim nächsten Speichern */ } }
  }

  /** Einstellungen (D-1). Fehlt die Datei, wird die Fassung aus älteren Versionen übernommen. */
  function ladeEinstellungen() {
    if (einstellungenSitzung) return { ...einstellungenSitzung };
    for (const datei of [einstellungenDatei, klar.einstellungen, altFensterDatei]) {
      try { const e = JSON.parse(lesen(datei)); if (e && typeof e === 'object') return e; } catch { /* nächste Quelle */ }
    }
    return {};
  }
  function speichereEinstellungen(patch) {
    const neu = { ...ladeEinstellungen(), ...patch };
    if (schluessel === 'falsch') { einstellungenSitzung = neu; return neu; } // nichts mit falschem Schlüssel schreiben
    try {
      // Unlesbare Einstellungen (mit einem nicht gespeicherten Schlüssel geschrieben) vor dem Ersetzen aufheben
      if (krypto && fs.existsSync(einstellungenDatei) && !lesbar(einstellungenDatei)) {
        fs.copyFileSync(einstellungenDatei, path.join(ordner, `einstellungen-defekt-${zeitstempel(jetzt())}.enc`));
      }
      schreiben(einstellungenDatei, JSON.stringify(neu, null, 1));
      for (const alt of [klar.einstellungen, altFensterDatei]) if (alt !== einstellungenDatei && fs.existsSync(alt)) fs.unlinkSync(alt);
    } catch { /* Einstellungen sind unkritisch, nächster Versuch beim nächsten Ändern */ }
    return neu;
  }

  const schluessel = schluesselPruefen();
  if (schluessel === 'falsch') gesperrt = true;
  else if (krypto) {
    // Prüfwert anlegen oder einen mit anderem Schlüssel geschriebenen ersetzen
    try { if (!lesbar(pruefDatei) || lesen(pruefDatei) !== PRUEFTEXT) schreiben(pruefDatei, PRUEFTEXT); } catch { /* nächster Start legt ihn an */ }
    klartextUmstellen();
  }

  return {
    load, save, dailyBackup, ladeEinstellungen, speichereEinstellungen,
    get gesperrt() { return gesperrt; },
    schluessel,
    verschluesselt: !!krypto,
    pfade: { ordner, datenDatei, backupOrdner, einstellungenDatei },
  };
}

module.exports = { createStorage, lokalesDatum, schreibeAtomar, BACKUP_TAGE, KOPF };
