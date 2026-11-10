# Noteline – Technischer Plan

Beschreibt **wie** die Spezifikation umgesetzt wird. Regeln aus `constitution.md` gelten zusätzlich.

## 1. Architektur

```
┌──────────────────────── Electron-Hauptprozess (Node) ────────────────────────┐
│ main.js      Fenster, Single-Instance, Tastenkürzel, Benachrichtigungen, IPC │
│ storage.js   daten.json laden/speichern, Schutzmodus, Backups, Migration     │
│ updater.js   electron-updater: stündliche Prüfung, Status an Renderer        │
└──────────────▲───────────────────────────────────────────────────────────────┘
               │ IPC (invoke / sendSync / Events), nur über preload.js
┌──────────────┴──────── Renderer (Sandbox, kein Node) ────────────────────────┐
│ logic.js     reine Funktionen: Parser, Spuren, Rückrufstatus, Vorlagen,      │
│              Normalisierung – auch in Node testbar                           │
│ app.js       Zustand, Rendering, Ereignisse                                  │
│ index.html + styles.css                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Verzeichnisstruktur

```
.github/workflows/ci.yml     Tests + Prüfung auf sensible Daten bei jedem Push
.githooks/pre-commit         Commit-Sperre für Daten/Zugangsdaten (R-1)
build/icon.png               App-Icon (256 px, electron-builder erzeugt .ico)
scripts/check-sensitive.js   gemeinsame Prüfung für Hook und CI
scripts/release.js           Release-Ablauf (R-3)
scripts/screenshot.js        README-Screenshot mit ausgedachten Demodaten
specs/                       constitution, specification, plan, tasks
src/main/                    main.js, storage.js, updater.js
src/preload/preload.js
src/renderer/                index.html, theme-init.js, styles.css, logic.js, app.js, fonts/, icon.png
test/                        node:test-Tests
```

## 3. Datenmodell (`daten.json`, Version 2)

```jsonc
{
  "version": 2,
  "notizen": [{
    "id": "lq2x8k3abcd",           // Zeit-basiert + Zufall
    "erstellt": "ISO", "geaendert": "ISO",
    "kunde": "", "ansprechpartner": "", "ticket": "", "telefon": "", "text": "",   // ansprechpartner ab 1.2
    "status": "offen|wartet|erledigt",
    "prio": "hoch|normal|niedrig",
    "rueckruf": "ISO|null",
    "erinnertFuer": "ISO|null"     // Rückrufzeitpunkt, für den schon erinnert wurde (H-6)
  }],
  "wissen": [{ "id": "", "titel": "", "wert": "", "favorit": false, "gruppe": "" }], // gruppe nur noch aus 1.0/1.1, ungenutzt
  "ui": {
    "closed": { "erledigt": true },                   // eingeklappte Spuren (H-4)
    "platzhalter": { "<wissen-id>": { "IP": "…" } }   // letzte Vorlagenwerte (W-2)
  }
}
```

`logic.normalize()` macht aus jeder gelesenen Datei (auch Version 1 des Prototyps) ein gültiges Modell
(D-5). In Version 1 war `platzhalter[id]` ein String. Er wird dem ersten Platzhalter zugeordnet.

`einstellungen.json` (ab 1.1, vorher `fenster.json`): `{ bounds, immerVorne, theme, uhr, ticketLink, trayHinweis,
updateGemeldet, startVersteckt }`. Gehört dem Hauptprozess, der Renderer liest und schreibt über IPC.

## 4. Speicher (`storage.js`) – D-1 bis D-4

- `load()` liefert `{ status: 'neu' | 'ok' | 'defekt', daten, fehler }`.
  - Fehlt die Datei: Migration aus `Dokumente\Hotline-Notizen\daten.json`, wenn vorhanden, sonst `neu`.
  - Parse-Fehler oder `notizen` ist kein Array: `defekt`. Kopie `daten-defekt-<ts>.json`, Schreibsperre.
- `save(json)`: verweigert im Schutzmodus. Ruft vorher `dailyBackup()` auf (D-2, auch über Mitternacht),
  schreibt dann atomar (`.tmp` + `rename`). Bei `EPERM`/`EBUSY` (Virenscanner, OneDrive) bis zu
  3 Versuche mit 50 ms Abstand.
- `dailyBackup()`: lokales Datum (nicht UTC), höchstens eine Kopie pro Tag, behält 30.
- Ordner überschreibbar per Umgebungsvariable `NOTELINE_DATA_DIR` (Tests, Screenshot), nur in der Entwicklerversion.
- Verschlüsselung siehe §15: `createStorage({ …, krypto })`. Ohne `krypto` (Tests, Windows ohne DPAPI) wie bisher JSON.

## 5. IPC-Schnittstelle (`window.api`)

| Aufruf | Art | Zweck |
|---|---|---|
| `laden()` | invoke | `{status, daten, fehler, ordner}` |
| `speichern(json)` | invoke | asynchron speichern |
| `speichernSofort(json)` | sendSync | beim Schließen/Update (D-4) |
| `immerVorne(an)`, `istImmerVorne()` | invoke | A-1 |
| `autostart(an?)` | invoke | A-2, `app.setLoginItemSettings` |
| `ordnerOeffnen()` | invoke | Datenordner im Explorer |
| `einstellungen()`, `einstellungSetzen(k, v)` | invoke | `theme`, `uhr`, `ticketLink` (A-2, H-8) |
| `linkOeffnen(url)` | invoke | nur `http(s)` |
| `erinnern({titel,text,id})` | invoke | H-6 |
| `version()` | invoke | A-2 |
| `updateSuchen()`, `updateInstallieren()` | invoke | U-2 |
| `beiNotizOeffnen(fn)`, `beiUpdateStatus(fn)`, `beiTheme(fn)` | Event | Main → Renderer |
| `istSichtbar()`, `notizOffen(bool)` | invoke | Ruhezustand für stilles Update (K-2) |

## 6. Updates (`updater.js`) – U-2, K-1, K-2

- `electron-updater` mit Provider `github`, `owner: pascatotalx`, `repo: noteline` (öffentlich, kein Token).
- `autoDownload: true`, `autoInstallOnAppQuit: true`.
- Prüfung 10 s nach Start, dann alle 60 min, außerdem manuell.
- Status an den Renderer: `idle | suche | aktuell | laedt(prozent) | bereit(version) | fehler(text) | dev`.
- *Jetzt neu starten*: `quitAndInstall(true, true)`, also stille Installation mit anschließendem Neustart.
  Vorher läuft durch das Schließen des Fensters `beforeunload` → `speichernSofort`.
- Außerhalb der installierten App (`!app.isPackaged`) ist der Status `dev`, es wird nicht gesucht.

## 7. Installer – U-1

electron-builder `nsis`: `oneClick: true`, `perMachine: false`, Desktop- und Startmenü-Verknüpfung,
`deleteAppDataOnUninstall: false`. `appId: de.pascatotalx.noteline`. Die Startmenü-Verknüpfung trägt
diese AppUserModelID, deshalb funktionieren Windows-Benachrichtigungen (H-6).
Benachrichtigungsobjekte werden bis zum Schließen referenziert, damit der Klick-Handler nicht vom
Garbage Collector entfernt wird.

## 8. Renderer-Details

- **Formular-Entwürfe (W-1):** Vor jedem Neuzeichnen werden die Werte eines offenen Wissen-Formulars und
  das fokussierte Feld samt Cursorposition gesichert und danach wiederhergestellt.
- **Vorlagen (W-2):** `logic.placeholders(wert)` liefert eindeutige Namen. `logic.fillTemplate()` ersetzt
  per Callback-Funktion, damit `$` nicht als Ersetzungsmuster gilt.
- **Dateien ins Fenster ziehen (A-1):** Renderer verhindert `dragover`/`drop` mit Dateien,
  Hauptprozess blockiert zusätzlich `will-navigate`.
- **CSP:** `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
  img-src 'self' data:`. Inline-Styles bleiben für dynamische Farben erlaubt, Inline-Skripte nicht.

## 9. Schutz sensibler Daten – R-1

| Ebene | Maßnahme |
|---|---|
| Laufzeit | Daten nur in `Dokumente\Noteline`, kein Upload, keine Telemetrie |
| Repository | `.gitignore`: `daten*.json`, `fenster.json`, `einstellungen.json`, `Backups/`, `dist/`, `.env*`, `*.log` |
| Commit | `.githooks/pre-commit` → `check-sensitive.js --staged`, aktiviert über `npm install` (`prepare`) |
| Push | GitHub Action `check-sensitive.js --all` + GitHub Secret Scanning mit Push-Schutz |
| Release | Upload über die Anmeldung von `gh`, kein Token in Dateien oder Umgebungsvariablen |
| Identität | Commits mit `…@users.noreply.github.com` |

`check-sensitive.js` prüft Dateipfade (Datendateien, Schlüsseldateien, `.env`) und Inhalte
(GitHub-, AWS-, Slack-, Anthropic-Token, private Schlüssel). Binärdateien und `package-lock.json`
werden nur per Pfad geprüft. Findet es etwas, endet es mit Code 1 und nennt Datei und Zeile.

## 10. Release-Ablauf – R-3

`npm run release` (scripts/release.js):
1. Prüft: Branch `main`, keine offenen Änderungen, mit `origin` synchron, `npm test` grün,
   `CHANGELOG.md` hat einen Abschnitt für die Version aus `package.json`, Tag existiert noch nicht.
2. `electron-builder --win --publish never` baut Setup, Blockmap und `latest.yml` nach `dist/`.
3. `gh release create vX.Y.Z <alle drei Dateien> --draft --title "Noteline X.Y.Z" --notes-file <CHANGELOG-Abschnitt>`
   lädt alles in **einen** Entwurf hoch. (electron-builder lädt selbst parallel hoch und hat dabei beim ersten
   Release 1.0.0 einen zweiten Entwurf erzeugt. Deshalb übernimmt `gh` den Upload.)
4. `gh release edit vX.Y.Z --draft=false --latest` veröffentlicht. Erst ab jetzt sieht der Updater die Version.

Version erhöhen: `npm version patch|minor --no-git-tag-version`, CHANGELOG ergänzen, committen, pushen, release.

## 11. Tests

- `test/logic.test.js`: Schnellerfassung, Rückrufstatus, Spuren, Vorlagen, Normalisierung.
- `test/storage.test.js`: neu/ok/defekt, Schreibsperre, Migration, Backups über Datumswechsel, Aufräumen.
- `test/check-sensitive.test.js`: erkennt Datendateien und Token, lässt saubere Dateien durch.
- `test/krypto.test.js`: Schlüssel sichern und wiederherstellen (1.5.0). `test/storage.test.js` prüft zusätzlich, dass mit
  Verschlüsselung kein Klartext auf der Platte landet und Klartext aus älteren Versionen umgestellt wird.
- `npm run lint`: ESLint mit Sicherheitsregeln, ohne Warnungen (CI und Release).
- Manuell vor jedem Release: Installer installieren, Notiz anlegen, Rückruf in 1 min, Benachrichtigung prüfen.

## 12. Erweiterungen in Version 1.1

### Hintergrundbetrieb (A-3)
- `Tray` mit `build/icon.png` (auf 16 px skaliert), Tooltip „Noteline", Klick → `zeigen()`,
  Kontextmenü *Noteline öffnen*, *Nach Updates suchen*, *Beenden*.
- `close` → `preventDefault()` + `hide()`, außer `beendet === true`. `minimize` → `hide()`.
- `beendet` wird gesetzt durch: Tray *Beenden*, `app.on('before-quit')` (auch durch `quitAndInstall`) und
  `win.on('session-end')` (Abmelden/Herunterfahren).
- Erstes Verstecken: Benachrichtigung „Noteline läuft im Hintergrund weiter", Merker `trayHinweis`.

### Titelleiste (A-1)
- `titleBarStyle: 'hidden'` + `titleBarOverlay` (Höhe 44 px, Farben passend zum Theme).
  Windows zeichnet Minimieren/Maximieren/Schließen selbst, Andocken (Snap) bleibt erhalten.
- Die obere Zeile ist `-webkit-app-region: drag`, Knöpfe sind `no-drag`. Rechter Abstand über
  `env(titlebar-area-width)`.

### Erscheinungsbild (A-2)
- Farben nur noch über CSS-Variablen, `:root[data-theme="light"]` überschreibt sie.
- `theme` = `dunkel | hell | system`. Der Hauptprozess wertet `nativeTheme.shouldUseDarkColors` aus, setzt
  Fensterhintergrund und Titelleisten-Farben und gibt das Ergebnis per Query-Parameter an die Seite
  (kein Aufblitzen beim Start). Änderungen von Windows kommen über `nativeTheme.on('updated')`.

### Breites Layout (L-1)
- `main` enthält `#colList` und `#colSide`. `matchMedia('(min-width: 760px)')` schaltet `S.breit`.
- Breit: `#colList` = Hotline, `#colSide` = Wissen oder die geöffnete Notiz. Schmal: wie bisher, Notiz als Blatt.
- Der Notiz-Editor ist eine Funktion (`notizHtml`), die je nach Modus in `#colSide` oder in das Blatt
  gerendert wird. Beim Moduswechsel wird eine offene Notiz umgehängt.
