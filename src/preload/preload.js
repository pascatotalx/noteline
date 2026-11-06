// Noteline – schmale Brücke zwischen Renderer und Hauptprozess (plan.md §5).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  laden: () => ipcRenderer.invoke('laden'),
  speichern: (json) => ipcRenderer.invoke('speichern', json),
  speichernSofort: (json) => ipcRenderer.sendSync('speichernSofort', json),
  einstellungen: () => ipcRenderer.invoke('einstellungen'),
  einstellungSetzen: (schluessel, wert) => ipcRenderer.invoke('einstellungSetzen', schluessel, wert),
  immerVorne: (an) => ipcRenderer.invoke('immerVorne', an),
  istImmerVorne: () => ipcRenderer.invoke('istImmerVorne'),
  autostart: (an) => ipcRenderer.invoke('autostart', an),
  ordnerOeffnen: () => ipcRenderer.invoke('ordnerOeffnen'),
  linkOeffnen: (url) => ipcRenderer.invoke('linkOeffnen', url),
  erinnern: (daten) => ipcRenderer.invoke('erinnern', daten),
  notizOffen: (offen) => ipcRenderer.invoke('notizOffen', offen),
  version: () => ipcRenderer.invoke('version'),
  updateSuchen: () => ipcRenderer.invoke('updateSuchen'),
  updateStatus: () => ipcRenderer.invoke('updateStatus'),
  updateInstallieren: () => ipcRenderer.invoke('updateInstallieren'),
  beiNotizOeffnen: (fn) => ipcRenderer.on('notizOeffnen', (_e, id) => fn(id)),
  beiUpdateStatus: (fn) => ipcRenderer.on('updateStatus', (_e, s) => fn(s)),
  beiTheme: (fn) => ipcRenderer.on('theme', (_e, t) => fn(t)),
});
