# Noteline – Constitution

Feste Projektregeln. Sie gelten für jede Änderung, egal ob sie ein Mensch oder eine KI macht.
Wer eine Regel ändern will, ändert zuerst dieses Dokument und begründet es im Commit.

## 1. Zweck

Noteline ist ein persönliches Werkzeug für **eine Person** im Hotline- und IT-Support
auf **einem Windows-Laptop**. Die App ersetzt ein Notepad++-Dokument und hat zwei Aufgaben:

1. **Hotline**: während eines Anrufs in Sekunden Stichpunkte erfassen und später wiederfinden.
2. **Wissen**: oft gebrauchte Werte (Ports, IPs, Links, Befehle) mit einem Klick kopieren.

Bei jeder Entscheidung gilt: **Tempo beim Erfassen schlägt Funktionsumfang.**

## 2. Datenschutz (nicht verhandelbar)

- Notizen enthalten Kundendaten (Namen, Telefonnummern, Tickets). Sie liegen **ausschließlich lokal**
  unter `Dokumente\Noteline\` und **verschlüsselt** (ab 1.5.0, Spezifikation D-6). Klartext-Kopien entstehen nicht.
- Kein Netzwerkverkehr außer der Update-Prüfung bei GitHub und – nur wenn eingeschaltet – den **lesenden Abrufen der
  im Statusmonitor eingestellten öffentlichen Statusseiten** (ab 1.3.0). Dabei werden nie Notizen, Wissen oder andere
  eigene Daten gesendet. Keine Telemetrie, keine Cloud-Synchronisation, keine externen Schriften oder CDNs zur Laufzeit.
- Optionale Funktionen für bestimmte Arbeitsumfelder (z. B. TI im Gesundheitswesen) sind standardmäßig aus.
- Das Repository ist **öffentlich**. Datendateien, Backups, Zugangsdaten und Testdaten mit echten
  Inhalten (Kunden, Telefonnummern, Tickets, interne IPs) kommen **nie** hinein. Das gilt auch für Daten
  anderer Personen, falls die App weitergegeben wird. Abgesichert durch `.gitignore`, einen Commit-Hook
  und eine Prüfung in GitHub Actions (siehe Spezifikation R-1).
- Beispiele in Oberfläche, Doku und Tests sind allgemein gehalten und verraten nichts über Kunden oder
  interne Systeme.
- Nichts Geladenes darf Daten unbemerkt überschreiben oder löschen. Kann eine Datei nicht gelesen werden,
  geht die App in einen Schutzmodus und speichert nicht.

## 3. Technik

| Bereich | Festlegung |
|---|---|
| Plattform | Electron (aktuelle stabile Hauptversion), nur Windows x64 |
| Sprache | JavaScript (ES2022), kein Build-Schritt für den Renderer, kein UI-Framework |
| Paketierung | electron-builder, NSIS-Installer pro Benutzer (keine Adminrechte) |
| Updates | electron-updater, Provider GitHub Releases |
| Tests | `node:test` (in Node eingebaut), keine weiteren Testframeworks |
| Speicher | eine JSON-Datei, verschlüsselt (DPAPI über `safeStorage`), atomar geschrieben, tägliche Backups |

Neue Abhängigkeiten zur Laufzeit nur mit Begründung in `plan.md`.

**Fremdbestandteile** (Bibliotheken, Schriften, Icons, Bilder) nur mit freier Lizenz, die Weitergabe und
kommerzielle Nutzung erlaubt (z. B. MIT, ISC, BSD, Apache-2.0, SIL OFL). Jeder Fremdbestandteil steht mit
Lizenz in `THIRD_PARTY_NOTICES.md`, die mit dem Installer ausgeliefert wird. Nichts aus Quellen mit unklarer
Herkunft oder Lizenz übernehmen.

## 4. Sicherheit

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Der Renderer spricht nur über die
  schmale `window.api`-Brücke aus `preload.js` mit dem Hauptprozess.
- Strikte Content-Security-Policy: keine Inline-Skripte, keine fremden Quellen.
- Jede Nutzereingabe wird vor dem Einfügen ins HTML escaped (`esc()`).
- Externe Links öffnen nur bei `http(s)://` im Standardbrowser. Navigation im App-Fenster ist gesperrt.
- Der Hauptprozess prüft bei jeder Anfrage den Absender. Browser-Rechte werden verweigert.
- Electron-Fuses: kein `RunAsNode`, keine `NODE_OPTIONS`, kein `--inspect`, nur `app.asar` mit Integritätsprüfung.
- Noteline öffnet keinen Netzwerk-Port und bietet keine Schnittstelle nach außen.
- Test-Schalter über Umgebungsvariablen gibt es nur in der Entwicklerversion.

## 5. Bedienung und Gestaltung

- Oberfläche auf **Deutsch**, Code-Bezeichner dürfen deutsch bleiben (bestehender Stil).
- Dunkles Theme, Schrift Space Grotesk (lokal eingebunden), Akzentfarben Lime/Cyan/Pink/Amber.
- Alles per Tastatur bedienbar: Strg+K Suche, Strg+N neue Notiz, Strg+1/2 Tabs, Esc schließt.
- Das Fenster ist schmal und sitzt standardmäßig am rechten Bildschirmrand.
- Updates dürfen **nie** mitten in der Arbeit neu starten, ohne dass Pascal das auslöst.
  Ausnahme: Installation beim normalen Beenden.

## 6. Arbeitsweise (Spec-Driven Development)

1. Jede Änderung beginnt in `specs/`: zuerst `specification.md` (Was/Warum), dann `plan.md` (Wie),
   dann `tasks.md` (Schritte).
2. Code folgt der Spec. Weicht der Code ab, wird entweder der Code oder die Spec korrigiert, nie stillschweigend.
3. Reine Logik (Parser, Zeitberechnung, Speicher) ist von DOM und Electron getrennt und hat Tests.
4. `npm test` muss vor jedem Commit grün sein.
5. Jedes Release erhöht die Version nach SemVer und wird in `CHANGELOG.md` beschrieben.
