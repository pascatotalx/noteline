// Noteline – Hauptprozess
'use strict';
const {
  app, BrowserWindow, ipcMain, shell, screen, globalShortcut, Notification, Tray, Menu, nativeImage, nativeTheme, powerMonitor, clipboard,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { createStorage } = require('./storage');
const { createUpdater } = require('./updater');
const statusMonitor = require('./status');

// App-Kennung für Windows (Benachrichtigungen, Verknüpfung). Entwicklungsläufe bekommen eine eigene, sonst legt Electron
// eine Verknüpfung „Electron“ mit der echten Kennung an und Benachrichtigungen zeigen „Electron“ statt „Noteline“ (1.4.1).
const APP_ID = app.isPackaged ? 'de.pascatotalx.noteline' : 'de.pascatotalx.noteline.dev';
const RENDERER = path.join(__dirname, '..', 'renderer');
const ICON = path.join(RENDERER, 'icon.png');     // Benachrichtigungen
const ICON_ICO = path.join(RENDERER, 'icon.ico'); // Fenster, Taskleiste, Infobereich (alle Größen 16–256 px)
const TITELLEISTE = 44; // Höhe der eigenen Titelleiste in px (A-1)
const RUHE_SEKUNDEN = 10 * 60; // stilles Update erst nach 10 min ohne Eingabe (K-2)

// Nur für scripts/screenshot.js
const SCREENSHOT = process.env.NOTELINE_SCREENSHOT;
const SCREENSHOT_GROESSE = (process.env.NOTELINE_SCREENSHOT_SIZE || '460x900').split('x').map(Number);

const FARBEN = {
  dark: { hintergrund: '#1b1d22', symbole: '#ffffff' },
  light: { hintergrund: '#f3f4f6', symbole: '#14161b' },
};

let win = null;
let tray = null;
let storage = null;
let updater = null;
let beendet = false;   // true = Fenster darf wirklich schließen (A-3)
let notizOffen = false; // vom Renderer gemeldet, für das stille Update (K-2)
const offeneBenachrichtigungen = new Set(); // Referenz halten, sonst gehen Klicks verloren (H-6)

const istHttp = (url) => /^https?:\/\//i.test(String(url || ''));
const einstellungen = () => storage.ladeEinstellungen();

function datenOrdner() {
  if (process.env.NOTELINE_DATA_DIR) return { ordner: path.resolve(process.env.NOTELINE_DATA_DIR) };
  const docs = app.getPath('documents');
  return { ordner: path.join(docs, 'Noteline'), altOrdner: path.join(docs, 'Hotline-Notizen') };
}

/** Kurzer Anzeigepfad ohne Benutzernamen, z. B. „Dokumente\Noteline“. */
function ordnerAnzeige(ordner) {
  if (SCREENSHOT) return 'Dokumente\\Noteline';
  const rel = path.relative(app.getPath('documents'), ordner);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? path.join('Dokumente', rel) : ordner;
}

// ---------- Erscheinungsbild (A-2) ----------
function themaWahl() {
  if (SCREENSHOT && process.env.NOTELINE_SCREENSHOT_THEME) return process.env.NOTELINE_SCREENSHOT_THEME;
  const t = einstellungen().theme;
  return ['dunkel', 'hell', 'system'].includes(t) ? t : 'dunkel';
}
function themaAktiv() {
  const t = themaWahl();
  if (t === 'system') return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  return t === 'hell' ? 'light' : 'dark';
}
function themaAnwenden() {
  if (!win || win.isDestroyed()) return;
  const aktiv = themaAktiv();
  const f = FARBEN[aktiv];
  win.setBackgroundColor(f.hintergrund);
  try { win.setTitleBarOverlay({ color: f.hintergrund, symbolColor: f.symbole, height: TITELLEISTE }); } catch {}
  senden('theme', aktiv);
}

// ---------- Fenster ----------
function standardBounds() {
  const wa = screen.getPrimaryDisplay().workArea;
  const breite = Math.max(440, Math.round(wa.width / 4));
  return { width: breite, height: wa.height, x: wa.x + wa.width - breite, y: wa.y };
}

function liegtAufBildschirm(b) {
  return b && screen.getAllDisplays().some(({ workArea: w }) =>
    b.x < w.x + w.width && b.x + b.width > w.x && b.y < w.y + w.height && b.y + b.height > w.y);
}

function fensterErstellen() {
  const e = einstellungen();
  const versteckt = !!e.startVersteckt && !SCREENSHOT; // nach stillem Update wieder im Infobereich starten
  if (e.startVersteckt) storage.speichereEinstellungen({ startVersteckt: false });
  const bounds = SCREENSHOT
    ? { width: SCREENSHOT_GROESSE[0], height: SCREENSHOT_GROESSE[1] }
    : (liegtAufBildschirm(e.bounds) ? e.bounds : standardBounds());
  const aktiv = themaAktiv();

  win = new BrowserWindow({
    ...bounds,
    minWidth: 360, minHeight: 420,
    title: 'Noteline',
    icon: ICON_ICO,
    show: false,
    alwaysOnTop: !SCREENSHOT && !!e.immerVorne,
    skipTaskbar: !SCREENSHOT,   // nur Symbol im Infobereich, kein Taskleisten-Knopf (A-3)
    backgroundColor: FARBEN[aktiv].hintergrund,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: FARBEN[aktiv].hintergrund, symbolColor: FARBEN[aktiv].symbole, height: TITELLEISTE },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  const query = { theme: aktiv };
  if (SCREENSHOT) query.tab = process.env.NOTELINE_SCREENSHOT_TAB || 'hotline';
  win.loadFile(path.join(RENDERER, 'index.html'), { query });
  win.once('ready-to-show', () => { if (!versteckt && !SCREENSHOT) win.show(); });

  const merken = () => {
    if (SCREENSHOT || !win || win.isMinimized() || win.isMaximized()) return;
    storage.speichereEinstellungen({ bounds: win.getBounds() });
  };
  win.on('resized', merken);
  win.on('moved', merken);
  win.on('focus', () => win.flashFrame(false));

  // Schließen und Minimieren verstecken nur (A-3)
  win.on('close', (ev) => { if (!beendet && !SCREENSHOT) { ev.preventDefault(); verstecken(); } });
  win.on('minimize', () => { if (!SCREENSHOT) verstecken(); });
  win.on('session-end', () => { beendet = true; });
  win.on('closed', () => { win = null; });

  // Keine Navigation im App-Fenster (z. B. durch eine hineingezogene Datei) – A-1
  win.webContents.on('will-navigate', (ev) => ev.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (istHttp(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (SCREENSHOT) {
    win.webContents.on('console-message', (ev) => console.log(`[renderer] ${ev.message}`));
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      const bild = await win.webContents.capturePage();
      fs.writeFileSync(SCREENSHOT, bild.toPNG());
      beendet = true;
      app.quit();
    }, 1500));
  }
}

function zeigen() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function verstecken() {
  if (!win) return;
  win.hide();
  if (!einstellungen().trayHinweis) {
    storage.speichereEinstellungen({ trayHinweis: true });
    benachrichtigen('Noteline läuft im Hintergrund weiter',
      'Über das Noteline-Symbol unten rechts im Infobereich oder mit Strg+Alt+H wieder öffnen.', zeigen);
  }
}

function beenden() {
  beendet = true;
  app.quit();
}

function senden(kanal, daten) {
  if (win && !win.isDestroyed()) win.webContents.send(kanal, daten);
}

/** Windows-Benachrichtigung unten rechts. `bleiben` = bis zum Wegklicken sichtbar (Rückrufe, H-6). */
function benachrichtigen(titel, text, beiKlick, { bleiben = false } = {}) {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title: String(titel), body: String(text), icon: ICON, silent: false, timeoutType: bleiben ? 'never' : 'default' });
  offeneBenachrichtigungen.add(n);
  const weg = () => offeneBenachrichtigungen.delete(n);
  n.on('click', () => { weg(); if (beiKlick) beiKlick(); });
  n.on('close', weg);
  n.on('failed', weg);
  n.show();
  return true;
}

