# Changelog

Alle nennenswerten Änderungen an Noteline. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.2.0] – 2026-11-06

### Neu
- **Neues Logo „One Flow"** für Installer, Programm, Taskleiste, Infobereich und Titelleiste. Das Logo in der
  Titelleiste passt sich dem hellen und dunklen Erscheinungsbild an.
- **Feld Ansprechpartner** in jeder Notiz, direkt unter dem Kunden. Es erscheint in der Liste
  („Kunde · Ansprechpartner"), in der Rückruf-Benachrichtigung und wird durchsucht.
  Schnellerfassung: `Kunde / Ansprechpartner: Stichpunkt`.
- **Wissen komplett überarbeitet:** Ein Eintrag braucht nur noch eine Zeile, z. B. `Support-Hotline 0800 1234567`.
  Noteline erkennt Telefonnummer, E-Mail, Link, IP-Adresse, Port oder Befehl und sortiert selbst ein. Gruppen
  muss niemand mehr eintippen. Bestehende Einträge werden automatisch übernommen.
- **Favoriten** mit Stern stehen ganz oben und lassen sich mit **Alt+1 bis Alt+9** sofort kopieren.
- **Strg+Enter** in der Suche kopiert den besten Wissens-Treffer.
- Links lassen sich öffnen, E-Mail-Adressen direkt anschreiben. Platzhalter in Links werden URL-sicher eingesetzt.
- **Notiz als Text kopieren**, fertig zum Einfügen ins Ticketsystem.

### Verbessert
- **Löschen mit Rückgängig** statt Nachfragen: Notizen und Wissens-Einträge verschwinden sofort und lassen sich
  6 Sekunden lang zurückholen.
- Kopieren funktioniert jetzt auch, wenn das Noteline-Fenster gerade keinen Fokus hat.
- **Rückruf schneller setzen:** getrennte Felder für Datum und Uhrzeit. Das Datum steht schon auf heute, es
  reicht, die Uhrzeit einzutragen.

## [1.1.0] – 2026-11-06

Angepasst an die Arbeit neben Ticketsystem und Telefonie: breites, niedriges Fenster, schnelleres Erfassen,
Noteline läuft dauerhaft im Hintergrund.

### Neu
- **Zweispaltige Ansicht** ab 760 px Breite: Notizen links, rechts das Wissen oder die geöffnete Notiz in voller
  Höhe. Die Suche durchsucht beide Spalten.
- **Telefon- und Ticketnummern werden erkannt:** `+49 123 4567890 Kunde #12345: Stichpunkt` füllt Telefon,
  Ticket, Kunde und Text in einem Schritt.
- **Ticket-Link:** In den Einstellungen die Adresse des Ticketsystems mit `<TICKET>` hinterlegen, dann öffnet
  ein Klick das Ticket einer Notiz im Browser. Die Adresse bleibt nur auf diesem Rechner.
- **Hell, Dunkel oder wie Windows** in den Einstellungen, inklusive Titelleiste.
- **Läuft im Hintergrund:** Das Kreuz und Minimieren schicken Noteline in den Infobereich unten rechts. Klick
  auf das Symbol öffnet es wieder, Rechtsklick bietet *Nach Updates suchen* und *Beenden*.
- **Windows-Benachrichtigung bei neuen Updates.** Installiert wird per Klick, beim Beenden oder still in einer
  Pause (Noteline im Infobereich, 10 Minuten keine Eingabe am PC). Danach startet Noteline wieder im Hintergrund.
- Eigene, flache Titelleiste mit den Windows-Fensterknöpfen spart Platz.

### Verbessert
- Rückruf-Benachrichtigungen bleiben stehen, bis sie weggeklickt werden.
- Leere Spuren werden ausgeblendet. Die Uhr ist ausblendbar (Standard: aus).
- Einstellungen aufgeräumt: Der Speicherort ist ein anklickbarer Pfad, der Backup-Knopf entfällt. Die täglichen
  Sicherungen laufen weiter unsichtbar im Unterordner `Backups`.
- Einstellungen liegen jetzt in `einstellungen.json`. Die bisherige `fenster.json` wird übernommen.

## [1.0.1] – 2026-11-06

### Verbessert
- Lizenzhinweise für alle enthaltenen Bestandteile Dritter (Symbole von Lucide, Schrift Space Grotesk,
  Electron und Abhängigkeiten) werden jetzt mit der App ausgeliefert, siehe `THIRD_PARTY_NOTICES.md`.
- Veröffentlichungen laufen zuverlässiger: Alle Dateien eines Updates werden in einem Schritt hochgeladen.

## [1.0.0] – 2026-11-06

Erste veröffentlichte Version. Neuaufbau des Prototyps „Hotline-Notizen“ nach Spec-Driven Development.

### Neu
- Installer für Windows (ohne Adminrechte) mit Startmenü- und Desktop-Verknüpfung.
- Automatische Updates: Prüfung jede Stunde, Download im Hintergrund, Installation per Klick oder beim Beenden.
- Einstellungen mit Version, *Nach Updates suchen*, *Mit Windows starten*, *Immer im Vordergrund* und Datenordner.
- Vorlagen im Bereich Wissen unterstützen mehrere Platzhalter, z. B. `ping <IP> -n <ANZAHL>`.
- Schutzmodus: Ist die Datendatei beschädigt, speichert Noteline nichts und legt eine Sicherungskopie an.
- Übernahme vorhandener Daten aus dem Prototyp „Hotline-Notizen“.

### Verbessert
- Angefangene Eingaben im Wissen-Formular gehen nicht mehr verloren, wenn die Liste im Hintergrund aktualisiert wird.
- Backups entstehen jeden Tag, auch wenn Noteline über Nacht geöffnet bleibt.
- Windows-Benachrichtigungen für Rückrufe funktionieren zuverlässig, ein Klick öffnet die Notiz.
- Beim Beenden wird der letzte Stand sicher gespeichert.
- Eine ins Fenster gezogene Datei ersetzt nicht mehr die App-Oberfläche.
- Strengere Sicherheitseinstellungen (Sandbox, Content-Security-Policy ohne Inline-Skripte).

[1.2.0]: https://github.com/pascatotalx/noteline/releases/tag/v1.2.0
[1.1.0]: https://github.com/pascatotalx/noteline/releases/tag/v1.1.0
[1.0.1]: https://github.com/pascatotalx/noteline/releases/tag/v1.0.1
[1.0.0]: https://github.com/pascatotalx/noteline/releases/tag/v1.0.0
