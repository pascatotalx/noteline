// Noteline – Statusmonitor (Spezifikation S-1 bis S-4).
// Reines Node-Modul ohne Electron: liest öffentliche Statusseiten aus und ermittelt Änderungen.
// Es werden ausschließlich lesende GET-Abrufe gemacht, nie eigene Daten gesendet (Constitution 2).
'use strict';

const ZEITLIMIT_MS = 15000;
const MAX_BYTES = 2 * 1024 * 1024; // Antworten von Statusseiten höchstens 2 MB (D-7)
const RANG = { ok: 0, wartung: 1, stoerung: 2, ausfall: 3 };
const rang = (z) => (z in RANG ? RANG[z] : -1);

/** Mitgelieferte Vorlagen, standardmäßig nicht angehakt (S-1). */
const VORLAGEN = [
  { id: 'ti', name: 'TI-Lagebild (gematik)', art: 'ti', url: 'https://ti-lage.prod.ccs.gematik.solutions/lageapi/v1/tistatus/incident',
    link: 'https://fachportal.gematik.de/ti-status', aktiv: false },
  { id: 'doctolib', name: 'Doctolib', art: 'statuspage', url: 'https://status.doctolib.com', link: 'https://status.doctolib.com', aktiv: false },
];

/** Text aus fremden Quellen ohne HTML (S-3): <br> wird Zeilenumbruch, Tags fallen weg, Entities werden aufgelöst. */
function klartext(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/#br#/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

const schlimmster = (zustaende) => zustaende.reduce((a, z) => (rang(z) > rang(a) ? z : a), 'ok');

// ---------- Quellen auslesen ----------

/** gematik TI-Status-API: offene Einschränkungen (ohne closedAt). 1 = Ausfall, 4 = Teilausfall, 2 = erholt sich. */
function ausTiLage(json) {
  if (!json || json.success !== true || !Array.isArray(json.data)) throw new Error('Unerwartete Antwort der TI-Status-API');
  const meldungen = json.data.filter(x => x && !x.closedAt).map(x => {
    const schritte = Array.isArray(x.steps) ? [...x.steps].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))) : [];
    const letzter = schritte[0] || {};
    const status = Number(letzter.status ?? x.status);
    let zustand = status === 1 ? 'ausfall' : 'stoerung';
    if (letzter.hasMaintenance && status !== 1) zustand = 'wartung';
    const apps = Array.isArray(x.app) ? x.app.join(', ') : '';
    return {
      schluessel: 'ti-' + x.id,
      titel: klartext(x.title) || ('Einschränkung' + (apps ? ' bei ' + apps : '')),
      text: (status === 2 ? 'Erholt sich gerade. ' : '') + klartext(letzter.message),
      seit: x.createdAt || null,
      zustand,
    };
  });
  return { zustand: schlimmster(meldungen.map(m => m.zustand)), meldungen };
}

const IMPACT = { none: 'stoerung', minor: 'stoerung', major: 'ausfall', critical: 'ausfall', maintenance: 'wartung' };
const INDIKATOR = { none: 'ok', minor: 'stoerung', major: 'ausfall', critical: 'ausfall', maintenance: 'wartung' };
const KOMPONENTE = { operational: 'ok', degraded_performance: 'stoerung', partial_outage: 'stoerung', major_outage: 'ausfall', under_maintenance: 'wartung' };

/** Statuspage-Format (/api/v2/summary.json): Gesamtstatus, offene Vorfälle, laufende Wartungen, gestörte Komponenten. */
function ausStatuspage(json) {
  if (!json || !json.status || typeof json.status.indicator !== 'string') throw new Error('Keine Statusseite im erwarteten Format');
  const meldungen = [];
  for (const v of Array.isArray(json.incidents) ? json.incidents : []) {
    if (['resolved', 'postmortem'].includes(v.status)) continue;
    const update = Array.isArray(v.incident_updates) && v.incident_updates[0];
    meldungen.push({ schluessel: 'vorfall-' + v.id, titel: klartext(v.name), text: klartext(update && update.body), seit: v.created_at || null, zustand: IMPACT[v.impact] || 'stoerung' });
  }
  for (const w of Array.isArray(json.scheduled_maintenances) ? json.scheduled_maintenances : []) {
    if (w.status !== 'in_progress') continue;
    meldungen.push({ schluessel: 'wartung-' + w.id, titel: klartext(w.name), text: 'Geplante Wartung läuft.', seit: w.started_at || w.scheduled_for || null, zustand: 'wartung' });
  }
  if (!meldungen.length) {
    for (const k of Array.isArray(json.components) ? json.components : []) {
      const z = KOMPONENTE[k.status];
      if (z && z !== 'ok' && !k.group) meldungen.push({ schluessel: 'komponente-' + k.id, titel: klartext(k.name), text: '', seit: k.updated_at || null, zustand: z });
    }
  }
  const zustand = schlimmster([INDIKATOR[json.status.indicator] || 'ok', ...meldungen.map(m => m.zustand)]);
  return { zustand, meldungen };
}