// ---------- Infobereich (A-3) ----------
function trayErstellen() {
  // Die .ico enthält eine eigene 16-px-Fassung, Windows wählt passend zur Bildschirmskalierung.
  tray = new Tray(nativeImage.createFromPath(ICON_ICO));
  tray.setToolTip('Noteline');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Noteline öffnen', click: zeigen },
    { label: 'Nach Updates suchen', click: () => trayUpdateSuchen() },
    { type: 'separator' },
    { label: 'Beenden', click: beenden },
  ]));
  tray.on('click', zeigen);
}

async function trayUpdateSuchen() {
  const s = await updater.suchen();
  const texte = {
    aktuell: ['Noteline ist aktuell', `Version ${app.getVersion()} ist die neueste.`],
    laedt: ['Update wird geladen', `Noteline ${s.version} wird im Hintergrund heruntergeladen.`],
    fehler: ['Update-Prüfung fehlgeschlagen', s.text],
    dev: ['Keine Updates', s.text],
  };
  if (texte[s.zustand]) benachrichtigen(...texte[s.zustand], zeigen);
}

// ---------- Updates (U-2, K-2) ----------
function updateStatusMelden(s) {
  senden('updateStatus', s);
  if (s.zustand === 'bereit' && einstellungen().updateGemeldet !== s.version) {
    storage.speichereEinstellungen({ updateGemeldet: s.version });
    benachrichtigen(`Noteline ${s.version} ist bereit`,
      'Zum Installieren in Noteline auf „Jetzt neu starten“ klicken. Sonst installiert es sich beim Beenden oder in einer Pause.', zeigen);
  }
}

