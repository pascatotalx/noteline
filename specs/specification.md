# Noteline – Spezifikation

Beschreibt **was** Noteline kann und **warum**. Das Wie steht in `plan.md`.
Die Kennungen (z. B. `H-3`) werden in `tasks.md`, im Code und in den Tests referenziert.

Stand: Version 1.1.0 (06.11.2026). `[x]` = umgesetzt und getestet, `[ ]` = offen oder nur manuell prüfbar (T-16).

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
- **Typische Anordnung:** Ticketsystem links, Web-Telefonie rechts oben, Noteline rechts unten in einem
  **breiten, niedrigen** Fenster (etwa 850 × 540 px). Rufnummern stehen in der Telefonie, Ticketnummern im
  Ticketsystem. Noteline läuft den ganzen Tag und soll nie versehentlich geschlossen werden.

---

## 3. User Stories und Akzeptanzkriterien

### Bereich Hotline (Anrufnotizen)

**H-1 Schnell erfassen.** Als Hotline-Mitarbeiter will ich eine Notiz anlegen, ohne die Maus zu benutzen,
damit ich beim Anruf nichts verpasse.
- [x] Nach dem Start hat das Eingabefeld oben den Fokus.
- [x] Text eingeben und Enter drücken legt eine Notiz an und öffnet sie zum Weiterschreiben.
- [x] Format `Kunde: Stichpunkt` füllt das Feld *Kunde* mit dem Teil vor dem ersten Doppelpunkt, sofern dieser
      Teil 1–59 Zeichen lang ist und kein `://` direkt dahinter folgt (Links sind kein Kundenname).
- [x] Eine **Telefonnummer** in der Eingabe (mindestens 9 Ziffern, z. B. `+49 711 1234567` oder
      `0711/1234567`) landet im Feld *Telefon* statt im Text.
- [x] Eine **Ticketnummer** mit `#` (z. B. `#0012345`) oder nach dem Wort „Ticket" landet im Feld *Ticket*.
- [x] Beides lässt sich mit `Kunde: Stichpunkt` kombinieren, die Reihenfolge ist egal.
- [x] Strg+N legt von überall eine leere Notiz an. Der Cursor steht im Feld *Kunde*.
- [x] Eine Notiz, die beim Schließen komplett leer ist, wird verworfen.

**H-2 Notiz bearbeiten.** Eine Notiz hat die Felder Kunde, Ticket, Telefon und Freitext.
- [x] Jede Änderung wird automatisch gespeichert (spätestens 0,25 s nach der letzten Eingabe).
- [x] Die Notiz zeigt, wann sie angelegt und zuletzt geändert wurde.
- [x] Fertig, Esc oder ein Klick neben die Notiz schließen sie.

**H-3 Status und Priorität.**
- [x] Status: *Offen* (Standard), *Wartet*, *Erledigt*. Priorität: *Hoch*, *Normal* (Standard), *Niedrig*.
- [x] Eine Zeile in der Liste lässt sich mit einem Klick auf erledigt bzw. wieder auf offen setzen.

**H-4 Übersicht.** Die Liste ist in Spuren gegliedert:
- [x] *Jetzt*: nicht erledigt **und** (Priorität hoch **oder** Rückruf heute oder überfällig).
      Sortiert nach Rückrufzeit, dann Priorität.
- [x] Leere Spuren werden ausgeblendet. Gibt es gar keine Notizen, erscheint ein Hinweis zur Bedienung.
- [x] *Offen* und *Wartet*: übrige Notizen dieses Status, sortiert nach Priorität, dann neueste Änderung.
- [x] *Erledigt*: neueste Änderung zuerst, standardmäßig eingeklappt.
- [x] Ein- und Ausklappen der Spuren bleibt nach einem Neustart erhalten.
- [x] Jede Zeile zeigt Kunde, Ticket, die erste Zeile Freitext und rechts Datum oder Rückrufzeit.

**H-5 Suchen.** Text im Eingabefeld filtert sofort über Kunde, Ticket, Telefon und Freitext, ohne
Groß-/Kleinschreibung. Während der Suche sind alle Spuren aufgeklappt. Esc leert die Suche.

**H-6 Rückruf-Erinnerung.**
- [x] Eine Notiz kann einen Rückrufzeitpunkt haben. Schnellwahl: *+1 Std.*, *Morgen 9:00*, freie Eingabe.
- [ ] Zum fälligen Zeitpunkt (Prüfung mindestens alle 30 s) erscheint eine Windows-Benachrichtigung mit
      Kunde, Telefon und erster Zeile. Ein Klick darauf öffnet die Notiz.
