// Noteline – reine Logik ohne DOM und ohne Electron.
// Läuft im Renderer (als window.NL) und in Node-Tests (require).
(function (root, factory) {
  const NL = factory();
  if (typeof module === 'object' && module.exports) module.exports = NL;
  else root.NL = NL;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STATUS = ['offen', 'wartet', 'erledigt'];
  const PRIOS = ['hoch', 'normal', 'niedrig'];
  const PRIO_RANG = { hoch: 0, normal: 1, niedrig: 2 };
  const DATEN_VERSION = 2;

  const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const isoOderNull = (v) => (typeof v === 'string' && !isNaN(new Date(v)) ? v : null);

  // ---------- Zeit ----------
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  /** Ganze Kalendertage von `a` nach `b` (lokale Zeit, sommerzeitfest). */
  const tageZwischen = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);

  // ---------- H-1 Schnellerfassung ----------
  /** "Kunde: Stichpunkt" → { kunde, text }. Links (http://…) sind kein Kundenname. */
  function parseQuickInput(raw) {
    const v = str(raw).trim();
    const i = v.indexOf(':');
    if (i > 0 && i < 60 && v.slice(i, i + 3) !== '://') {
      return { kunde: v.slice(0, i).trim(), text: v.slice(i + 1).trim() };
    }
    return { kunde: '', text: v };
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function neueNotiz(raw, now = new Date()) {
    const { kunde, text } = parseQuickInput(raw);
    const iso = now.toISOString();
    return { id: uid(), erstellt: iso, geaendert: iso, kunde, ticket: '', telefon: '', text,
      status: 'offen', prio: 'normal', rueckruf: null, erinnertFuer: null };
  }

  const istLeer = (n) => !n.kunde.trim() && !n.text.trim() && !n.ticket.trim() && !n.telefon.trim();
  const ersteZeile = (t) => str(t).split('\n').map(s => s.trim()).filter(Boolean)[0] || '';

  // ---------- H-6 Rückruf ----------
  /** '' | 'over' (fällig/überfällig) | 'today' | 'later' */
  function rrState(n, now = new Date()) {
    if (!n.rueckruf || n.status === 'erledigt') return '';
    const d = new Date(n.rueckruf);
    if (d <= now) return 'over';
    if (d <= endOfDay(now)) return 'today';
    return 'later';
  }

  /** Notizen, für die jetzt eine Erinnerung fällig ist (genau einmal pro Rückrufzeitpunkt). */
  function faelligeErinnerungen(notizen, now = new Date()) {
    return notizen.filter(n => n.status !== 'erledigt' && n.rueckruf && n.erinnertFuer !== n.rueckruf && new Date(n.rueckruf) <= now);
  }

  const anzahlFaellig = (notizen, now = new Date()) => notizen.filter(n => ['over', 'today'].includes(rrState(n, now))).length;

  // ---------- H-4 / H-5 Spuren und Suche ----------
  const passtNotiz = (n, q) => !q || [n.kunde, n.ticket, n.telefon, n.text].join(' ').toLowerCase().includes(q);
  const passtWissen = (w, q) => !q || [w.gruppe, w.titel, w.wert].join(' ').toLowerCase().includes(q);

  function lanes(notizen, suche = '', now = new Date()) {
    const q = str(suche).trim().toLowerCase();
    const list = notizen.filter(n => passtNotiz(n, q));
    const isJetzt = (n) => n.status !== 'erledigt' && (n.prio === 'hoch' || ['over', 'today'].includes(rrState(n, now)));
    const byPrio = (a, b) => PRIO_RANG[a.prio] - PRIO_RANG[b.prio] || b.geaendert.localeCompare(a.geaendert);
    const jetzt = list.filter(isJetzt).sort((a, b) => (a.rueckruf || '9').localeCompare(b.rueckruf || '9') || byPrio(a, b));
    const rest = (st) => list.filter(n => n.status === st && !isJetzt(n)).sort(byPrio);
    const erl = list.filter(n => n.status === 'erledigt').sort((a, b) => b.geaendert.localeCompare(a.geaendert));
    return [
      { key: 'jetzt', name: 'Jetzt', items: jetzt, hideEmpty: true },
      { key: 'offen', name: 'Offen', items: rest('offen') },
      { key: 'wartet', name: 'Wartet', items: rest('wartet') },
      { key: 'erledigt', name: 'Erledigt', items: erl },
    ].filter(l => l.items.length || !l.hideEmpty);
  }

  // ---------- W-2 Vorlagen ----------
  const PLATZHALTER = /<([^<>\s][^<>]*)>/g;

  /** Eindeutige Platzhalternamen in Reihenfolge des ersten Auftretens. */
  function placeholders(wert) {
    const namen = [];
    for (const m of str(wert).matchAll(PLATZHALTER)) if (!namen.includes(m[1])) namen.push(m[1]);
    return namen;
  }

  /** Ersetzt alle Platzhalter. Leere Werte bleiben als <NAME> stehen. `$` wird wörtlich übernommen. */
  function fillTemplate(wert, werte = {}) {
    return str(wert).replace(PLATZHALTER, (ganz, name) => {
      const v = str(werte[name]).trim();
      return v || ganz;
    });
  }

  const istLink = (v) => /^https?:\/\//i.test(str(v).trim());

  // ---------- D-5 Normalisierung ----------
  function normalizeNotiz(n) {
    const jetzt = new Date().toISOString();
    const erstellt = isoOderNull(n && n.erstellt) || jetzt;
    return {
      id: str(n && n.id) || uid(),
      erstellt,
      geaendert: isoOderNull(n && n.geaendert) || erstellt,
      kunde: str(n && n.kunde),
      ticket: str(n && n.ticket),
      telefon: str(n && n.telefon),
      text: str(n && n.text),
      status: STATUS.includes(n && n.status) ? n.status : 'offen',
      prio: PRIOS.includes(n && n.prio) ? n.prio : 'normal',
      rueckruf: isoOderNull(n && n.rueckruf),
      erinnertFuer: isoOderNull(n && n.erinnertFuer),
    };
  }

  function normalizeWissen(w) {
    return { id: str(w && w.id) || uid(), gruppe: str(w && w.gruppe).trim() || 'Allgemein', titel: str(w && w.titel), wert: str(w && w.wert) };
  }

  /** Macht aus beliebigen gelesenen Daten (auch Prototyp-Version 1) ein gültiges Modell. */
  function normalize(d) {
    const src = d && typeof d === 'object' ? d : {};
    const notizen = (Array.isArray(src.notizen) ? src.notizen : []).filter(x => x && typeof x === 'object').map(normalizeNotiz);
    const wissen = (Array.isArray(src.wissen) ? src.wissen : []).filter(x => x && typeof x === 'object').map(normalizeWissen);
    const ui = src.ui && typeof src.ui === 'object' ? src.ui : {};
    const closed = ui.closed && typeof ui.closed === 'object' ? { ...ui.closed } : { erledigt: true };
    const platzhalter = {};
    const altPh = ui.platzhalter && typeof ui.platzhalter === 'object' ? ui.platzhalter : {};
    for (const w of wissen) {
      const v = altPh[w.id];
      if (v && typeof v === 'object') platzhalter[w.id] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, str(x)]));
      else if (typeof v === 'string') { const erster = placeholders(w.wert)[0]; if (erster) platzhalter[w.id] = { [erster]: v }; }
    }
    return { version: DATEN_VERSION, notizen, wissen, ui: { closed, platzhalter } };
  }

  return {
    STATUS, PRIOS, PRIO_RANG, DATEN_VERSION,
    startOfDay, endOfDay, tageZwischen,
    parseQuickInput, neueNotiz, istLeer, ersteZeile, uid,
    rrState, faelligeErinnerungen, anzahlFaellig,
    passtNotiz, passtWissen, lanes,
    placeholders, fillTemplate, istLink,
    normalize, normalizeNotiz, normalizeWissen,
  };
});