function stillesUpdatePruefen() {
  const bereit = updater.status.zustand === 'bereit';
  const versteckt = !win || !win.isVisible();
  if (bereit && versteckt && !notizOffen && powerMonitor.getSystemIdleTime() >= RUHE_SEKUNDEN) {
    storage.speichereEinstellungen({ startVersteckt: true });
    updateInstallieren();
  }
}

function updateInstallieren() {
  if (updater.status.zustand !== 'bereit') return;
  beendet = true;
  updater.installieren();
}

// ---------- Statusmonitor (S-1 – S-4) ----------
let statusErgebnisse = [];
let statusTimer = null;
let statusLaeuft = false;

const statusKonfig = () => statusMonitor.statusEinstellungen(einstellungen().status);

function statusDaten() {
  const k = statusKonfig();
  const ergebnisse = k.aktiv ? statusErgebnisse : [];
  return { aktiv: k.aktiv, intervall: k.intervall, quellen: k.quellen, ergebnisse, gesamt: statusMonitor.gesamt(ergebnisse),
    laeuft: statusLaeuft, vorlagen: statusMonitor.VORLAGEN.map(v => v.id) };
}

function statusMelden(m) {
  const art = m.zustand === 'ausfall' ? 'Ausfall' : m.zustand === 'wartung' ? 'Wartung' : 'Störung';
  const titel = m.typ === 'behoben' ? `Behoben: ${m.name}` : m.typ === 'besser' ? `Teilweise behoben: ${m.name}` : `${art}: ${m.name}`;
  const text = m.typ === 'stoerung' ? [m.titel, m.text].filter(Boolean).join(' – ').slice(0, 240) || 'Der Dienst meldet eine Störung.'
    : m.typ === 'behoben' ? 'Der Dienst meldet wieder normalen Betrieb.' : 'Die Lage hat sich verbessert, ist aber noch nicht ganz behoben.';
  benachrichtigen(titel, text, () => { zeigen(); senden('statusOeffnen'); }, { bleiben: true });
}

