# Lizenzen von Drittanbietern

Noteline selbst steht unter der [MIT-Lizenz](LICENSE). Das App-Icon (`build/icon.png`) wurde für dieses
Projekt erstellt und fällt ebenfalls unter die MIT-Lizenz.

Noteline enthält die folgenden Bestandteile Dritter. Alle sind frei und kostenlos nutzbar, auch kommerziell.

| Bestandteil | Verwendung | Lizenz |
|---|---|---|
| [Lucide](https://lucide.dev) | Symbole der Oberfläche (Pin, Zahnrad, Stift, Haken, Pfeile, Link) | ISC (Teile von Feather: MIT) |
| [Space Grotesk](https://github.com/floriankarsten/space-grotesk) | Schriftart | SIL Open Font License 1.1, Volltext in [`src/renderer/fonts/OFL.txt`](src/renderer/fonts/OFL.txt) |
| [Electron](https://www.electronjs.org) | Laufzeitumgebung | MIT, Chromium-Lizenzen liegen der Installation als `LICENSES.chromium.html` bei |
| [electron-updater](https://github.com/electron-userland/electron-builder) | automatische Updates | MIT |
| Abhängigkeiten von electron-updater | `builder-util-runtime`, `debug`, `fs-extra`, `jsonfile`, `js-yaml`, `lazy-val`, `lodash.escaperegexp`, `lodash.isequal`, `ms`, `tiny-typed-emitter`, `universalify` | MIT |
| | `graceful-fs`, `semver` | ISC |
| | `argparse` | Python-2.0 |
| | `sax` | Blue Oak Model License 1.0.0 |

Die Lizenztexte der npm-Pakete liegen jeweils im Paket selbst (`node_modules/<paket>/LICENSE`) und werden mit
dem Installer ausgeliefert.

---

## Lucide

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### Feather (Teile von Lucide)

```
The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
