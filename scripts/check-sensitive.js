#!/usr/bin/env node
// Prüft, dass keine Nutzerdaten oder Zugangsdaten ins Repository gelangen (Spezifikation R-1).
//
//   node scripts/check-sensitive.js --staged   → Dateien im Git-Index (Pre-Commit-Hook)
//   node scripts/check-sensitive.js --all      → alle versionierten Dateien (CI)
//
// Endet mit Code 1, sobald etwas gefunden wird.
'use strict';
const { execFileSync } = require('child_process');

// Dateien, die nie versioniert werden dürfen – unabhängig vom Inhalt.
const VERBOTENE_PFADE = [
  { re: /(^|\/)daten(-[^/]*)?\.json$/i, grund: 'Noteline-Datendatei' },
  { re: /(^|\/)fenster\.json$/i, grund: 'Noteline-Fenstereinstellungen' },
  { re: /(^|\/)einstellungen\.json$/i, grund: 'Noteline-Einstellungen (z. B. interne Ticket-Adresse)' },
  { re: /(^|\/)Backups\//i, grund: 'Noteline-Backup' },
  { re: /(^|\/)demo-data\//i, grund: 'Lokale Demodaten' },
  { re: /(^|\/)\.env(\.|$)/i, grund: 'Umgebungsdatei mit möglichen Zugangsdaten' },
  { re: /\.(pem|key|p12|pfx)$/i, grund: 'Schlüssel- oder Zertifikatsdatei' },
];

// Inhaltsmuster für Zugangsdaten.
const VERBOTENE_INHALTE = [
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, grund: 'GitHub-Token' },
  { re: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/, grund: 'GitHub-Token (fine-grained)' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, grund: 'AWS-Zugangsschlüssel' },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/, grund: 'Slack-Token' },
  { re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/, grund: 'Anthropic-API-Schlüssel' },
  { re: /\bsk-[A-Za-z0-9]{40,}\b/, grund: 'API-Schlüssel' },
  { re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/, grund: 'Privater Schlüssel' },
];

const NUR_PFAD = /\.(png|jpe?g|gif|ico|woff2?|ttf|exe|blockmap|zip)$|(^|\/)package-lock\.json$/i;

function pruefePfad(datei) {
  const p = datei.replace(/\\/g, '/');
  return VERBOTENE_PFADE.filter(r => r.re.test(p)).map(r => ({ datei: p, zeile: 0, grund: r.grund }));
}

function pruefeInhalt(datei, inhalt) {
  if (NUR_PFAD.test(datei)) return [];
  const funde = [];
  inhalt.split(/\r?\n/).forEach((zeile, i) => {
    for (const r of VERBOTENE_INHALTE) if (r.re.test(zeile)) funde.push({ datei, zeile: i + 1, grund: r.grund });
  });
  return funde;
}

function pruefe(dateien, lesen) {
  const funde = [];
  for (const d of dateien) {
    funde.push(...pruefePfad(d));
    if (NUR_PFAD.test(d)) continue;
    let inhalt;
    try { inhalt = lesen(d); } catch { continue; }
    funde.push(...pruefeInhalt(d, inhalt));
  }
  return funde;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const modus = process.argv[2];
  let dateien, lesen;
  if (modus === '--staged') {
    dateien = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
    lesen = (d) => git(['show', `:${d}`]);
  } else if (modus === '--all') {
    dateien = git(['ls-files', '-z']).split('\0').filter(Boolean);
    lesen = (d) => require('fs').readFileSync(d, 'utf8');
  } else {
    console.error('Aufruf: node scripts/check-sensitive.js --staged | --all');
    process.exit(2);
  }
  const funde = pruefe(dateien, lesen);
  if (!funde.length) {
    console.log(`✓ Keine sensiblen Daten gefunden (${dateien.length} Dateien geprüft).`);
    return;
  }
  console.error('✗ Sensible Daten gefunden – Vorgang abgebrochen:\n');
  for (const f of funde) console.error(`  ${f.datei}${f.zeile ? ':' + f.zeile : ''}  →  ${f.grund}`);
  console.error('\nDatei aus dem Commit entfernen (git restore --staged <datei>) oder Inhalt bereinigen.');
  process.exit(1);
}

if (require.main === module) main();
module.exports = { pruefe, pruefePfad, pruefeInhalt };