async function statusPruefen() {
  const k = statusKonfig();
  if (!k.aktiv || statusLaeuft) return statusDaten();
  statusLaeuft = true;
  senden('status', statusDaten());
  try {
    const neu = await statusMonitor.pruefeAlle(k.quellen, fetch);
    const alt = einstellungen().statusLetzter;
    if (Array.isArray(alt)) for (const m of statusMonitor.aenderungen(alt, neu)) statusMelden(m);
    // Zum Vergleichen merken; bei „unbekannt“ bleibt der letzte bekannte Stand (keine Doppelmeldungen nach Netzwerkaussetzern)
    const merken = neu.map(n => (n.zustand === 'unbekannt' && Array.isArray(alt) && alt.find(a => a.id === n.id)) || n)
      .map(({ id, name, zustand, meldungen }) => ({ id, name, zustand, meldungen: (meldungen || []).map(({ schluessel, zustand: z, titel }) => ({ schluessel, zustand: z, titel })) }));
    storage.speichereEinstellungen({ statusLetzter: merken });
    statusErgebnisse = neu;
  } finally {
    statusLaeuft = false;
  }
  const d = statusDaten();
  senden('status', d);
  return d;
}

function statusZeitplan() {
  clearInterval(statusTimer);
  statusTimer = null;
  const k = statusKonfig();
  if (!k.aktiv || SCREENSHOT) return;
  statusTimer = setInterval(statusPruefen, k.intervall * 60 * 1000);
}

/** Einstellungen aus dem Renderer prüfen und übernehmen. */
function statusEinstellungSetzen(patch) {
  const alt = statusKonfig();
  const neu = { ...alt };
  if (typeof patch.aktiv === 'boolean') neu.aktiv = patch.aktiv;
  if ([5, 15, 30].includes(patch.intervall)) { neu.intervall = patch.intervall; neu.intervallGewaehlt = true; }
  if (Array.isArray(patch.quellen)) {
    neu.quellen = patch.quellen.slice(0, 30).map(q => ({
      id: String(q.id).slice(0, 40), name: String(q.name || '').trim().slice(0, 60) || 'Dienst', art: q.art,
      url: String(q.url || '').slice(0, 500), link: String(q.link || q.url || '').slice(0, 500), aktiv: !!q.aktiv,
    })).filter(q => ['ti', 'statuspage', 'erreichbar'].includes(q.art) && istHttp(q.url));
  }
  const eingeschaltet = neu.aktiv && !alt.aktiv;
  const patchSpeichern = { status: statusMonitor.statusEinstellungen(neu) };
  if (eingeschaltet || !neu.aktiv) { patchSpeichern.statusLetzter = null; statusErgebnisse = []; } // nach dem Einschalten nichts Altes melden (S-4)
  storage.speichereEinstellungen(patchSpeichern);
  statusZeitplan();
  if (neu.aktiv && (eingeschaltet || Array.isArray(patch.quellen))) statusPruefen();
  const d = statusDaten();
  senden('status', d);
  return d;
}

// ---------- IPC ----------
const ERLAUBTE_EINSTELLUNGEN = {
  theme: (v) => ['dunkel', 'hell', 'system'].includes(v),
  uhr: (v) => typeof v === 'boolean',
  ticketLink: (v) => typeof v === 'string' && v.length <= 500 && (v === '' || istHttp(v)),
};

