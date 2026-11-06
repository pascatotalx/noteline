# Logo „One Flow“

Vektorquellen des Noteline-Logos. Alle Dateien bestehen aus echten SVG-Pfaden ohne eingebettete Bilder,
`viewBox` 256 × 256 (Schriftzug 940 × 256).

| Datei | Verwendung |
|---|---|
| `noteline-app-icon.svg` | App-Icon mit dunkler Kachel (Quelle für `build/icon.ico` und `build/icon.png`) |
| `noteline-symbol.svg` | Symbol ohne Kachel für dunkle Hintergründe |
| `noteline-symbol-on-light.svg` | Symbol für helle Hintergründe |
| `noteline-symbol-mono.svg` | Einfarbig weiß |
| `noteline-wordmark.svg` | Symbol mit Schriftzug für dunkle Hintergründe |
| `noteline-wordmark-on-light.svg` | Symbol mit Schriftzug für helle Hintergründe |

Der Schriftzug ist echter Text in Space Grotesk. Außerhalb der App kann eine Ersatzschrift erscheinen.

## Farben

| Name | Wert |
|---|---|
| Anthrazit | `#1B1D22` |
| Hell | `#F6F8FC` |
| Lime | `#BEE600` |
| Cyan | `#00E7FF` |
| Grau | `#8C929B` |

## Abgeleitete Dateien

- `build/icon.ico`: Windows-Icon in 16, 24, 32, 48, 64, 128 und 256 px (Installer, Programm)
- `build/icon.png`: 512 px
- `src/renderer/icon.ico`: Fenster, Taskleiste und Infobereich
- `src/renderer/icon.png`: 256 px für Windows-Benachrichtigungen
- Das Logo in der Titelleiste ist als Inline-SVG in `src/renderer/index.html` eingebettet, damit es dem Theme folgt.