/** Erreichbarkeit: HTTP 200–399 = erreichbar, sonst Ausfall. */
function ausErreichbarkeit(httpStatus) {
  if (httpStatus >= 200 && httpStatus < 400) return { zustand: 'ok', meldungen: [] };
  return { zustand: 'ausfall', meldungen: [{ schluessel: 'http-' + httpStatus, titel: 'Nicht erreichbar', text: `Die Seite antwortet mit Fehler ${httpStatus}.`, seit: null, zustand: 'ausfall' }] };
}

// ---------- Abruf ----------

const mitZeitlimit = (fetchFn, url, ms = ZEITLIMIT_MS) => fetchFn(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(ms),
  headers: { Accept: 'application/json, text/html;q=0.8' } });
/** Antwort lesen, aber nie mehr als MAX_BYTES (D-7). Bricht den Abruf ab, sobald die Grenze überschritten ist. */
async function textBegrenzt(r) {
  const laenge = Number(r.headers && r.headers.get && r.headers.get('content-length'));
  if (laenge > MAX_BYTES) throw new Error('Antwort zu groß');
  if (!r.body || typeof r.body.getReader !== 'function') {
    const t = await r.text();
    if (Buffer.byteLength(t) > MAX_BYTES) throw new Error('Antwort zu groß');
    return t;
  }
  const leser = r.body.getReader();
  const teile = [];
  let gelesen = 0;
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    gelesen += value.length;
    if (gelesen > MAX_BYTES) { await leser.cancel(); throw new Error('Antwort zu groß'); }
    teile.push(Buffer.from(value));
  }
  return Buffer.concat(teile).toString('utf8');
}
const jsonBegrenzt = async (r) => JSON.parse(await textBegrenzt(r));
/** Für reine Erreichbarkeit wird der Inhalt nicht gebraucht: Abruf beenden. */
const verwerfen = (r) => { try { if (r.body && typeof r.body.cancel === 'function') r.body.cancel().catch(() => {}); } catch { /* egal */ } };