- [ ] Die Rückruf-Benachrichtigung bleibt unten rechts stehen, bis sie angeklickt oder geschlossen wird, und
      kommt mit dem Windows-Benachrichtigungston (außer bei „Nicht stören“). Sie erscheint auch, wenn Noteline
      im Infobereich versteckt ist.
- [x] Ist das Fenster nicht aktiv, blinkt zusätzlich das Taskleistensymbol.
- [x] Pro Rückrufzeitpunkt wird genau einmal erinnert. Ein neuer Zeitpunkt löst erneut aus.
- [x] Der Reiter *Hotline* zeigt die Zahl der heute fälligen und überfälligen Rückrufe als Badge.

**H-7 Löschen.** Löschen braucht einen zweiten Klick innerhalb von 3 s („Wirklich löschen?").

**H-8 Ticket im Ticketsystem öffnen.**
- [x] In den Einstellungen lässt sich eine Link-Vorlage mit `<TICKET>` hinterlegen,
      z. B. `https://support.example.org/tickets?id=<TICKET>`. Sie wird nur lokal gespeichert.
- [x] Ist eine Vorlage gesetzt, öffnet ein Knopf am Ticketfeld der Notiz und in der Listenzeile das Ticket im
      Standardbrowser. `#` und Leerzeichen werden entfernt, die Nummer wird URL-sicher eingesetzt.
- [x] Ungültige Vorlagen (kein `http(s)://` oder kein `<TICKET>`) werden mit Hinweis abgelehnt.

### Bereich Wissen (Nachschlagewerte)

**W-1 Einträge.** Ein Eintrag hat Gruppe, Bezeichnung und Wert. Einträge erscheinen nach Gruppe sortiert.
- [x] Ein Klick auf die Zeile kopiert den Wert. Die Zeile zeigt kurz „Kopiert".
- [x] Ist der Wert ein `http(s)`-Link, gibt es zusätzlich *Im Browser öffnen*.
- [x] Anlegen, bearbeiten und löschen (mit zweitem Klick zur Bestätigung) direkt in der Liste.
- [x] **Ein angefangenes Formular verliert nie Eingaben**, auch nicht durch Erinnerungen, Uhrzeit-Aktualisierung
      oder Kopiervorgänge im Hintergrund.

**W-2 Vorlagen mit Platzhaltern.** Enthält ein Wert `<NAME>`, wird der Eintrag zum Generator.
- [x] Für jeden **unterschiedlichen** Platzhalter gibt es ein Eingabefeld. Gleichnamige Platzhalter werden
      gemeinsam ersetzt.
- [x] Die Vorschau zeigt den fertigen Wert. Leere Felder zeigen weiter `<NAME>`.
- [x] Sonderzeichen in der Eingabe (z. B. `$`, `&`) werden wörtlich übernommen.
- [x] Die zuletzt eingegebenen Werte bleiben gespeichert.

**W-3 Suchen.** Das Eingabefeld filtert im Bereich Wissen über Gruppe, Bezeichnung und Wert.

### Bedienung allgemein

**L-1 Breites Layout.** Ab 760 px Fensterbreite nutzt Noteline zwei Spalten.
- [x] Links steht die Hotline-Liste, rechts der Bereich Wissen. Die Reiter unten entfallen.
- [x] Eine geöffnete Notiz erscheint rechts in voller Höhe statt als Blatt von unten. Die Liste bleibt sichtbar,
      die geöffnete Notiz ist dort markiert.
- [x] Das Eingabefeld sucht in beiden Spalten gleichzeitig. Enter legt weiterhin eine Notiz an.
- [ ] Wird das Fenster schmaler, wechselt Noteline ohne Datenverlust in die einspaltige Ansicht.

**A-1 Fenster.**
- [x] Erster Start: Breite ein Viertel des Hauptbildschirms (mindestens 440 px), volle Höhe, rechter Rand.
- [ ] Eigene, flache Titelleiste: Logo, Name und Knöpfe teilen sich eine Zeile mit den Fensterknöpfen von
      Windows. Die Zeile dient zum Verschieben des Fensters.
- [x] Position und Größe werden gemerkt. Liegt die gespeicherte Position auf keinem Bildschirm mehr,
      gilt die Standardposition.
- [x] *Immer im Vordergrund* ist umschaltbar und wird gemerkt.
- [ ] Strg+Alt+H holt das Fenster aus jeder Anwendung nach vorne.
- [x] Nur eine Instanz läuft. Ein zweiter Start holt das vorhandene Fenster nach vorne.
- [x] Wird eine Datei ins Fenster gezogen, passiert nichts (die App wird nicht durch die Datei ersetzt).

**A-2 Einstellungen und Info.** Ein Zahnrad öffnet ein Panel mit:
- [x] installierter Version
- [x] Update-Status und Knopf *Nach Updates suchen* (siehe U-2)
- [x] Erscheinungsbild *Dunkel*, *Hell* oder *Wie Windows*. Gilt sofort, auch für die Titelleiste, und wird gemerkt.
- [ ] Schalter *Uhr anzeigen* (Standard: aus, die Taskleiste zeigt die Uhrzeit bereits)
- [x] Feld *Ticket-Link* (siehe H-8)
- [x] Schalter *Mit Windows starten* und *Immer im Vordergrund*
- [x] Speicherort als anklickbarer Pfad (`Dokumente\Noteline`), der den Ordner im Explorer öffnet.
      Kein eigener Backup-Knopf.

**A-3 Läuft im Hintergrund.** Noteline wird nicht versehentlich beendet.
- [x] Das Schließen-Kreuz und das Minimieren verstecken das Fenster. Noteline läuft im Infobereich der
      Taskleiste (unten rechts) weiter, Erinnerungen und Updates funktionieren weiter.
- [ ] Beim ersten Verstecken erklärt eine Windows-Benachrichtigung, wo Noteline weiterläuft.
- [ ] Ein Klick auf das Symbol im Infobereich zeigt das Fenster. Rechtsklick bietet *Noteline öffnen*,
      *Nach Updates suchen* und *Beenden*.
- [ ] Beenden ist nur über das Symbol im Infobereich möglich, außerdem beim Abmelden oder Herunterfahren von Windows.
- [ ] Strg+Alt+H und ein erneuter Start über die Verknüpfung holen das versteckte Fenster nach vorne.

### Installation und Updates

**U-1 Installation.** Ein Installer `Noteline-Setup-<version>.exe` installiert pro Benutzer ohne
Adminrechte, legt Startmenü- und Desktop-Verknüpfung an und lässt sich über Windows deinstallieren.
Deinstallieren löscht **keine** Daten.

**U-2 Updates.**
- [ ] 10 s nach dem Start und danach **jede Stunde** prüft die App auf eine neuere Version auf GitHub.
- [ ] Gibt es eine, wird sie im Hintergrund heruntergeladen.
- [ ] Danach erscheint ein Hinweis „Update x.y.z bereit" mit dem Knopf *Jetzt neu starten*.
- [ ] Zusätzlich kommt **einmal pro Version** eine Windows-Benachrichtigung. Ein Klick darauf zeigt Noteline.
- [ ] Ohne Klick installiert sich das Update beim Beenden oder **still im Ruhezustand**: Fenster ist im
      Infobereich versteckt, keine Notiz offen und Windows seit mindestens 10 Minuten ohne Eingabe.
      Danach startet Noteline wieder versteckt im Infobereich (siehe K-2).
- [ ] Ein Neustart, während Pascal mit Noteline arbeitet, passiert nie (siehe Constitution 5).
- [ ] *Nach Updates suchen* zeigt den Ergebnisstatus: *Wird gesucht …*, *Aktuell*, *Wird geladen (x %)*,
      *Bereit*, *Fehler: …*.
- [ ] Ohne Internet oder bei GitHub-Fehlern läuft die App normal weiter. Der Fehler steht nur im Panel.
- [ ] Vor dem Neustart für ein Update werden alle Daten gespeichert.

### Daten und Sicherheit

**D-1 Speicherort.** Daten liegen in `Dokumente\Noteline\daten.json`, Einstellungen (Fenster,
Erscheinungsbild, Ticket-Link) in `einstellungen.json`. Eine vorhandene `fenster.json` aus Version 1.0 wird
übernommen. Gibt es beim ersten Start noch `Dokumente\Hotline-Notizen\daten.json` (Prototyp),
wird sie einmalig übernommen. Das Original bleibt liegen.

**D-2 Backups.** Ohne eigenen Knopf in der Oberfläche: Mindestens einmal pro Kalendertag, an dem die App läuft, entsteht
`Backups\daten-JJJJ-MM-TT.json`, auch wenn die App über Mitternacht offen bleibt. Es werden die letzten
30 Backups behalten.

**D-3 Schutzmodus.** Ist `daten.json` vorhanden, aber nicht lesbar oder kein gültiges Noteline-Format:
- [x] Die App zeigt einen roten Hinweis mit Knopf zum Datenordner (Backups liegen im Unterordner `Backups`).
- [x] Sie speichert **nichts**, bis die Datei repariert und die App neu gestartet ist.
- [x] Eine Kopie der defekten Datei wird als `daten-defekt-<Zeitstempel>.json` abgelegt.

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
- **B-3 Feld Ansprechpartner** (06.11.2026): Notizen bekommen ein Feld *Ansprechpartner*, also mit wem telefoniert
  wurde bzw. wer beim Kunden zuständig ist. Es soll in der Liste sichtbar und durchsuchbar sein. Wunsch von Pascal, noch nicht eingeplant.
- **B-4 Neues Logo** (06.11.2026): Pascal liefert Logo-Dateien. Einbauen als App-Icon, Symbol im Infobereich, Titelleiste und README.

## 6. Entscheidungen (Clarify)

- **K-1 Update-Quelle (06.11.2026):** Ein **öffentliches** Repo `pascatotalx/noteline` enthält Code,
  Specs und Releases. Die App braucht deshalb keinen Token. Daraus folgen die Anforderungen R-1 bis R-3.
- **K-2 Update-Zeitpunkt:** Automatisch geladen, installiert per Klick auf *Jetzt neu starten* oder beim
  nächsten Beenden. Kein Zwangsneustart während eines Anrufs.
  *Ergänzt am 06.11.2026:* Weil Noteline dauerhaft im Infobereich läuft (A-3), käme ein „nächstes Beenden"
  kaum vor. Deshalb installiert es sich zusätzlich still, wenn Noteline versteckt ist und Windows seit
  10 Minuten ohne Eingabe ist.
- **K-3 Backups (06.11.2026):** Pascal braucht keinen Backup-Knopf, nur den Datenordner. Die täglichen
  Sicherungen laufen unsichtbar weiter, weil sie nichts kosten und vor Datenverlust schützen.

## 7. Öffentliches Repository

**R-1 Keine sensiblen Daten im Repo (höchste Priorität).** Gilt auch, wenn die App weitergegeben wird
und andere Personen Daten eintragen.
- [x] Die App speichert Nutzerdaten ausschließlich im Dokumente-Ordner des Benutzers, nie im
      Programm- oder Projektordner.
- [x] Die App lädt keine Nutzerdaten hoch. Der einzige Netzwerkzugriff ist der lesende Update-Abruf.
- [x] Der Installer enthält keine Daten. Ein neuer Benutzer startet mit leerer App.
- [x] `.gitignore` schließt Datendateien, Backups, Build-Ausgaben, `.env` und Logs aus.
- [x] Ein Git-Hook blockiert Commits mit Datendateien (`daten*.json`, `fenster.json`, `einstellungen.json`, `Backups/`) oder
      Zugangsdaten (Token-Muster, privaten Schlüsseln).
- [x] Ein GitHub-Workflow prüft jeden Push zusätzlich auf Zugangsdaten und Datendateien.
- [x] Testdaten sind ausgedacht (keine echten Kunden, Telefonnummern, Tickets, internen IPs).
- [x] Veröffentlicht wird über die Anmeldung von `gh`. Kein Token in Dateien, Skripten oder Umgebungsvariablen.
- [x] Commits verwenden die GitHub-noreply-Adresse statt einer privaten E-Mail-Adresse.

**R-2 Gepflegter Auftritt.**
- [x] README mit Kurzbeschreibung, Screenshot, Installation, Funktionen, Tastenkürzeln, Datenschutz und
      Entwicklung.
- [x] `LICENSE` (MIT), `CHANGELOG.md` im Format „Keep a Changelog", `SECURITY.md`.
- [x] Repo-Beschreibung und Topics sind gesetzt.
- [x] Commits sind klein und aussagekräftig (Conventional Commits, z. B. `feat:`, `fix:`, `docs:`).

**R-3 Releases.**
- [x] Jede Version ist ein GitHub-Release mit Tag `vX.Y.Z`, Titel `Noteline X.Y.Z` und deutschen
      Release-Notes aus `CHANGELOG.md`.
- [x] Assets: `Noteline-Setup-X.Y.Z.exe`, `.blockmap` und `latest.yml` (für den Updater).
- [x] Ein Release wird erst veröffentlicht, wenn alle Dateien hochgeladen sind (kein halbfertiges „Latest").
