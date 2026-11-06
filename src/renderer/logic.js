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
  // Telefon: beginnt mit + oder 0, mindestens 9 Ziffern, erlaubt Leerzeichen / - ( ). Nicht mitten in Wörtern,
  // Links oder Ticketnummern.
  const TELEFON = /(?<![\w#+/.:=-])(?:\+\d|0)[\d /()-]{6,}\d/g;
  const TICKET = [/(?<![\w&])#\s?(\d{3,})\b/, /\bTicket(?:nummer|nr\.?)?\s*:?\s*#?\s*(\d{3,})\b/i];
  const ziffern = (s) => s.replace(/\D/g, '').length;

  /** Teilt die Schnellerfassung auf: Telefon, Ticket, dann "Kunde: Stichpunkt". Links sind kein Kundenname. */
  function parseQuickInput(raw) {
    let v = str(raw).trim();
    let telefon = '', ticket = '';
    for (const m of v.matchAll(TELEFON)) {
      if (ziffern(m[0]) >= 9) { telefon = m[0].trim(); v = v.slice(0, m.index) + ' ' + v.slice(m.index + m[0].length); break; }
    }
    for (const re of TICKET) {
      const m = v.match(re);
      if (m) { ticket = '#' + m[1]; v = v.slice(0, m.index) + ' ' + v.slice(m.index + m[0].length); break; }
    }
    if (telefon || ticket) v = v.replace(/\s+/g, ' ').replace(/\s+([:,;])/g, '$1').replace(/^[\s:,;–-]+|[\s,;–-]+$/g, '');
    let kunde = '', ansprechpartner = '', text = v;
    const i = v.indexOf(':');
    if (i > 0 && i < 60 && v.slice(i, i + 3) !== '://') { kunde = v.slice(0, i).trim(); text = v.slice(i + 1).trim(); }
    // "Kunde / Ansprechpartner" – nur an " / " mit Leerzeichen trennen, damit "A/B GmbH" ganz bleibt (H-9)
    const t = kunde.indexOf(' / ');
    if (t > 0) { ansprechpartner = kunde.slice(t + 3).trim(); kunde = kunde.slice(0, t).trim(); }
    return { kunde, ansprechpartner, text, telefon, ticket };
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function neueNotiz(raw, now = new Date()) {
    const { kunde, ansprechpartner, text, telefon, ticket } = parseQuickInput(raw);
    const iso = now.toISOString();
    return { id: uid(), erstellt: iso, geaendert: iso, kunde, ansprechpartner, ticket, telefon, text,
      status: 'offen', prio: 'normal', rueckruf: null, erinnertFuer: null };
  }

  // ---------- H-8 Ticket-Link ----------
  /** Fehlermeldung für eine ungültige Vorlage, sonst null. Leer = Funktion aus. */
  function pruefeTicketVorlage(vorlage) {
    const v = str(vorlage).trim();
    if (!v) return null;
    if (!/^https?:\/\/[^\s]+$/i.test(v)) return 'Die Vorlage muss mit http:// oder https:// beginnen und darf keine Leerzeichen enthalten.';
    if (!v.includes('<TICKET>')) return 'Die Vorlage braucht den Platzhalter <TICKET>.';
    return null;
  }

  /** URL zum Ticket oder null, wenn Vorlage oder Nummer fehlen. */
  function ticketUrl(vorlage, ticket) {
    const v = str(vorlage).trim();
    const nr = str(ticket).replace(/[#\s]/g, '');
    if (!nr || !v || pruefeTicketVorlage(v)) return null;
    return v.replace(/<TICKET>/g, () => encodeURIComponent(nr));
  }

  const istLeer = (n) => ![n.kunde, n.ansprechpartner, n.text, n.ticket, n.telefon].some(x => str(x).trim());

  /** "Kunde · Ansprechpartner" für Listenzeile und Benachrichtigung (H-9). */
  const kundeMitAnsprechpartner = (n) => [str(n.kunde).trim(), str(n.ansprechpartner).trim()].filter(Boolean).join(' · ');

  // ---------- H-6 Rückruf: getrennte Felder für Datum und Uhrzeit ----------
  const zwei = (x) => String(x).padStart(2, '0');
  /** Datum (JJJJ-MM-TT, lokal) für das Datumsfeld: vorhandener Rückruf oder heute. */
  const rueckrufDatum = (iso, now = new Date()) => { const d = iso ? new Date(iso) : now; return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; };
  /** Uhrzeit (HH:MM, lokal) für das Zeitfeld, leer ohne Rückruf. */
  const rueckrufZeit = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${zwei(d.getHours())}:${zwei(d.getMinutes())}`; };
  /** Datum + Uhrzeit (lokal) → ISO. Ohne gültige Uhrzeit oder Datum: null. */
  function rueckrufAus(datum, zeit) {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(datum)), zm = /^(\d{1,2}):(\d{2})$/.exec(str(zeit));
    if (!dm || !zm || +zm[1] > 23 || +zm[2] > 59) return null;
    const d = new Date(+dm[1], +dm[2] - 1, +dm[3], +zm[1], +zm[2], 0, 0);
    return isNaN(d) ? null : d.toISOString();
  }
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
  const passtNotiz = (n, q) => !q || [n.kunde, n.ansprechpartner, n.ticket, n.telefon, n.text].join(' ').toLowerCase().includes(q);
  const passtWissen = (w, q) => !q || [w.titel, w.wert].join(' ').toLowerCase().includes(q);

  function lanes(notizen, suche = '', now = new Date()) {
    const q = str(suche).trim().toLowerCase();
    const list = notizen.filter(n => passtNotiz(n, q));
    const isJetzt = (n) => n.status !== 'erledigt' && (n.prio === 'hoch' || ['over', 'today'].includes(rrState(n, now)));
    const byPrio = (a, b) => PRIO_RANG[a.prio] - PRIO_RANG[b.prio] || b.geaendert.localeCompare(a.geaendert);
    const jetzt = list.filter(isJetzt).sort((a, b) => (a.rueckruf || '9').localeCompare(b.rueckruf || '9') || byPrio(a, b));
    const rest = (st) => list.filter(n => n.status === st && !isJetzt(n)).sort(byPrio);
    const erl = list.filter(n => n.status === 'erledigt').sort((a, b) => b.geaendert.localeCompare(a.geaendert));
    return [ // leere Spuren werden ausgeblendet (H-4)
      { key: 'jetzt', name: 'Jetzt', items: jetzt },
      { key: 'offen', name: 'Offen', items: rest('offen') },
      { key: 'wartet', name: 'Wartet', items: rest('wartet') },
      { key: 'erledigt', name: 'Erledigt', items: erl },
    ].filter(l => l.items.length);
  }

  // ---------- W-2 Vorlagen ----------
  const PLATZHALTER = /<([^<>\s][^<>]*)>/g;

  /** Eindeutige Platzhalternamen in Reihenfolge des ersten Auftretens. */
  function placeholders(wert) {
    const namen = [];
    for (const m of str(wert).matchAll(PLATZHALTER)) if (!namen.includes(m[1])) namen.push(m[1]);
    return namen;
  }

  /** Ersetzt alle Platzhalter. Leere Werte bleiben als <NAME> stehen. `$` wird wörtlich übernommen.
   *  `url: true` kodiert eingesetzte Werte URL-sicher (W-4). */
  function fillTemplate(wert, werte = {}, { url = false } = {}) {
    return str(wert).replace(PLATZHALTER, (ganz, name) => {
      const v = str((werte || {})[name]).trim();
      return v ? (url ? encodeURIComponent(v) : v) : ganz;
    });
  }

  const istLink = (v) => /^https?:\/\//i.test(str(v).trim());

  // ---------- W-1 / W-2 Wissen: Art erkennen, Eingabe zerlegen, Abschnitte ----------
  const RE_LINK = /\bhttps?:\/\/\S+/i;
  const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const RE_IP = /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\/\d{1,2}|:\d{1,5})?(?![\d.])/;
  const RE_TEL = /(?<![\w#+/.:=-])(?:\+\d|0)[\d /()-]{4,}\d(?![\d])/;
  const istPort = (v) => /^\d{1,5}$/.test(v) && +v >= 1 && +v <= 65535;

  /** Art eines Wissens-Werts: telefon | email | link | ip | port | befehl. */
  function wissenTyp(wert) {
    const v = str(wert).trim();
    if (/^https?:\/\/\S+$/i.test(v)) return 'link';
    if (new RegExp(`^${RE_EMAIL.source}$`).test(v)) return 'email';
    if (new RegExp(`^${RE_IP.source}$`).test(v)) return 'ip';
    if (istPort(v)) return 'port';
    const tel = v.match(new RegExp(`^${RE_TEL.source}$`));
    if (tel && ziffern(v) >= 6) return 'telefon';
    return 'befehl';
  }

  /** "Name: Wert" oder "Name mit Wert darin" → { titel, wert }. */
  function parseWissenEingabe(raw) {
    const v = str(raw).trim().replace(/\s+/g, ' ');
    if (!v) return { titel: '', wert: '' };
    const doppel = /^([^:]{1,60}?):\s+(.+)$/.exec(v);
    if (doppel && !/^https?$/i.test(doppel[1])) return { titel: doppel[1].trim(), wert: doppel[2].trim() };
    const rest = (m) => (v.slice(0, m.index) + ' ' + v.slice(m.index + m[0].length)).replace(/\s+/g, ' ').replace(/^[\s:,;–-]+|[\s:,;–-]+$/g, '');
    for (const re of [RE_LINK, RE_EMAIL, RE_IP]) {
      const m = v.match(re);
      if (m) return { titel: rest(m), wert: m[0] };
    }
    const tel = v.match(RE_TEL);
    if (tel && ziffern(tel[0]) >= 6) return { titel: rest(tel), wert: tel[0].trim() };
    const port = /^(.+?)\s+(\d{1,5})$/.exec(v);
    if (port && istPort(port[2])) return { titel: port[1], wert: port[2] };
    return { titel: '', wert: v };
  }

  const WISSEN_ARTEN = [
    { key: 'favoriten', name: 'Favoriten' },
    { key: 'kontakt', name: 'Telefon und E-Mail', typen: ['telefon', 'email'] },
    { key: 'link', name: 'Links', typen: ['link'] },
    { key: 'ip', name: 'IP-Adressen', typen: ['ip'] },
    { key: 'port', name: 'Ports', typen: ['port'] },
    { key: 'befehl', name: 'Befehle und Texte', typen: ['befehl'] },
  ];
  const wissenSortierung = (a, b) => (a.titel || a.wert).localeCompare(b.titel || b.wert, 'de', { sensitivity: 'base' });

  /** Abschnitte in fester Reihenfolge, Favoriten zuerst, leere ausgeblendet (W-2). */
  function wissenAbschnitte(liste, suche = '') {
    const q = str(suche).trim().toLowerCase();
    const treffer = liste.filter(w => passtWissen(w, q));
    return WISSEN_ARTEN.map(art => ({
      key: art.key, name: art.name,
      items: treffer.filter(w => art.key === 'favoriten' ? w.favorit : !w.favorit && art.typen.includes(wissenTyp(w.wert))).sort(wissenSortierung),
    })).filter(a => a.items.length);
  }

  /** Favoriten in Anzeigereihenfolge (für Alt+1–9, W-5). */
  const favoriten = (liste) => liste.filter(w => w.favorit).sort(wissenSortierung);

  // ---------- H-10 Notiz als Text ----------
  function notizAlsText(n, now = new Date()) {
    const zeilen = [];
    const feld = (label, wert) => { if (str(wert).trim()) zeilen.push(`${label}: ${str(wert).trim()}`); };
    feld('Kunde', n.kunde);
    feld('Ansprechpartner', n.ansprechpartner);
    feld('Telefon', n.telefon);
    feld('Ticket', n.ticket);
    feld('Status', { offen: 'Offen', wartet: 'Wartet', erledigt: 'Erledigt' }[n.status]);
    if (n.rueckruf) {
      const d = new Date(n.rueckruf);
      feld('Rückruf', `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()} ${zwei(d.getHours())}:${zwei(d.getMinutes())} Uhr`);
    }
    const text = str(n.text).trim();
    if (text) { if (zeilen.length) zeilen.push(''); zeilen.push(text); }
    return zeilen.join('\n');
  }

  // ---------- D-5 Normalisierung ----------
  function normalizeNotiz(n) {
    const jetzt = new Date().toISOString();
    const erstellt = isoOderNull(n && n.erstellt) || jetzt;
    return {
      id: str(n && n.id) || uid(),
      erstellt,
      geaendert: isoOderNull(n && n.geaendert) || erstellt,
      kunde: str(n && n.kunde),
      ansprechpartner: str(n && n.ansprechpartner),
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
    return { id: str(w && w.id) || uid(), titel: str(w && w.titel), wert: str(w && w.wert), favorit: !!(w && w.favorit),
      gruppe: str(w && w.gruppe) }; // gruppe nur noch aus 1.0/1.1, wird nicht mehr angezeigt
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
    parseQuickInput, neueNotiz, istLeer, ersteZeile, uid, pruefeTicketVorlage, ticketUrl,
    kundeMitAnsprechpartner, rueckrufDatum, rueckrufZeit, rueckrufAus,
    rrState, faelligeErinnerungen, anzahlFaellig,
    passtNotiz, passtWissen, lanes,
    placeholders, fillTemplate, istLink, wissenTyp, parseWissenEingabe, wissenAbschnitte, favoriten, notizAlsText,
    normalize, normalizeNotiz, normalizeWissen,
  };
});
