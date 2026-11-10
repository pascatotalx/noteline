// Code-Prüfung (Spezifikation D-7): ESLint-Empfehlungen plus Sicherheitsregeln. Läuft in der CI und vor jedem Release.
'use strict';
const js = require('@eslint/js');
const globals = require('globals');
const security = require('eslint-plugin-security');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'docs/**', 'brand/**', 'build/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      // Begründete Ausnahmen der Sicherheitsregeln:
      // - Objektzugriffe mit Variablen sind hier Nachschlagetabellen mit festen Schlüsseln, keine Nutzerobjekte.
      'security/detect-object-injection': 'off',
      // - Dateipfade entstehen nur aus dem Datenordner und festen Namen, nie aus Eingaben.
      'security/detect-non-literal-fs-filename': 'off',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['src/main/**/*.js', 'src/preload/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, module: 'readonly' } },
  },
];