const summaryUrl = (url) => new URL('/api/v2/summary.json', /^https?:\/\//i.test(url) ? url : 'https://' + url).toString();

/** Prüft eine Quelle. Liefert immer ein Ergebnis, nie eine Ausnahme. */
async function pruefeQuelle(quelle, fetchFn, jetzt = () => new Date()) {
  const basis = { id: quelle.id, name: quelle.name, art: quelle.art, link: quelle.link || quelle.url, geprueft: jetzt().toISOString() };
  try {
    if (quelle.art === 'ti') {
      const r = await mitZeitlimit(fetchFn, quelle.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { ...basis, ...ausTiLage(await jsonBegrenzt(r)) };
    }
    if (quelle.art === 'statuspage') {
      const r = await mitZeitlimit(fetchFn, summaryUrl(quelle.url));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { ...basis, ...ausStatuspage(await jsonBegrenzt(r)) };
    }
    const r = await mitZeitlimit(fetchFn, /^https?:\/\//i.test(quelle.url) ? quelle.url : 'https://' + quelle.url);
    verwerfen(r);
    return { ...basis, ...ausErreichbarkeit(r.status) };
  } catch (e) {
    return { ...basis, zustand: 'unbekannt', meldungen: [], fehler: kurz(e), netzwerkFehler: true };
  }
}

/**
 * Prüft alle aktiven Quellen. Antwortet eine reine Erreichbarkeits-Quelle gar nicht, während andere Quellen
 * erreichbar sind, gilt sie als Ausfall. Sind alle unerreichbar, liegt es vermutlich am eigenen Internet: „unbekannt“.
 */
async function pruefeAlle(quellen, fetchFn, jetzt) {
  const aktiv = quellen.filter(q => q.aktiv);
  const ergebnisse = await Promise.all(aktiv.map(q => pruefeQuelle(q, fetchFn, jetzt)));
  const internetOk = ergebnisse.some(e => !e.netzwerkFehler);
  return ergebnisse.map(e => (e.art === 'erreichbar' && e.netzwerkFehler && internetOk)
    ? { ...e, zustand: 'ausfall', meldungen: [{ schluessel: 'keine-antwort', titel: 'Nicht erreichbar', text: 'Die Seite antwortet nicht.', seit: null, zustand: 'ausfall' }] }
    : e);
}

/** Erkennt für eine eigene Quelle die Art: TI-API, Statusseite oder Erreichbarkeit (S-2). */
async function erkenneArt(url, fetchFn) {
  const voll = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  let u;
  try { u = new URL(voll); } catch { return { ok: false, fehler: 'Ungültige Adresse' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, fehler: 'Nur http- und https-Adressen' };
  if (/\/lageapi\/v1\/tistatus\/incident/.test(u.pathname)) return { ok: true, art: 'ti', url: u.toString() };
  try {
    const r = await mitZeitlimit(fetchFn, summaryUrl(u.toString()), 10000);
    if (r.ok) { ausStatuspage(await jsonBegrenzt(r)); return { ok: true, art: 'statuspage', url: u.origin }; }
    verwerfen(r);
  } catch { /* keine Statusseite */ }
  try {
    const r = await mitZeitlimit(fetchFn, u.toString(), 10000);
    verwerfen(r);
    return { ok: true, art: 'erreichbar', url: u.toString(), hinweis: r.status < 400 ? '' : `Antwortet derzeit mit Fehler ${r.status}` };
  } catch (e) { return { ok: true, art: 'erreichbar', url: u.toString(), hinweis: 'Antwortet derzeit nicht' }; }
}

// ---------- Änderungen und Gesamtbild ----------

/**
 * Vergleicht alte und neue Ergebnisse je Quelle und liefert die zu meldenden Änderungen (S-4).
 * Quellen ohne vorheriges Ergebnis oder mit „unbekannt“ (alt oder neu) lösen nichts aus.
 */
function aenderungen(alt, neu) {
  const altNachId = new Map((alt || []).map(e => [e.id, e]));
  const meldungen = [];
  for (const n of neu || []) {
    const a = altNachId.get(n.id);
    if (!a || a.zustand === 'unbekannt' || n.zustand === 'unbekannt') continue;
    const alteSchluessel = new Set((a.meldungen || []).map(m => m.schluessel));
    const neue = (n.meldungen || []).filter(m => !alteSchluessel.has(m.schluessel));
    if (rang(n.zustand) > rang(a.zustand) || neue.length) {
      const m = neue[0] || (n.meldungen || [])[0] || {};
      meldungen.push({ id: n.id, name: n.name, typ: 'stoerung', zustand: n.zustand, titel: m.titel || '', text: m.text || '' });
    } else if (rang(n.zustand) < rang(a.zustand)) {
      meldungen.push({ id: n.id, name: n.name, typ: n.zustand === 'ok' ? 'behoben' : 'besser', zustand: n.zustand, titel: '', text: '' });
    }
  }
  return meldungen;
}

/** Gesamtbild für das Statusfeld: schlimmster bekannter Zustand und Zahl betroffener Dienste. */
function gesamt(ergebnisse) {
  const liste = ergebnisse || [];
  if (!liste.length) return { zustand: 'aus', betroffen: 0 };
  const bekannt = liste.filter(e => e.zustand !== 'unbekannt');
  if (!bekannt.length) return { zustand: 'unbekannt', betroffen: 0 };
  return { zustand: schlimmster(bekannt.map(e => e.zustand)), betroffen: bekannt.filter(e => e.zustand !== 'ok').length, unbekannt: liste.length - bekannt.length };
}

/** Status-Einstellungen mit Vorlagen ergänzen (neue Vorlagen erscheinen auch bei bestehenden Einstellungen). */
function statusEinstellungen(e) {
  const s = e && typeof e === 'object' ? e : {};
  const quellen = Array.isArray(s.quellen) ? s.quellen.filter(q => q && q.id && q.url && ['ti', 'statuspage', 'erreichbar'].includes(q.art)) : [];
  for (const v of VORLAGEN) if (!quellen.some(q => q.id === v.id)) quellen.push({ ...v });
  // Standard 5 Minuten (1.4.1). Ein gespeicherter Abstand zählt nur, wenn er selbst gewählt wurde – der alte Standard 15 nicht.
  const gewaehlt = !!s.intervallGewaehlt && [5, 15, 30].includes(s.intervall);
  return { aktiv: !!s.aktiv, intervall: gewaehlt ? s.intervall : 5, intervallGewaehlt: gewaehlt, quellen };
}

function kurz(e) {
  const t = String((e && (e.name === 'TimeoutError' ? 'Zeitüberschreitung' : e.message)) || e || 'Fehler').split('\n')[0];
  return t.length > 120 ? t.slice(0, 117) + '…' : t;
}

module.exports = { MAX_BYTES, textBegrenzt, VORLAGEN, RANG, klartext, ausTiLage, ausStatuspage, ausErreichbarkeit, pruefeQuelle, pruefeAlle, erkenneArt, aenderungen, gesamt, statusEinstellungen };
