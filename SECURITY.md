# Sicherheit

## Sicherheitslücke melden

Bitte **kein öffentliches Issue** anlegen. Melde Sicherheitsprobleme vertraulich über
[GitHub Security Advisories](https://github.com/pascatotalx/noteline/security/advisories/new).

## Unterstützte Versionen

Unterstützt wird nur die jeweils neueste Version. Noteline aktualisiert sich automatisch.

## Umgang mit Daten

- Nutzerdaten liegen ausschließlich lokal in `Dokumente\Noteline\`, verschlüsselt mit Electron `safeStorage`
  (AES-GCM, Schlüssel per Windows-DPAPI an das Benutzerkonto gebunden). Die App lädt keine Daten hoch.
- Schützt gegen: Kopieren der Dateien, andere Windows-Benutzer, weitergegebene Ordner oder Sicherungen.
  Schützt nicht gegen Schadsoftware, die unter dem eigenen Windows-Konto läuft. Wird das Windows-Passwort von einem
  Administrator zurückgesetzt oder das Profil neu angelegt, sind die Daten nicht mehr lesbar.
- Netzwerkverbindungen: lesende Update-Prüfung bei GitHub Releases und, nur wenn eingeschaltet, lesende Abrufe der im
  Statusmonitor eingestellten öffentlichen Statusseiten. Es werden nie eigene Daten gesendet.
- Das Repository enthält keine Nutzerdaten. Ein Git-Hook und eine Prüfung in GitHub Actions
  (`scripts/check-sensitive.js`) blockieren Datendateien und Zugangsdaten.

## Härtung

- Noteline öffnet keinen Netzwerk-Port und bietet keine Schnittstelle nach außen.
- Fenster mit `contextIsolation`, `sandbox` und ohne Node-Zugriff, strikte Content-Security-Policy ohne Inline-Skripte,
  keine Navigation im Fenster, keine eingebetteten Webviews. Alle Browser-Rechte (Kamera, Mikrofon, Standort …) sind gesperrt.
- Der Hauptprozess beantwortet nur Anfragen der eigenen Seite im eigenen Fenster.
- Electron-Fuses im Installer: kein `ELECTRON_RUN_AS_NODE`, keine `NODE_OPTIONS`, kein `--inspect`, Code nur aus der
  `app.asar` mit Integritätsprüfung (eine veränderte Programmdatei startet nicht).
- Antworten von Statusseiten werden höchstens bis 2 MB gelesen.
- Jede Änderung durchläuft ESLint mit Sicherheitsregeln, Tests und die Prüfung auf sensible Daten (lokal und in GitHub Actions).
- Updates kommen ausschließlich aus den GitHub-Releases dieses Repositorys über HTTPS und werden per SHA-512 geprüft.
  Der Installer ist nicht code-signiert.
