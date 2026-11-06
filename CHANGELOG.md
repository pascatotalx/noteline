# Changelog

Alle nennenswerten Änderungen an Noteline. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

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

[1.1.0]: https://github.com/pascatotalx/noteline/releases/tag/v1.1.0
[1.0.1]: https://github.com/pascatotalx/noteline/releases/tag/v1.0.1
[1.0.0]: https://github.com/pascatotalx/noteline/releases/tag/v1.0.0
