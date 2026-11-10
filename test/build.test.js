'use strict';
// Absicherung der Build-Einstellungen (Spezifikation D-7, K-7).
const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('D-7: Electron-Fuses im Installer', () => {
  const f = pkg.build.electronFuses;
  assert.equal(f.runAsNode, false);
  assert.equal(f.enableNodeOptionsEnvironmentVariable, false);
  assert.equal(f.enableNodeCliInspectArguments, false);
  assert.equal(f.enableEmbeddedAsarIntegrityValidation, true);
  assert.equal(f.onlyLoadAppFromAsar, true);
});

test('K-7: file://-Sonderrechte bleiben an, sonst bleibt das Fenster leer (1.5.0)', () => {
  // Die Oberfläche wird mit loadFile() aus der app.asar geladen. Ohne diesen Schalter: ERR_FILE_NOT_FOUND.
  assert.equal(pkg.build.electronFuses.grantFileProtocolExtraPrivileges, true);
});
