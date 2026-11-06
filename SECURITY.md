# Sicherheit

## Sicherheitslücke melden

Bitte **kein öffentliches Issue** anlegen. Melde Sicherheitsprobleme vertraulich über
[GitHub Security Advisories](https://github.com/pascatotalx/noteline/security/advisories/new).

## Unterstützte Versionen

Unterstützt wird nur die jeweils neueste Version. Noteline aktualisiert sich automatisch.

## Umgang mit Daten

- Nutzerdaten liegen ausschließlich lokal in `Dokumente\Noteline\`. Die App lädt keine Daten hoch.
- Netzwerkverbindungen: lesende Update-Prüfung bei GitHub Releases und, nur wenn eingeschaltet, lesende Abrufe der im
  Statusmonitor eingestellten öffentlichen Statusseiten. Es werden nie eigene Daten gesendet.
- Das Repository enthält keine Nutzerdaten. Ein Git-Hook und eine Prüfung in GitHub Actions
  (`scripts/check-sensitive.js`) blockieren Datendateien und Zugangsdaten.
