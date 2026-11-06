# Noteline – Spezifikation

Beschreibt **was** Noteline kann und **warum**. Das Wie steht in `plan.md`.
Die Kennungen (z. B. `H-3`) werden in `tasks.md`, im Code und in den Tests referenziert.

Stand: Version 1.0 (Neuaufbau aus dem Prototyp „Hotline-Notizen", 05.11.2026)

---

## 1. Ausgangslage

Pascal notiert während Hotline-Anrufen bisher in einer Notepad++-Datei. Probleme damit:

- Notizen verschiedener Anrufe gehen ineinander über, nichts ist erkennbar „offen" oder „erledigt".
- Rückrufe werden vergessen, weil nichts erinnert.
- Oft gebrauchte Werte (Ports, IPs, Links) liegen verstreut und müssen gesucht und markiert werden.

## 2. Nutzer und Umgebung

- Ein Nutzer, ein Windows-11-Laptop, meist mit zweitem Bildschirm. Die App läuft den ganzen Arbeitstag
  neben dem Ticketsystem.
- Während eines Anrufs hat Pascal die Hände an der Tastatur und wenig Aufmerksamkeit übrig.

---

## 3. User Stories und Akzeptanzkriterien

### Bereich Hotline (Anrufnotizen)

**H-1 Schnell erfassen.** Als Hotline-Mitarbeiter will ich eine Notiz anlegen, ohne die Maus zu benutzen,
damit ich beim Anruf nichts verpasse.
- [ ] Nach dem Start hat das Eingabefeld oben den Fokus.
- [ ] Text eingeben und Enter drücken legt eine Notiz an und öffnet sie zum Weiterschreiben.
- [ ] Format `Kunde: Stichpunkt` füllt das Feld *Kunde* mit dem Teil vor dem ersten Doppelpunkt, sofern dieser
      Teil 1–59 Zeichen lang ist und kein `://` direkt dahinter folgt (Links sind kein Kundenname).
- [ ] Strg+N legt von überall eine leere Notiz an. Der Cursor steht im Feld *Kunde*.
- [ ] Eine Notiz, die beim Schließen komplett leer ist, wird verworfen.

**H-2 Notiz bearbeiten.** Eine Notiz hat die Felder Kunde, Ticket, Telefon und Freitext.
- [ ] Jede Änderung wird automatisch gespeichert (spätestens 0,25 s nach der letzten Eingabe).
- [ ] Die Notiz zeigt, wann sie angelegt und zuletzt geändert wurde.
- [ ] Fertig, Esc oder ein Klick neben die Notiz schließen sie.

**H-3 Status und Priorität.**
- [ ] Status: *Offen* (Standard), *Wartet*, *Erledigt*. Priorität: *Hoch*, *Normal* (Standard), *Niedrig*.
- [ ] Eine Zeile in der Liste lässt sich mit einem Klick auf erledigt bzw. wieder auf offen setzen.

**H-4 Übersicht.** Die Liste ist in Spuren gegliedert:
- [ ] *Jetzt*: nicht erledigt **und** (Priorität hoch **oder** Rückruf heute oder überfällig). Nur sichtbar,
      wenn sie Einträge hat. Sortiert nach Rückrufzeit, dann Priorität.
- [ ] *Offen* und *Wartet*: übrige Notizen dieses Status, sortiert nach Priorität, dann neueste Änderung.
- [ ] *Erledigt*: neueste Änderung zuerst, standardmäßig eingeklappt.
- [ ] Ein- und Ausklappen der Spuren bleibt nach einem Neustart erhalten.
- [ ] Jede Zeile zeigt Kunde, Ticket, die erste Zeile Freitext und rechts Datum oder Rückrufzeit.

**H-5 Suchen.** Text im Eingabefeld filtert sofort über Kunde, Ticket, Telefon und Freitext, ohne
Groß-/Kleinschreibung. Während der Suche sind alle Spuren aufgeklappt. Esc leert die Suche.

**H-6 Rückruf-Erinnerung.**
- [ ] Eine Notiz kann einen Rückrufzeitpunkt haben. Schnellwahl: *+1 Std.*, *Morgen 9:00*, freie Eingabe.
- [ ] Zum fälligen Zeitpunkt (Prüfung mindestens alle 30 s) erscheint eine Windows-Benachrichtigung mit
      Kunde, Telefon und erster Zeile. Ein Klick darauf öffnet die Notiz.
- [ ] Ist das Fenster nicht aktiv, blinkt zusätzlich das Taskleistensymbol.
- [ ] Pro Rückrufzeitpunkt wird genau einmal erinnert. Ein neuer Zeitpunkt löst erneut aus.
- [ ] Der Reiter *Hotline* zeigt die Zahl der heute fälligen und überfälligen Rückrufe als Badge.

**H-7 Löschen.** Löschen braucht einen zweiten Klick innerhalb von 3 s („Wirklich löschen?").

### Bereich Wissen (Nachschlagewerte)

**W-1 Einträge.** Ein Eintrag hat Gruppe, Bezeichnung und Wert. Einträge erscheinen nach Gruppe sortiert.
- [ ] Ein Klick auf die Zeile kopiert den Wert. Die Zeile zeigt kurz „Kopiert".
- [ ] Ist der Wert ein `http(s)`-Link, gibt es zusätzlich *Im Browser öffnen*.
- [ ] Anlegen, bearbeiten und löschen (mit zweitem Klick zur Bestätigung) direkt in der Liste.
- [ ] **Ein angefangenes Formular verliert nie Eingaben**, auch nicht durch Erinnerungen, Uhrzeit-Aktualisierung
      oder Kopiervorgänge im Hintergrund.

**W-2 Vorlagen mit Platzhaltern.** Enthält ein Wert `<NAME>`, wird der Eintrag zum Generator.
- [ ] Für jeden **unterschiedlichen** Platzhalter gibt es ein Eingabefeld. Gleichnamige Platzhalter werden
      gemeinsam ersetzt.
- [ ] Die Vorschau zeigt den fertigen Wert. Leere Felder zeigen weiter `<NAME>`.
- [ ] Sonderzeichen in der Eingabe (z. B. `$`, `&`) werden wörtlich übernommen.
- [ ] Die zuletzt eingegebenen Werte bleiben gespeichert.

**W-3 Suchen.** Das Eingabefeld filtert im Bereich Wissen über Gruppe, Bezeichnung und Wert.

### Bedienung allgemein

**A-1 Fenster.**
- [ ] Erster Start: Breite ein Viertel des Hauptbildschirms (mindestens 440 px), volle Höhe, rechter Rand.
- [ ] Position und Größe werden gemerkt. Liegt die gespeicherte Position auf keinem Bildschirm mehr,
      gilt die Standardposition.
- [ ] *Immer im Vordergrund* ist umschaltbar und wird gemerkt.
- [ ] Strg+Alt+H holt das Fenster aus jeder Anwendung nach vorne.
- [ ] Nur eine Instanz läuft. Ein zweiter Start holt das vorhandene Fenster nach vorne.
- [ ] Wird eine Datei ins Fenster gezogen, passiert nichts (die App wird nicht durch die Datei ersetzt).

**A-2 Einstellungen und Info.** Ein Zahnrad öffnet ein Panel mit:
- [ ] installierter Version
- [ ] Update-Status und Knopf *Nach Updates suchen* (siehe U-2)
- [ ] Schalter *Mit Windows starten*
- [ ] Knopf *Datenordner öffnen*

### Installation und Updates

**U-1 Installation.** Ein Installer `Noteline-Setup-<version>.exe` installiert pro Benutzer ohne
Adminrechte, legt Startmenü- und Desktop-Verknüpfung an und lässt sich über Windows deinstallieren.
Deinstallieren löscht **keine** Daten.

**U-2 Updates.**
- [ ] 10 s nach dem Start und danach **jede Stunde** prüft die App auf eine neuere Version auf GitHub.
- [ ] Gibt es eine, wird sie im Hintergrund heruntergeladen.
- [ ] Danach erscheint ein Hinweis „Update x.y.z bereit" mit dem Knopf *Jetzt neu starten*.
- [ ] Wird nicht neu gestartet, installiert sich das Update automatisch beim nächsten Beenden.
- [ ] Ein Neustart ohne Pascals Klick passiert nie (siehe Constitution 5).
- [ ] *Nach Updates suchen* zeigt den Ergebnisstatus: *Wird gesucht …*, *Aktuell*, *Wird geladen (x %)*,
      *Bereit*, *Fehler: …*.
- [ ] Ohne Internet oder bei GitHub-Fehlern läuft die App normal weiter. Der Fehler steht nur im Panel.
- [ ] Vor dem Neustart für ein Update werden alle Daten gespeichert.

### Daten und Sicherheit

**D-1 Speicherort.** Daten liegen in `Dokumente\Noteline\daten.json`, Fenstereinstellungen in
`fenster.json`. Gibt es beim ersten Start noch `Dokumente\Hotline-Notizen\daten.json` (Prototyp),
wird sie einmalig übernommen. Das Original bleibt liegen.

**D-2 Backups.** Mindestens einmal pro Kalendertag, an dem die App läuft, entsteht
`Backups\daten-JJJJ-MM-TT.json`, auch wenn die App über Mitternacht offen bleibt. Es werden die letzten
30 Backups behalten.

**D-3 Schutzmodus.** Ist `daten.json` vorhanden, aber nicht lesbar oder kein gültiges Noteline-Format:
- [ ] Die App zeigt einen roten Hinweis mit Weg zum Datenordner und Backup-Ordner.
- [ ] Sie speichert **nichts**, bis die Datei repariert und die App neu gestartet ist.
- [ ] Eine Kopie der defekten Datei wird als `daten-defekt-<Zeitstempel>.json` abgelegt.

**D-4 Kein Datenverlust beim Beenden.** Beim Schließen des Fensters, beim Beenden und vor einem
Update-Neustart wird der aktuelle Stand synchron geschrieben.

**D-5 Fehlerhafte Einträge.** Fehlt einer Notiz ein Feld (z. B. aus älteren Dateien), ergänzt die App
Standardwerte, statt abzustürzen.

---

## 4. Nicht-Ziele (Version 1)

- Mehrere Benutzer, Synchronisation, Cloud, Mobil-Version
- Formatierter Text, Bilder oder Anhänge in Notizen
- macOS oder Linux
- Code-Signatur (der Installer ist unsigniert, SmartScreen-Hinweis beim ersten Installieren ist akzeptiert)

## 5. Offene Punkte / Backlog

- **B-1 Import aus Notepad++**: bestehende Textdatei einlesen und in Notizen aufteilen. Trennregel klären.
- **B-2 Export** einer Notiz als Text für das Ticketsystem (Format wie Skill „Ticket schreiben").

## 6. Entscheidungen (Clarify)

- **K-1 Update-Quelle (06.11.2026):** Ein **öffentliches** Repo `pascatotalx/noteline` enthält Code,
  Specs und Releases. Die App braucht deshalb keinen Token. Daraus folgen die Anforderungen R-1 bis R-3.
- **K-2 Update-Zeitpunkt:** Automatisch geladen, installiert per Klick auf *Jetzt neu starten* oder beim
  nächsten Beenden. Kein Zwangsneustart während eines Anrufs.

## 7. Öffentliches Repository

**R-1 Keine sensiblen Daten im Repo (höchste Priorität).** Gilt auch, wenn die App weitergegeben wird
und andere Personen Daten eintragen.
- [ ] Die App speichert Nutzerdaten ausschließlich im Dokumente-Ordner des Benutzers, nie im
      Programm- oder Projektordner.
- [ ] Die App lädt keine Nutzerdaten hoch. Der einzige Netzwerkzugriff ist der lesende Update-Abruf.
- [ ] Der Installer enthält keine Daten. Ein neuer Benutzer startet mit leerer App.
- [ ] `.gitignore` schließt Datendateien, Backups, Build-Ausgaben, `.env` und Logs aus.
- [ ] Ein Git-Hook blockiert Commits mit Datendateien (`daten*.json`, `fenster.json`, `Backups/`) oder
      Zugangsdaten (Token-Muster, privaten Schlüsseln).
- [ ] Ein GitHub-Workflow prüft jeden Push zusätzlich auf Zugangsdaten und Datendateien.
- [ ] Testdaten sind ausgedacht (keine echten Kunden, Telefonnummern, Tickets, internen IPs).
- [ ] Der GitHub-Token zum Veröffentlichen wird nur zur Laufzeit aus `gh auth token` gelesen und nie
      in eine Datei geschrieben.
- [ ] Commits verwenden die GitHub-noreply-Adresse statt einer privaten E-Mail-Adresse.

**R-2 Gepflegter Auftritt.**
- [ ] README mit Kurzbeschreibung, Screenshot, Installation, Funktionen, Tastenkürzeln, Datenschutz und
      Entwicklung.
- [ ] `LICENSE` (MIT), `CHANGELOG.md` im Format „Keep a Changelog", `SECURITY.md`.
- [ ] Repo-Beschreibung und Topics sind gesetzt.
- [ ] Commits sind klein und aussagekräftig (Conventional Commits, z. B. `feat:`, `fix:`, `docs:`).

**R-3 Releases.**
- [ ] Jede Version ist ein GitHub-Release mit Tag `vX.Y.Z`, Titel `Noteline X.Y.Z` und deutschen
      Release-Notes aus `CHANGELOG.md`.
- [ ] Assets: `Noteline-Setup-X.Y.Z.exe`, `.blockmap` und `latest.yml` (für den Updater).
- [ ] Ein Release wird erst veröffentlicht, wenn alle Dateien hochgeladen sind (kein halbfertiges „Latest").