- `render()` zeichnet `#colSide` nur neu, wenn dort keine Notiz offen ist.
- Die Seite selbst scrollt nie (`overflow: clip` auf `html`, `body`, `#app`), Fokus wird mit `preventScroll` gesetzt.
  Grund (1.2.5): Fokus in ein Blatt, das noch von unten hereinfährt, hat die Seite um die Titelleistenhöhe verschoben.
  Blätter (`.backdrop`) beginnen unter der Titelleiste, damit sie nicht unter den Windows-Fensterknöpfen liegen.

### Schnellerfassung (H-1) und Ticket-Link (H-8)
- `logic.parseQuickInput` zieht zuerst Telefonnummer (`(+|0)` + mindestens 9 Ziffern, erlaubt: Leerzeichen,
  `/`, `-`, Klammern) und Ticket (`#123…` oder „Ticket 123…") heraus, dann folgt die Kunde-Regel.
- `logic.ticketUrl(vorlage, ticket)` liefert die URL oder `null`. `logic.pruefeTicketVorlage(v)` liefert eine
  Fehlermeldung oder `null`.

### Update-Hinweis und stilles Update (U-2, K-2)
- `update-downloaded` → Windows-Benachrichtigung, wenn `updateGemeldet !== version`. Klick → `zeigen()`.
- Jede Minute: Update bereit **und** Fenster versteckt **und** keine Notiz offen **und**
  `powerMonitor.getSystemIdleTime() >= 600` → `startVersteckt = true` speichern, `quitAndInstall(true, true)`.
  Beim nächsten Start mit `startVersteckt` bleibt das Fenster im Infobereich, der Merker wird gelöscht.

## 13. Wissen neu (Version 1.2)

- `logic.wissenTyp(wert)` → `telefon | email | link | ip | port | befehl`. Reihenfolge der Prüfung: Link, E-Mail,
  IPv4 (optional mit `/Maske` oder `:Port`), Port (1–65535), Telefon (+ oder 0, mindestens 6 Ziffern), sonst Befehl/Text.
- `logic.parseWissenEingabe(text)` → `{ titel, wert }`: erst `Name: Wert`, sonst erkannter Wert im Text
  (Link → E-Mail → IP → Telefon → Port am Ende), der Rest ist der Name.
- `logic.wissenAbschnitte(liste, suche)` liefert die Abschnitte in fester Reihenfolge, Favoriten zuerst.
- `logic.fillTemplate(wert, werte, { url: true })` kodiert eingesetzte Werte mit `encodeURIComponent`.
- `logic.notizAlsText(n)` für H-10.
- Kopieren läuft über IPC `kopieren` → `clipboard.writeText` im Hauptprozess. Die Zwischenablage-API des Renderers
  scheitert, wenn das Fenster keinen Fokus hat (z. B. bei Alt+1 direkt nach einem Fensterwechsel).
- Rückgängig (A-4): gelöschtes Objekt samt Position wird 6 s im Speicher gehalten. Der Toast bekommt einen Knopf.
- Alt+1–9 (W-5) wirken nur, solange Noteline den Fokus hat. Bewusst kein globales Kürzel, damit andere Programme
  ihre Alt-Kombinationen behalten.

## 14. Statusmonitor (Version 1.3)

- `src/main/status.js` – reines Node-Modul (testbar ohne Electron):
  - `ausTiLage(json)`, `ausStatuspage(json)`, `ausErreichbarkeit(httpStatus | fehler)` → einheitliches Ergebnis
    `{ zustand: ok | wartung | stoerung | ausfall | unbekannt, meldungen: [{ schluessel, titel, text, seit, zustand }] }`.
  - `aenderungen(alt, neu)` → Liste der Benachrichtigungen (neu, schlimmer, behoben). `unbekannt` löst nichts aus.
  - `pruefeQuelle(quelle, fetch)` mit Zeitlimit 15 s, `erkenneArt(url, fetch)` für eigene Quellen.
  - `klartext(html)` entfernt HTML aus Quelltexten (`<br>` → Zeilenumbruch).
- Hauptprozess: Abruf mit `fetch` im Hauptprozess (kein CORS, keine Lockerung der CSP). Zeitplan per `setInterval`,
  neu gesetzt bei Änderung der Einstellungen. Letztes Ergebnis in `einstellungen.json` (`statusLetzter`), damit nach
  einem Neustart nur echte Änderungen gemeldet werden.
- Einstellungen: `status: { aktiv, intervall, quellen: [{ id, name, art: ti | statuspage | erreichbar, url, aktiv }] }`,
  Vorlagen TI-Lagebild und Doctolib vorbelegt, aber nicht angehakt.
- IPC: `statusDaten()`, `statusPruefen()`, `statusEinstellungen(patch)`, `statusQuelleTesten(url)`, Event `status`
  und `statusOeffnen`.

## 15. Sicherheit (Version 1.5) – D-6, D-7, K-6

### Verschlüsselung (`krypto.js`, `storage.js`)
- `krypto.js` kapselt Electron `safeStorage`: `createKrypto(safeStorage)` liefert `{ verschluesseln(text) → Buffer,
  entschluesseln(Buffer) → text }` oder `null`, wenn `isEncryptionAvailable()` falsch ist.
- Dateiformat: `NOTELINE-ENC1\n` + Ausgabe von `safeStorage.encryptString` (Chromium-Format `v10`, AES-GCM, Schlüssel per DPAPI).
- `storage.js` bleibt ohne Electron testbar: `krypto` wird hineingereicht, Tests nutzen eine Attrappe.
  Mit `krypto` heißen die Dateien `daten.enc`, `einstellungen.enc`, `Backups/daten-JJJJ-MM-TT.enc`.
- Umstellung beim Start: Klartext lesen → verschlüsselt schreiben → zurücklesen und vergleichen → erst dann Klartext löschen.
  Defekte Klartext-Datei: Schutzmodus, nichts wird umgestellt.
- Schlüssel-Sicherung: Electron legt den DPAPI-geschützten AES-Schlüssel in `userData/Local State` (`os_crypt.encrypted_key`) ab.
  `krypto.schluesselSichern()` kopiert ihn nach `Dokumente\Noteline\schluessel.dpapi`, `krypto.schluesselWiederherstellen()`
  schreibt ihn **vor** `app.whenReady()` zurück, wenn er in `Local State` fehlt. Geprüft am 10.11.2026: nach Löschen von
  `userData` und Wiederherstellen ist die Datei wieder lesbar.

### Prüfwert und Neustart (1.5.2)
- `createStorage` prüft vor allem anderen `schluessel`: `'ok' | 'neu' | 'falsch' | 'aus'` (Prüfwert `pruefung.enc`, sonst
  vorhandene `.enc`-Dateien). Bei `'falsch'`: `gesperrt`, keine Umstellung, kein Backup, Einstellungen nur im Speicher.
- `main.js`: bei `'falsch'` ohne `--noteline-neustart` → `app.relaunch()` mit dem Schalter, `app.exit(0)`. Mit dem Schalter
  ruft der Start vor `whenReady` `schluesselErzwingen()` auf: weicht `Local State` von `schluessel.dpapi` ab, gilt die Sicherung.
- Ursache der falschen Schlüssel ist nicht abschließend geklärt (beobachtet beim ersten Start nach einem Update, nicht bei
  späteren Starts). Die Absicherung greift unabhängig davon.

### Härtung
- **Fuses** über `build.electronFuses` in `package.json` (electron-builder setzt sie beim Paketieren).
  `grantFileProtocolExtraPrivileges` bleibt `true`, sonst lädt `loadFile()` nichts aus der `app.asar` (K-7, 1.5.1).
  `test/build.test.js` sichert das ab. Fuses immer am gepackten Programm prüfen, nicht an einem entpackten Ordner.
- **IPC:** `ipcEinrichten()` registriert alle Kanäle über `handle()`/`on()`, die `event.senderFrame` prüfen: Absender muss das
  Hauptfenster sein und `file://…/renderer/index.html` geladen haben, sonst wird die Anfrage verworfen.
- **Rechte:** `session.setPermissionRequestHandler` und `setPermissionCheckHandler` lehnen alles ab.
- **Statusmonitor:** `Content-Length` > 2 MB oder längerer Text → Fehler „Antwort zu groß“.
- **Lint:** ESLint 9 (Flat Config) mit `@eslint/js` recommended und `eslint-plugin-security`; `npm run lint` in CI und `release.js`.
