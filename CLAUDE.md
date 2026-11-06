# Arbeitsweise in diesem Repository

Noteline wird nach **Spec-Driven Development** entwickelt. Vor jeder Änderung `specs/constitution.md` lesen.

1. **Spec zuerst:** Neue Funktion oder Fehler → zuerst `specs/specification.md` (Story + Akzeptanzkriterien mit
   Kennung), dann `specs/plan.md` (wenn sich Architektur/Daten/Schnittstellen ändern), dann `specs/tasks.md`.
2. **Code folgt der Spec.** Kennungen (z. B. `H-6`, `W-2`) in Kommentaren und Testnamen verwenden.
3. **Reine Logik** gehört in `src/renderer/logic.js` bzw. `src/main/storage.js` und bekommt Tests in `test/`.
4. **Vor jedem Commit:** `npm test` grün. Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` …).
5. **Release:** Version erhöhen, `CHANGELOG.md` ergänzen, committen, pushen, `npm run release`.

## Nicht verhandelbar: Daten

Das Repository ist **öffentlich**. Niemals Nutzerdaten (`daten*.json`, `fenster.json`, `Backups/`), echte
Kunden, Telefonnummern, Tickets, interne IPs oder Zugangsdaten committen, auch nicht in Tests, Doku,
Screenshots oder Commit-Nachrichten. Beispiele sind ausgedacht (IPs aus 192.0.2.0/24, Domains example.org).
Den Pre-Commit-Hook nie mit `--no-verify` umgehen.
