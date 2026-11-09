| [x] || [x] || [x] |# Noteline – Aufgaben

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
| T-14 | Öffentliches Repo anlegen, Secret Scanning + Push-Schutz, Beschreibung, Topics | R-1, R-2 | [x] |
| T-15 | `release.js` und erstes Release 1.0.0 | R-3 | [x] |
| T-16 | Manueller Test: Installation, Benachrichtigung, Update 1.0.0 → 1.0.1 | U-1, U-2, H-6 | [ ] |

## Meilenstein 1.1.0 – Arbeitsplatz-Anpassung

| # | Aufgabe | Spec | Status |
|---|---|---|---|
| T-30 | Spec, Plan und Aufgaben für 1.1 | alle | [x] |
| T-31 | Telefon- und Ticketnummer in der Schnellerfassung + Tests | H-1 | [x] |
| T-32 | Ticket-Link-Vorlage, Prüfung + Tests | H-8 | [x] |
| T-33 | `einstellungen.json` mit Übernahme von `fenster.json` + Tests, Datenschutz-Prüfung erweitern | D-1, R-1 | [x] |
| T-34 | Infobereich-Symbol, Schließen/Minimieren verstecken, Beenden-Wege | A-3 | [x] |
| T-35 | Flache Titelleiste mit Windows-Fensterknöpfen | A-1 | umgesetzt, Sichtprüfung offen |
| T-36 | Hell/Dunkel/Wie Windows, Farben als Variablen | A-2 | [x] |
| T-37 | Zweispaltiges Layout mit Notiz rechts | L-1 | [x] |
| T-38 | Leere Spuren ausblenden, Uhr optional, Einstellungen neu ordnen | H-4, A-2 | [x] |
| T-39 | Update-Benachrichtigung und stilles Update im Ruhezustand | U-2, K-2 | umgesetzt, Test mit Update 1.1.0 → 1.1.1 offen |
| T-40 | Screenshots (schmal, breit, hell), README, CHANGELOG, Release 1.1.0 | R-2, R-3 | [ ] |

## Meilenstein 1.2.0 – Ansprechpartner und Logo

| # | Aufgabe | Spec | Status |
|---|---|---|---|
| T-41 | Logo „One Flow": Icons, Infobereich, Titelleiste, README, `brand/` | R-4 | [x] |
| T-42 | Feld Ansprechpartner: Datenmodell, Schnellerfassung, Suche + Tests | H-9, D-5 | [x] |
| T-43 | Feld Ansprechpartner: Notiz, Listenzeile, Rückruf-Benachrichtigung | H-9 | [x] |
| T-45 | Rückruf: Datum vorbelegt mit heute, Uhrzeit separat | H-6 | [x] |
| T-46 | Wissen: Typ-Erkennung, Eingabe-Parser, URL-Kodierung + Tests | W-1, W-2, W-4 | [x] |
| T-47 | Wissen: neue Übersicht, Zeilen-Aktionen, Bearbeiten in der Zeile | W-1 – W-3 | [x] |
| T-48 | Favoriten mit Alt+1–9, Strg+Enter kopiert Treffer | W-5, W-6 | [x] |
| T-49 | Rückgängig beim Löschen | A-4 | [x] |
| T-50 | Notiz als Text kopieren + Test | H-10 | [x] |
| T-51 | Wissen: Live-Vorschau Name/Wert mit Vorschlägen (1.2.1) | W-1 | [x] |
| T-52 | Befehlserkennung (PowerShell-Cmdlets, Windows-Befehle) in Eingabe und Vorschau (1.2.2) | W-1 | [x] |
| T-53 | Notiz: Ansprechpartner per Anrede, Kunde per Branchenwort/Rechtsform + Tests (1.2.2) | H-1 | [x] |
| T-54 | Notiz: Live-Vorschau unter dem Eingabefeld, verständlichere Texte (1.2.2) | H-11 | [x] |
| T-55 | Notiz: Bezeichnungen und Kürzel (KD, ASP, Tel, Tkt, PX, Dr.) + Tests (1.2.3) | H-1 | [x] |
| T-56 | Nur Symbol im Infobereich, kein Taskleisten-Knopf (1.2.3) | A-3 | umgesetzt, Sichtprüfung auf dem Laptop offen |
| T-57 | Kürzel in Kleinschreibung, Namenslänge, Hinweis „Namen eintippen“ (1.2.4) | H-1, H-11 | [x] |
| T-58 | Titelleiste bleibt sichtbar: Seite verrutscht nicht, Blätter beginnen darunter (1.2.5) | A-1 | [x] |
| T-44 | Screenshots, README, CHANGELOG, Release 1.2.0 | R-2, R-3 | [ ] |

## Meilenstein 1.3.0 – Statusmonitor

| # | Aufgabe | Spec | Status |
|---|---|---|---|
| T-60 | Constitution und Spec für den Statusmonitor | S-1 – S-4 | [x] |
| T-61 | `status.js`: Quellen auslesen, Art erkennen, Änderungen ermitteln + Tests | S-2, S-4 | [x] |
| T-62 | Hauptprozess: Zeitplan, Abruf, Benachrichtigungen, IPC | S-1, S-4 | [x] |
| T-63 | Oberfläche: Statusfeld, Übersicht, Einstellungen mit Vorlagen und eigenen Quellen | S-1, S-3 | [x] |
| T-64 | Prüfung in der echten App mit simulierter Störung, README, Changelog | S-1 – S-4 | [x] |

## Meilenstein 1.4.0 – Kunden merken, TeamViewer

| # | Aufgabe | Spec | Status |
|---|---|---|---|
| T-65 | Bekannte Kunden in voller Länge erkennen, Vorschlag mit Tab, Komma-Hinweis + Tests | H-1, H-11 | [x] |
| T-66 | TeamViewer-ID und Passwort: Datenmodell, Schnellerfassung, Felder mit Kopieren + Tests | H-12 | [x] |
| T-67 | Prüfung in der echten App, Changelog, README | H-1, H-12 | [x] |
| T-68 | Statusmonitor: 5 Minuten als Standard, alter Standard wird umgestellt + Tests (1.4.1) | S-1 | [x] |
| T-69 | Benachrichtigungen mit Namen „Noteline“: eigene App-Kennung für Entwicklungsläufe (1.4.1) | S-4 | [x] |

## Backlog

| # | Aufgabe | Spec |
|---|---|---|
| T-20 | Import aus Notepad++ (Trennregel mit Pascal klären) | B-1 |
| T-24 | Erledigte Notizen archivieren | B-5 |
| T-21 | Notiz als Ticket-Text exportieren | B-2 |