function ipcEinrichten() {
  ipcMain.handle('laden', () => ({ ...storage.load(), ordner: ordnerAnzeige(storage.pfade.ordner) }));
  ipcMain.handle('speichern', (_e, json) => { storage.save(json); return true; });
  ipcMain.on('speichernSofort', (e, json) => {
    try { storage.save(json); e.returnValue = { ok: true }; } catch (err) { e.returnValue = { ok: false, fehler: err.message }; }
  });

  ipcMain.handle('einstellungen', () => {
    const e = einstellungen();
    return { theme: themaWahl(), themaAktiv: themaAktiv(), uhr: !!e.uhr, ticketLink: e.ticketLink || '' };
  });
  ipcMain.handle('einstellungSetzen', (_e, schluessel, wert) => {
    const pruefen = ERLAUBTE_EINSTELLUNGEN[schluessel];
    if (!pruefen || !pruefen(wert)) return false;
    storage.speichereEinstellungen({ [schluessel]: wert });
    if (schluessel === 'theme') themaAnwenden();
    return true;
  });

  ipcMain.handle('immerVorne', (_e, an) => {
    win.setAlwaysOnTop(!!an);
    storage.speichereEinstellungen({ immerVorne: !!an });
    return !!an;
  });
  ipcMain.handle('istImmerVorne', () => !!win && win.isAlwaysOnTop());

  ipcMain.handle('autostart', (_e, an) => {
    if (!app.isPackaged) return { an: false, moeglich: false };
    if (typeof an === 'boolean') app.setLoginItemSettings({ openAtLogin: an });
    return { an: app.getLoginItemSettings().openAtLogin, moeglich: true };
  });

  ipcMain.handle('ordnerOeffnen', () => shell.openPath(storage.pfade.ordner));
  ipcMain.handle('linkOeffnen', (_e, url) => { if (istHttp(url) || /^mailto:[^\s<>"]+$/i.test(String(url))) shell.openExternal(url); });
  ipcMain.handle('version', () => app.getVersion());
  // Kopieren über den Hauptprozess: funktioniert auch ohne Fensterfokus (W-3, W-5, H-10)
  ipcMain.handle('kopieren', (_e, text) => { clipboard.writeText(String(text ?? '')); return true; });
  ipcMain.handle('notizOffen', (_e, offen) => { notizOffen = !!offen; });

  ipcMain.handle('erinnern', (_e, { titel, text, id }) => {
    if (win && !win.isFocused()) win.flashFrame(true);
    return benachrichtigen(titel, text, () => { zeigen(); senden('notizOeffnen', id); }, { bleiben: true });
  });

  ipcMain.handle('updateSuchen', () => updater.suchen());
  ipcMain.handle('updateStatus', () => updater.status);
  ipcMain.handle('updateInstallieren', () => updateInstallieren());

  ipcMain.handle('statusDaten', () => statusDaten());
  ipcMain.handle('statusPruefen', () => statusPruefen());
  ipcMain.handle('statusEinstellungen', (_e, patch) => statusEinstellungSetzen(patch && typeof patch === 'object' ? patch : {}));
  ipcMain.handle('statusQuelleTesten', (_e, url) => statusMonitor.erkenneArt(String(url || '').trim(), fetch));
}

// ---------- Start ----------
// Entwicklungs- und Screenshot-Läufe bekommen einen eigenen Benutzerordner, damit sie eine installierte
// Noteline weder blockieren noch nach vorne holen (Single-Instance-Sperre hängt am Benutzerordner).
if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), SCREENSHOT ? 'Noteline-Screenshot' : 'Noteline-Dev'));

if (!SCREENSHOT && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', zeigen);
  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    storage = createStorage(datenOrdner());
    updater = createUpdater(updateStatusMelden);
    ipcEinrichten();
    if (SCREENSHOT && process.env.NOTELINE_SCREENSHOT_STATUS) { try { statusErgebnisse = JSON.parse(process.env.NOTELINE_SCREENSHOT_STATUS); } catch {} }
    fensterErstellen();
    nativeTheme.on('updated', () => { if (themaWahl() === 'system') themaAnwenden(); });
    if (!SCREENSHOT) {
      trayErstellen();
      // Strg+Alt+H holt das Fenster von überall nach vorne
      if (!globalShortcut.register('Control+Alt+H', zeigen)) console.warn('Strg+Alt+H ist bereits belegt.');
      updater.start();
      setInterval(stillesUpdatePruefen, 60 * 1000);
      statusZeitplan();
      if (statusKonfig().aktiv) setTimeout(statusPruefen, 5000);
    }
  });
  app.on('before-quit', () => { beendet = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
