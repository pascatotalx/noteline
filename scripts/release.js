#!/usr/bin/env node
// Veröffentlicht die Version aus package.json als GitHub-Release (plan.md §10, Spezifikation R-3).
//
//   npm run release
//
// Voraussetzungen: gh ist angemeldet, alles ist committet und gepusht, CHANGELOG.md hat einen Abschnitt
// „## [X.Y.Z]". Hochgeladen wird mit der Anmeldung von gh – kein Token in Dateien oder Umgebung (R-1).
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { version, build } = require('../package.json');
const { owner, repo } = build.publish[0];
const tag = `v${version}`;
const R = ['--repo', `${owner}/${repo}`];

const run = (cmd, args, opt = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opt }).trim();
// npm/npx sind unter Windows .cmd-Dateien und brauchen eine Shell. Nur feste Befehle ohne Eingaben.
const shell = (befehl) => spawnSync(befehl, { cwd: ROOT, stdio: 'inherit', shell: true }).status === 0;
const stopp = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };
const schritt = (msg) => console.log(`\n▸ ${msg}`);

function changelogAbschnitt(v) {
  const text = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const start = text.search(new RegExp(`^## \\[${v.replace(/\./g, '\\.')}\\]`, 'm'));
  if (start < 0) return null;
  const rest = text.slice(start);
  const ende = rest.slice(3).search(/^## \[/m);
  return (ende < 0 ? rest : rest.slice(0, ende + 3)).split('\n').slice(1).join('\n').replace(/\n\[[^\]]+\]:.*$/gm, '').trim();
}

schritt(`Prüfe Voraussetzungen für ${tag}`);
if (run('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') stopp('Releases nur vom Branch main.');
if (run('git', ['status', '--porcelain'])) stopp('Es gibt nicht committete Änderungen.');
run('git', ['fetch', 'origin', 'main', '--tags']);
if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/main'])) stopp('main ist nicht mit origin/main synchron (erst pushen).');
if (run('git', ['tag', '--list', tag])) stopp(`Tag ${tag} existiert schon – Version in package.json erhöhen.`);
const notes = changelogAbschnitt(version);
if (!notes) stopp(`CHANGELOG.md hat keinen Abschnitt „## [${version}]".`);

schritt('Tests und Prüfung auf sensible Daten');
if (!shell('npm test')) stopp('Tests sind fehlgeschlagen.');
if (!shell('node scripts/check-sensitive.js --all')) stopp('Prüfung auf sensible Daten ist fehlgeschlagen.');

schritt('Baue Installer');
fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
if (!shell('npx electron-builder --win --publish never')) stopp('electron-builder ist fehlgeschlagen.');
const assets = [`Noteline-Setup-${version}.exe`, `Noteline-Setup-${version}.exe.blockmap`, 'latest.yml']
  .map(n => path.join(ROOT, 'dist', n));
for (const a of assets) if (!fs.existsSync(a)) stopp(`Build-Ergebnis fehlt: ${path.basename(a)}`);

// Erst als Entwurf mit allen Dateien anlegen, dann veröffentlichen – der Updater sieht nie ein halbes Release (R-3).
schritt('Lade Release als Entwurf hoch');
const notesDatei = path.join(os.tmpdir(), `noteline-notes-${version}.md`);
fs.writeFileSync(notesDatei, notes + `\n\n---\n**Installation:** \`Noteline-Setup-${version}.exe\` herunterladen und ausführen. ` +
  'Bereits installierte Versionen aktualisieren sich automatisch.\n');
try {
  run('gh', ['release', 'create', tag, ...assets, ...R, '--draft', '--target', 'main',
    '--title', `Noteline ${version}`, '--notes-file', notesDatei], { stdio: ['ignore', 'pipe', 'inherit'] });
} finally {
  fs.rmSync(notesDatei, { force: true });
}

schritt('Veröffentliche Release');
run('gh', ['release', 'edit', tag, ...R, '--draft=false', '--latest']);
run('git', ['fetch', 'origin', '--tags']);
console.log(`\n✓ Noteline ${version} ist veröffentlicht: https://github.com/${owner}/${repo}/releases/tag/${tag}`);
