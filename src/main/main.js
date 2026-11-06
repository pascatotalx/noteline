// Noteline – Hauptprozess
'use strict';
const { app, BrowserWindow, ipcMain, shell, screen, globalShortcut, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { createStorage } = require('./storage');
const { createUpdater } = require('./updater');

const APP_ID = 'de.pascatotalx.noteline';
const RENDERER = path.join(__dirname, '..', 'renderer');
const ICON = path.join(RENDERER, 'icon.png');
const SCREENSHOT = process.env.NOTELINE_SCREENSHOT; // nur für scripts/screenshot.js

let win = null;
let storage = null;
let updater = null;
const offeneBenachrichtigungen = new Set(); // Referenz halten, sonst gehen Klicks verloren (H-6)

const istHttp = (url) => /^https?:\/\//i.test(String(url || ''));

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
  const e = storage.ladeFenster();
  const bounds = SCREENSHOT ? { width: 460, height: 900 } : (liegtAufBildschirm(e.bounds) ? e.bounds : standardBounds());

  win = new BrowserWindow({
    ...bounds,
    minWidth: 360, minHeight: 420,
    title: 'Noteline',
    icon: ICON,
    show: !SCREENSHOT,
    alwaysOnTop: !SCREENSHOT && !!e.immerVorne,
    autoHideMenuBar: true,
    backgroundColor: '#1b1d22',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(RENDERER, 'index.html'), SCREENSHOT ? { query: { tab: process.env.NOTELINE_SCREENSHOT_TAB || 'hotline' } } : {});

  const merken = () => {
    if (SCREENSHOT || !win || win.isMinimized() || win.isMaximized()) return;
    storage.speichereFenster({ bounds: win.getBounds() });
  };
  win.on('resized', merken);
  win.on('moved', merken);
  win.on('focus', () => win.flashFrame(false));
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

function senden(kanal, daten) {
  if (win && !win.isDestroyed()) win.webContents.send(kanal, daten);
}

function ipcEinrichten() {
  ipcMain.handle('laden', () => ({ ...storage.load(), ordner: ordnerAnzeige(storage.pfade.ordner) }));
  ipcMain.handle('speichern', (_e, json) => { storage.save(json); return true; });
  ipcMain.on('speichernSofort', (e, json) => {
    try { storage.save(json); e.returnValue = { ok: true }; } catch (err) { e.returnValue = { ok: false, fehler: err.message }; }
  });

  ipcMain.handle('immerVorne', (_e, an) => {
    win.setAlwaysOnTop(!!an);
    storage.speichereFenster({ immerVorne: !!an });
    return !!an;
  });
  ipcMain.handle('istImmerVorne', () => !!win && win.isAlwaysOnTop());

  ipcMain.handle('autostart', (_e, an) => {
    if (!app.isPackaged) return { an: false, moeglich: false };
    if (typeof an === 'boolean') app.setLoginItemSettings({ openAtLogin: an });
    return { an: app.getLoginItemSettings().openAtLogin, moeglich: true };
  });

  ipcMain.handle('ordnerOeffnen', (_e, art) => shell.openPath(art === 'backups' ? storage.pfade.backupOrdner : storage.pfade.ordner));
  ipcMain.handle('linkOeffnen', (_e, url) => { if (istHttp(url)) shell.openExternal(url); });
  ipcMain.handle('version', () => app.getVersion());

  ipcMain.handle('erinnern', (_e, { titel, text, id }) => {
    if (win && !win.isFocused()) win.flashFrame(true);
    if (!Notification.isSupported()) return false;
    const n = new Notification({ title: String(titel), body: String(text), icon: ICON });
    offeneBenachrichtigungen.add(n);
    const weg = () => offeneBenachrichtigungen.delete(n);
    n.on('click', () => { weg(); zeigen(); senden('notizOeffnen', id); });
    n.on('close', weg);
    n.on('failed', weg);
    n.show();
    return true;
  });

  ipcMain.handle('updateSuchen', () => updater.suchen());
  ipcMain.handle('updateStatus', () => updater.status);
  ipcMain.handle('updateInstallieren', () => updater.installieren());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', zeigen);
  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    storage = createStorage(datenOrdner());
    updater = createUpdater((s) => senden('updateStatus', s));
    ipcEinrichten();
    fensterErstellen();
    if (!SCREENSHOT) {
      // Strg+Alt+H holt das Fenster von überall nach vorne
      if (!globalShortcut.register('Control+Alt+H', zeigen)) console.warn('Strg+Alt+H ist bereits belegt.');
      updater.start();
    }
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
