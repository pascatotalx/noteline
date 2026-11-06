// Noteline – schmale Brücke zwischen Renderer und Hauptprozess (plan.md §5).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  laden: () => ipcRenderer.invoke('laden'),
  speichern: (json) => ipcRenderer.invoke('speichern', json),
  speichernSofort: (json) => ipcRenderer.sendSync('speichernSofort', json),
  immerVorne: (an) => ipcRenderer.invoke('immerVorne', an),
  istImmerVorne: () => ipcRenderer.invoke('istImmerVorne'),
  autostart: (an) => ipcRenderer.invoke('autostart', an),
  ordnerOeffnen: (art) => ipcRenderer.invoke('ordnerOeffnen', art),
  linkOeffnen: (url) => ipcRenderer.invoke('linkOeffnen', url),
  erinnern: (daten) => ipcRenderer.invoke('erinnern', daten),
  version: () => ipcRenderer.invoke('version'),
  updateSuchen: () => ipcRenderer.invoke('updateSuchen'),
  updateStatus: () => ipcRenderer.invoke('updateStatus'),
  updateInstallieren: () => ipcRenderer.invoke('updateInstallieren'),
  beiNotizOeffnen: (fn) => ipcRenderer.on('notizOeffnen', (_e, id) => fn(id)),
  beiUpdateStatus: (fn) => ipcRenderer.on('updateStatus', (_e, s) => fn(s)),
});
