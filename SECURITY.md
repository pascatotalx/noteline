# Sicherheit

## Sicherheitslücke melden

Bitte **kein öffentliches Issue** anlegen. Melde Sicherheitsprobleme vertraulich über
[GitHub Security Advisories](https://github.com/pascatotalx/noteline/security/advisories/new).

## Unterstützte Versionen

Unterstützt wird nur die jeweils neueste Version. Noteline aktualisiert sich automatisch.

## Umgang mit Daten

- Nutzerdaten liegen ausschließlich lokal in `Dokumente\Noteline\`. Die App lädt keine Daten hoch.
- Einzige Netzwerkverbindung: lesende Update-Prüfung bei GitHub Releases.
- Das Repository enthält keine Nutzerdaten. Ein Git-Hook und eine Prüfung in GitHub Actions
  (`scripts/check-sensitive.js`) blockieren Datendateien und Zugangsdaten.
