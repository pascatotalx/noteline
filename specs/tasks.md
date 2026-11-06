# Noteline – Aufgaben

Kleine, einzeln prüfbare Schritte in Abhängigkeitsreihenfolge. Jede Aufgabe nennt die Spec-Kennungen.
`[x]` = erledigt und getestet.

## Meilenstein 1.0.0 – Neuaufbau

| # | Aufgabe | Spec | Status |
|---|---|---|---|
| T-01 | Repo-Grundgerüst: `package.json`, `.gitignore`, `.gitattributes`, Lizenz, Ordnerstruktur | R-2 | [x] |
| T-02 | `check-sensitive.js` + Tests, Pre-Commit-Hook, Aktivierung über `prepare` | R-1 | [x] |
| T-03 | `logic.js` aus dem Prototyp herauslösen, reine Funktionen + Tests | H-1, H-4, H-6, W-2, D-5 | [x] |
| T-04 | `storage.js` mit Schutzmodus, Migration, Backups + Tests | D-1 – D-4 | [x] |
| T-05 | Hauptprozess: Sandbox, Navigationssperre, Benachrichtigungen, Autostart, IPC | A-1, A-2, H-6 | [x] |
| T-06 | Renderer aufteilen (HTML/CSS/JS), CSP ohne Inline-Skripte | Constitution 4 | [x] |
| T-07 | Formular-Entwürfe beim Neuzeichnen erhalten | W-1 | [x] |
| T-08 | Vorlagen mit mehreren Platzhaltern | W-2 | [x] |
| T-09 | Einstellungs-Panel (Version, Updates, Autostart, Ordner) und Schutzmodus-Hinweis | A-2, D-3 | [x] |
| T-10 | `updater.js` + Update-Hinweis im Renderer | U-2 | [x] |
| T-11 | NSIS-Installer konfigurieren und lokal bauen | U-1 | [x] |
| T-12 | README, CHANGELOG, SECURITY, Screenshot mit Demodaten | R-2 | [x] |
| T-13 | GitHub Action (Tests + Prüfung sensibler Daten) | R-1 | [x] |
| T-14 | Öffentliches Repo anlegen, Secret Scanning + Push-Schutz, Beschreibung, Topics | R-1, R-2 | [ ] |
| T-15 | `release.js` und erstes Release 1.0.0 | R-3 | [ ] |
| T-16 | Manueller Test: Installation, Benachrichtigung, Update 1.0.0 → 1.0.1 | U-1, U-2, H-6 | [ ] |

## Backlog

| # | Aufgabe | Spec |
|---|---|---|
| T-20 | Import aus Notepad++ (Trennregel mit Pascal klären) | B-1 |
| T-21 | Notiz als Ticket-Text exportieren | B-2 |
