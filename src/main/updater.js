// Noteline – automatische Updates über GitHub Releases (Spezifikation U-2, K-2).
'use strict';
const { app } = require('electron');

const ERSTE_PRUEFUNG_MS = 10 * 1000;
const INTERVALL_MS = 60 * 60 * 1000;

/**
 * @param {(status: object) => void} melden  schickt den Status an den Renderer
 */
function createUpdater(melden) {
  let status = { zustand: 'idle' };
  let autoUpdater = null;
  let timer = null;

  const setze = (s) => { status = s; melden(status); };

  if (!app.isPackaged) {
    status = { zustand: 'dev', text: 'Updates gibt es nur in der installierten Version.' };
    return {
      start() {}, suchen: async () => { melden(status); return status; },
      installieren() {}, get status() { return status; },
    };
  }

  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('checking-for-update', () => {
    // Ein bereits geladenes Update nicht durch „Wird gesucht" verdecken.
    if (status.zustand !== 'bereit') setze({ zustand: 'suche' });
  });
  autoUpdater.on('update-not-available', () => {
    if (status.zustand !== 'bereit') setze({ zustand: 'aktuell', geprueft: new Date().toISOString() });
  });
  autoUpdater.on('update-available', (info) => setze({ zustand: 'laedt', version: info.version, prozent: 0 }));
  autoUpdater.on('download-progress', (p) => setze({ ...status, zustand: 'laedt', prozent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => setze({ zustand: 'bereit', version: info.version }));
  autoUpdater.on('error', (e) => {
    if (status.zustand === 'bereit') return;
    const offline = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|net::ERR_/i.test(String(e && e.message));
    setze({ zustand: 'fehler', text: offline ? 'Keine Verbindung zu GitHub.' : kurz(e) });
  });

  async function suchen() {
    if (status.zustand === 'laedt' || status.zustand === 'bereit') return status;
    try { await autoUpdater.checkForUpdates(); } catch (e) { /* Fehler kommt über das 'error'-Ereignis */ }
    return status;
  }

  return {
    start() {
      setTimeout(suchen, ERSTE_PRUEFUNG_MS);
      timer = setInterval(suchen, INTERVALL_MS);
      app.on('will-quit', () => clearInterval(timer));
    },
    suchen,
    installieren() {
      if (status.zustand !== 'bereit') return;
      // still installieren und danach Noteline wieder starten
      setImmediate(() => autoUpdater.quitAndInstall(true, true));
    },
    get status() { return status; },
  };
}

function kurz(e) {
  const t = String((e && e.message) || e || 'Unbekannter Fehler').split('\n')[0];
  return t.length > 140 ? t.slice(0, 137) + '…' : t;
}

module.exports = { createUpdater, INTERVALL_MS };
