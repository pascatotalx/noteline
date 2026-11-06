# Changelog

Alle nennenswerten Änderungen an Noteline. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

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

[1.0.1]: https://github.com/pascatotalx/noteline/releases/tag/v1.0.1
[1.0.0]: https://github.com/pascatotalx/noteline/releases/tag/v1.0.0
