// Noteline – Hauptprozess
'use strict';
const {
  app, BrowserWindow, ipcMain, shell, screen, globalShortcut, Notification, Tray, Menu, nativeImage, nativeTheme, powerMonitor,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { createStorage } = require('./storage');
const { createUpdater } = require('./updater');

const APP_ID = 'de.pascatotalx.noteline';
const RENDERER = path.join(__dirname, '..', 'renderer');
const ICON = path.join(RENDERER, 'icon.png');
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
    icon: ICON,
    show: false,
    alwaysOnTop: !SCREENSHOT && !!e.immerVorne,
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
  const bild = nativeImage.createFromPath(ICON).resize({ width: 32, height: 32 });
  tray = new Tray(bild);
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
  ipcMain.handle('linkOeffnen', (_e, url) => { if (istHttp(url)) shell.openExternal(url); });
  ipcMain.handle('version', () => app.getVersion());
  ipcMain.handle('notizOffen', (_e, offen) => { notizOffen = !!offen; });

  ipcMain.handle('erinnern', (_e, { titel, text, id }) => {
    if (win && !win.isFocused()) win.flashFrame(true);
    return benachrichtigen(titel, text, () => { zeigen(); senden('notizOeffnen', id); }, { bleiben: true });
  });

  ipcMain.handle('updateSuchen', () => updater.suchen());
  ipcMain.handle('updateStatus', () => updater.status);
  ipcMain.handle('updateInstallieren', () => updateInstallieren());
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
    fensterErstellen();
    nativeTheme.on('updated', () => { if (themaWahl() === 'system') themaAnwenden(); });
    if (!SCREENSHOT) {
      trayErstellen();
      // Strg+Alt+H holt das Fenster von überall nach vorne
      if (!globalShortcut.register('Control+Alt+H', zeigen)) console.warn('Strg+Alt+H ist bereits belegt.');
      updater.start();
      setInterval(stillesUpdatePruefen, 60 * 1000);
    }
  });
  app.on('before-quit', () => { beendet = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
