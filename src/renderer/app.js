// Noteline – Oberfläche (Zustand, Rendering, Ereignisse).
// Reine Logik liegt in logic.js (window.NL), die Kennungen verweisen auf specs/specification.md.
'use strict';
const NL = window.NL;

// ---------- Brücke zum Hauptprozess (Fallback: normaler Browser zum Ansehen der Oberfläche) ----------
const bridge = window.api || (() => {
  const KEY = 'noteline-daten';
  const lesen = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const schreiben = (j) => { try { localStorage.setItem(KEY, j); } catch {} return true; };
  return {
    laden: async () => ({ status: lesen() ? 'ok' : 'neu', daten: lesen(), ordner: 'Browser (localStorage)' }),
    speichern: async (j) => schreiben(j), speichernSofort: (j) => ({ ok: schreiben(j) }),
    immerVorne: async (an) => an, istImmerVorne: async () => false,
    autostart: async () => ({ an: false, moeglich: false }),
    ordnerOeffnen: async () => {}, linkOeffnen: async (u) => window.open(u, '_blank', 'noopener'),
    erinnern: async ({ titel, text }) => { try { if (Notification.permission === 'granted') new Notification(titel, { body: text }); } catch {} },
    version: async () => 'Browser', updateSuchen: async () => ({ zustand: 'dev', text: 'Im Browser gibt es keine Updates.' }),
    updateStatus: async () => ({ zustand: 'dev', text: 'Im Browser gibt es keine Updates.' }), updateInstallieren: async () => {},
    beiNotizOeffnen: () => {}, beiUpdateStatus: () => {},
  };
})();

// ---------- Zustand ----------
let D = NL.normalize(null);
const S = {
  tab: 'hotline', q: '', openId: null, settingsOpen: false, rrOpen: false,
  copied: null, editW: null, wDraft: null, focusForm: false, armedDelete: false, firstRender: true,
  schutz: null, ordner: '', version: '', update: { zustand: 'idle' }, autostart: { an: false, moeglich: false }, immerVorne: false,
};
let saveTimer = null;

function datenJson() { return JSON.stringify(D, null, 1); }

/** Speichern: verzögert (Standard), sofort asynchron (true) oder synchron beim Beenden ('sync'). D-3, D-4 */
function save(modus) {
  if (S.schutz) return;
  clearTimeout(saveTimer); saveTimer = null;
  if (modus === 'sync') { const r = bridge.speichernSofort(datenJson()); if (r && !r.ok) console.error(r.fehler); return; }
  const run = () => { saveTimer = null; bridge.speichern(datenJson()).catch(() => toast('Speichern fehlgeschlagen')); };
  if (modus) return run();
  saveTimer = setTimeout(run, 250);
}
function schreibgeschuetzt() {
  if (!S.schutz) return false;
  toast('Schutzmodus: Speichern ist gesperrt');
  return true;
}

// ---------- Hilfen ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowIso = () => new Date().toISOString();
const fTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const fDay = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
const fDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
const fFull = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fClock = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

function relDate(iso) {
  if (!iso) return '';
  const d = new Date(iso), diff = NL.tageZwischen(d, new Date());
  if (diff === 0) return fTime.format(d);
  if (diff === 1) return 'Gestern';
  if (diff > 1 && diff < 7) return fDay.format(d).replace('.', '');
  return fDate.format(d);
}
function rrLabel(iso) {
  const d = new Date(iso), diff = NL.tageZwischen(new Date(), d);
  if (diff === 0) return fTime.format(d);
  if (diff === 1) return 'morgen ' + fTime.format(d);
  if (diff > 1 && diff < 7) return fDay.format(d).replace('.', '') + ' ' + fTime.format(d);
  return fDate.format(d) + ' ' + fTime.format(d);
}
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso), p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const PRIO = { hoch: { c: 'var(--pink)', l: 'Hoch' }, normal: { c: 'rgba(255,255,255,.55)', l: 'Normal' }, niedrig: { c: 'rgba(255,255,255,.18)', l: 'Niedrig' } };
const LANE_FARBE = { jetzt: 'var(--pink)', offen: 'var(--cyan)', wartet: 'var(--amber)', erledigt: 'var(--lime)' };
const svg = (w, sw, inner, stroke = 'currentColor') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
// Symbole: Lucide (https://lucide.dev), ISC-Lizenz – siehe THIRD_PARTY_NOTICES.md
const ICON = {
  check: svg(15, 2.25, '<path d="M20 6 9 17l-5-5"/>'),
  undo: svg(15, 2, '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  chev: svg(14, 2, '<path d="m9 18 6-6-6-6"/>').replace('<svg', '<svg class="chev"'),
  edit: svg(14, 1.75, '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  ext: svg(14, 1.75, '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  saved: svg(13, 2.25, '<path d="M20 6 9 17l-5-5"/>', 'var(--lime)'),
};

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
}
async function copyText(text, key) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  S.copied = key; render();
  clearTimeout(copyText.t); copyText.t = setTimeout(() => { S.copied = null; render(); }, 1400);
}

// ---------- Hotline (H-1 – H-7) ----------
function rowHtml(n) {
  const st = NL.rrState(n);
  let right = relDate(n.erstellt), col = 'rgba(255,255,255,.7)';
  if (st) { right = 'Rückruf ' + rrLabel(n.rueckruf); col = st === 'over' ? 'var(--pink)' : st === 'today' ? 'var(--amber)' : '#fff'; }
  const done = n.status === 'erledigt';
  return `<li class="row${done ? ' done' : ''}">
    <span class="bar" style="background:${PRIO[n.prio].c}" title="Priorität ${PRIO[n.prio].l}"></span>
    <button class="row-main" type="button" data-open="${esc(n.id)}">
      <span class="row-title"><span class="kunde">${esc(n.kunde || 'Ohne Kunde')}</span>${n.ticket ? `<span class="ticket" translate="no">${esc(n.ticket)}</span>` : ''}</span>
      <span class="snippet">${esc(NL.ersteZeile(n.text) || 'Keine Stichpunkte')}</span>
    </button>
    <span class="right num" style="color:${col}">${esc(right)}</span>
    <span class="quick"><button class="q-btn press${done ? '' : ' ok'}" type="button" data-done="${esc(n.id)}" title="${done ? 'Wieder öffnen' : 'Erledigt'}"><span class="sr">${done ? 'Wieder öffnen' : 'Als erledigt markieren'}</span>${done ? ICON.undo : ICON.check}</button></span>
  </li>`;
}
function renderHotline(anim) {
  const ls = NL.lanes(D.notizen, S.q);
  const total = ls.reduce((a, l) => a + l.items.length, 0);
  if (!total) {
    return S.q.trim()
      ? `<div class="empty${anim}"><strong>Nichts gefunden</strong><span>Enter legt „${esc(S.q.trim())}“ als neue Notiz an.</span></div>`
      : `<div class="empty${anim}"><strong>Noch keine Notizen</strong><span>Oben tippen und Enter drücken, oder Strg+N.<br>Tipp: „Kunde: Stichpunkt“ füllt den Kunden gleich mit aus.</span></div>`;
  }
  return ls.map((l, i) => {
    const open = !D.ui.closed[l.key] || !!S.q.trim();
    return `<section class="lane${anim}" style="animation-delay:${i * 50}ms">
      <button class="lane-head press" type="button" aria-expanded="${open}" data-lane="${l.key}">${ICON.chev}<span class="dot" style="background:${LANE_FARBE[l.key]}"></span><span class="lane-name">${l.name}</span><span class="count num">${l.items.length}</span></button>
      ${open ? `<ul class="rows">${l.items.map(rowHtml).join('')}</ul>` : ''}
    </section>`;
  }).join('');
}

// ---------- Wissen (W-1 – W-3) ----------
const genOutHtml = (w) => NL.fillTemplate(w.wert, D.ui.platzhalter[w.id]).split(' ').map(x => `<b>${esc(x)}</b>`).join(' ');

function renderWissen(anim) {
  const q = S.q.trim().toLowerCase();
  const items = D.wissen.filter(w => NL.passtWissen(w, q));
  const gens = items.filter(w => NL.placeholders(w.wert).length);
  let html = gens.map(w => {
    const werte = D.ui.platzhalter[w.id] || {};
    const felder = NL.placeholders(w.wert).map(name => `<label><span translate="no">${esc(name)}</span><input class="field" type="text" autocomplete="off" spellcheck="false" data-ph="${esc(w.id)}" data-phname="${esc(name)}" value="${esc(werte[name] || '')}" placeholder="${esc(name)} eingeben …"></label>`).join('');
    const ok = S.copied === 'gen' + w.id;
    return `<section class="gen${anim}">
      <div class="gen-head"><h2 class="sec-title">${esc(w.titel)}</h2><button class="w-tool press" type="button" data-wedit="${esc(w.id)}" title="Bearbeiten"><span class="sr">Bearbeiten</span>${ICON.edit}</button></div>
      <div class="gen-fields">${felder}</div>
      <div class="gen-out"><code translate="no" data-genout="${esc(w.id)}">${genOutHtml(w)}</code><button class="btn-copy press${ok ? ' ok' : ''}" type="button" data-gencopy="${esc(w.id)}">${ok ? 'Kopiert' : 'Kopieren'}</button></div>
      ${S.editW === w.id ? formHtml(w) : ''}
    </section>`;
  }).join('');
  const rest = items.filter(w => !gens.includes(w));
  const groups = [...new Set(rest.map(w => w.gruppe))].sort((a, b) => a.localeCompare(b, 'de'));
  html += groups.map((g, gi) => `<section class="w-group${anim}" style="animation-delay:${(gi + 1) * 50}ms"><h2 class="sec-title">${esc(g)}</h2>${rest.filter(w => w.gruppe === g).map(w => {
    if (S.editW === w.id) return formHtml(w);
    const ok = S.copied === 'w' + w.id, url = NL.istLink(w.wert);
    return `<div class="w-row">
      <button class="w-main" type="button" data-wcopy="${esc(w.id)}" title="${url ? 'Link kopieren' : 'Kopieren'}"><span class="sr">${esc(w.titel)} kopieren</span></button>
      <span class="w-titel">${esc(w.titel)}</span>
      <span class="w-wert" translate="no">${esc(url ? w.wert.replace(/^https?:\/\//i, '') : w.wert)}</span>
      <span class="w-side">
        <span class="w-tools">${url ? `<button class="w-tool press" type="button" data-wopen="${esc(w.id)}" title="Im Browser öffnen"><span class="sr">Im Browser öffnen</span>${ICON.ext}</button>` : ''}<button class="w-tool press" type="button" data-wedit="${esc(w.id)}" title="Bearbeiten"><span class="sr">Bearbeiten</span>${ICON.edit}</button></span>
        <span class="w-hint${ok ? ' ok' : ''}">${ok ? 'Kopiert' : (url ? 'Link' : 'Kopieren')}</span>
      </span>
    </div>`;
  }).join('')}</section>`).join('');
  if (S.editW === 'neu') html += formHtml({ id: 'neu', gruppe: groups[0] || '', titel: '', wert: '' });
  else if (!q) {
    if (!D.wissen.length) html += `<div class="empty${anim}"><strong>Noch keine Einträge</strong><span>Ports, IPs, Links und Befehle zum schnellen Kopieren. Ein Wert mit &lt;PLATZHALTER&gt; wird zum Ausfüll-Generator.</span></div>`;
    html += `<button class="add-btn press" type="button" id="wAdd">+ Eintrag hinzufügen</button>`;
  }
  if (!items.length && q) html = `<div class="empty"><strong>Nichts gefunden</strong><span>Kein Eintrag passt zu „${esc(S.q.trim())}“.</span></div>`;
  return `<div style="padding:0 6px">${html}</div>`;
}
function formHtml(w) {
  const v = S.wDraft && S.wDraft.id === w.id ? S.wDraft : w; // angefangene Eingaben gehen nie verloren (W-1)
  const groups = [...new Set(D.wissen.map(x => x.gruppe).filter(Boolean))];
  return `<form class="w-form" data-wform="${esc(w.id)}">
    <div class="grid">
      <label>Gruppe<input class="field" name="gruppe" list="gruppen" value="${esc(v.gruppe)}" autocomplete="off" placeholder="z. B. Ports …"></label>
      <label>Bezeichnung<input class="field" name="titel" value="${esc(v.titel)}" autocomplete="off" placeholder="z. B. Fernwartung …"></label>
    </div>
    <label>Wert<input class="field mono" name="wert" value="${esc(v.wert)}" autocomplete="off" spellcheck="false" placeholder="Port, IP, Link oder Befehl mit &lt;PLATZHALTER&gt; …"></label>
    <datalist id="gruppen">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist>
    <div class="actions">${w.id !== 'neu' ? `<button class="btn-ghost danger press" type="button" data-wdel="${esc(w.id)}">${S.armedDelete === 'w' + w.id ? 'Wirklich löschen?' : 'Löschen'}</button>` : ''}<span style="flex-grow:1"></span><button class="btn-ghost press" type="button" data-wcancel>Abbrechen</button><button class="btn-copy press" type="submit">Speichern</button></div>
  </form>`;
}
function setEditW(id) { S.editW = id; S.wDraft = null; S.armedDelete = false; S.focusForm = !!id; }

// ---------- Rendering ----------
/** Sichert Formularentwurf und Fokus, damit Neuzeichnen im Hintergrund nichts zerstört (W-1). */
function zustandSichern(main) {
  const f = main.querySelector('.w-form');
  if (f && f.dataset.wform === S.editW) { const fd = new FormData(f); S.wDraft = { id: f.dataset.wform, gruppe: fd.get('gruppe'), titel: fd.get('titel'), wert: fd.get('wert') }; }
  const a = document.activeElement;
  if (!a || !main.contains(a)) return null;
  let sel = null;
  if (a.dataset.ph) sel = `[data-ph="${CSS.escape(a.dataset.ph)}"][data-phname="${CSS.escape(a.dataset.phname)}"]`;
  else if (a.name && a.closest('.w-form')) sel = `.w-form [name="${a.name}"]`;
  return sel ? { sel, start: a.selectionStart, end: a.selectionEnd } : null;
}
function render() {
  const anim = S.firstRender ? ' enter' : '';
  S.firstRender = false;
  const main = $('#main'), st = main.scrollTop;
  const fokus = zustandSichern(main);
  main.innerHTML = S.tab === 'hotline' ? renderHotline(anim) : renderWissen(anim);
  main.scrollTop = st;
  if (S.focusForm) {
    const f = main.querySelector(S.editW === 'neu' ? '.w-form [name="gruppe"]' : '.w-form [name="titel"]');
    if (f) f.focus();
    S.focusForm = false;
  } else if (fokus) {
    const el = main.querySelector(fokus.sel);
    if (el) { el.focus(); try { el.setSelectionRange(fokus.start, fokus.end); } catch {} }
  }
  const due = NL.anzahlFaellig(D.notizen);
  const b = $('#badge'); b.hidden = !due; b.textContent = due;
  const q = $('#q');
  q.placeholder = S.tab === 'hotline' ? 'Notieren oder suchen …' : 'Port, IP oder Link suchen …';
  const hasQ = !!S.q.trim() && S.tab === 'hotline';
  $('#qCreate').hidden = !hasQ; $('#qKbd').hidden = hasQ;
  $('#pill').style.transform = S.tab === 'hotline' ? 'translateX(0)' : 'translateX(116px)';
  document.querySelectorAll('nav button').forEach(x => x.setAttribute('aria-current', x.dataset.tab === S.tab ? 'page' : 'false'));
}
function setTab(t) { if (S.tab === t) return; S.tab = t; S.q = ''; $('#q').value = ''; setEditW(null); S.firstRender = true; render(); }

function renderBanner() {
  let html = '';
  if (S.schutz) {
    html = `<div class="banner schutz" role="alert">
      <div><strong>Schutzmodus: Es wird nichts gespeichert.</strong><br>
      Die Datei daten.json konnte nicht gelesen werden (${esc(S.schutz.fehler)}).
      Datei reparieren oder ein Backup als daten.json in den Datenordner kopieren, dann Noteline neu starten.
      ${S.schutz.kopie ? `<div class="b-mono">Sicherungskopie im Datenordner: ${esc(S.schutz.kopie.split(/[\\/]/).pop())}</div>` : ''}</div>
      <div class="b-actions"><button class="btn-ghost press" type="button" data-set="ordner">Datenordner öffnen</button><button class="btn-ghost press" type="button" data-set="backups">Backups öffnen</button></div>
    </div>`;
  } else if (S.update.zustand === 'bereit') {
    html = `<div class="banner update"><span class="b-text"><strong>Update ${esc(S.update.version)} bereit.</strong> Wird sonst beim Beenden installiert.</span><button class="btn-copy press" type="button" data-set="install">Jetzt neu starten</button></div>`;
  }
  $('#banner').innerHTML = html;
  $('#setBadge').hidden = S.update.zustand !== 'bereit';
}

// ---------- Notizen ----------
function createNote(raw, instant) {
  if (schreibgeschuetzt()) return;
  const n = NL.neueNotiz(raw);
  D.notizen.unshift(n); save();
  S.q = ''; $('#q').value = '';
  S.tab = 'hotline';
  render(); openSheet(n.id, instant, !n.kunde);
}
const findN = (id) => D.notizen.find(n => n.id === id);
function upd(id, patch) { const n = findN(id); if (!n) return; Object.assign(n, patch, { geaendert: nowIso() }); save(); render(); }

function openSheet(id, instant, focusKunde) {
  const n = findN(id); if (!n) return;
  if (S.settingsOpen) closeSheet();
  S.openId = id; S.armedDelete = false; S.rrOpen = false;
  $('#sheetHost').innerHTML = `<div class="backdrop${instant ? ' instant' : ''}">
    <button class="closer" type="button" tabindex="-1" data-close><span class="sr">Schließen</span></button>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="Anrufnotiz">
      <span class="grab" aria-hidden="true"></span>
      <div class="s-head">
        <div class="s-titlewrap">
          <input class="s-kunde" id="sKunde" type="text" autocomplete="off" placeholder="Kunde …" value="${esc(n.kunde)}" aria-label="Kunde">
          <span class="s-meta num" id="sMeta"></span>
        </div>
        <button class="btn-white press" type="button" data-close>Fertig</button>
      </div>
      <div class="s-body">
        <div class="chips" id="sChips"></div>
        <div id="sRR"></div>
        <div class="s-fields">
          <label>Ticket<input class="field" id="sTicket" type="text" autocomplete="off" spellcheck="false" placeholder="z. B. #12345 …" value="${esc(n.ticket)}"></label>
          <label>Telefon<input class="field" id="sTel" type="tel" inputmode="tel" autocomplete="off" placeholder="Rückrufnummer …" value="${esc(n.telefon)}"></label>
        </div>
        <textarea class="s-text" id="sText" aria-label="Stichpunkte" placeholder="Stichpunkte zum Anruf …">${esc(n.text)}</textarea>
        <div class="s-foot"><span class="saved">${ICON.saved}<span>${S.schutz ? 'Schutzmodus: nicht gespeichert' : 'Automatisch gespeichert'}</span></span><button class="link-danger" type="button" id="sDel">Notiz löschen</button></div>
      </div>
    </section>
  </div>`;
  renderSheetBits();
  const bind = (sel, key) => $(sel).addEventListener('input', (e) => {
    const x = findN(S.openId); if (!x) return;
    x[key] = e.target.value; x.geaendert = nowIso(); save(); renderSheetMeta(); scheduleListRefresh();
  });
  bind('#sKunde', 'kunde'); bind('#sTicket', 'ticket'); bind('#sTel', 'telefon'); bind('#sText', 'text');
  (focusKunde ? $('#sKunde') : $('#sText')).focus();
  if (!focusKunde) { const t = $('#sText'); t.setSelectionRange(t.value.length, t.value.length); }
}
let listTimer;
function scheduleListRefresh() { clearTimeout(listTimer); listTimer = setTimeout(render, 300); }

function closeSheet() {
  if (S.settingsOpen) { S.settingsOpen = false; $('#sheetHost').innerHTML = ''; $('#q').focus(); return; }
  if (!S.openId) return;
  const n = findN(S.openId);
  if (n && NL.istLeer(n)) D.notizen = D.notizen.filter(x => x !== n); // leere Notiz verwerfen (H-1)
  S.openId = null; $('#sheetHost').innerHTML = ''; save(true); render(); $('#q').focus();
}
function renderSheetMeta() {
  const n = findN(S.openId); if (!n) return;
  const parts = ['Angelegt ' + fFull.format(new Date(n.erstellt))];
  if (n.geaendert !== n.erstellt) parts.push('geändert ' + relDate(n.geaendert));
  $('#sMeta').textContent = parts.join(' · ');
}
function renderSheetBits() {
  const n = findN(S.openId); if (!n) return;
  renderSheetMeta();
  const chip = (label, pressed, act, c) => `<button class="chip press" type="button" aria-pressed="${pressed}" data-act="${act}"${c ? ` style="--c:${c}"` : ''}>${label}</button>`;
  const st = NL.rrState(n);
  $('#sChips').innerHTML = [
    chip('Offen', n.status === 'offen', 'st:offen', 'var(--cyan)'),
    chip('Wartet', n.status === 'wartet', 'st:wartet', 'var(--amber)'),
    chip('Erledigt', n.status === 'erledigt', 'st:erledigt', 'var(--lime)'),
    '<span class="chip-sep" aria-hidden="true"></span>',
    chip('Prio hoch', n.prio === 'hoch', 'pr:hoch', 'var(--pink)'),
    chip('Niedrig', n.prio === 'niedrig', 'pr:niedrig', '#fff'),
    '<span class="chip-sep" aria-hidden="true"></span>',
    chip(n.rueckruf ? 'Rückruf ' + esc(rrLabel(n.rueckruf)) : '+ Rückruf', !!n.rueckruf || S.rrOpen, 'rr', st === 'over' ? 'var(--pink)' : 'var(--amber)'),
  ].join('');
  $('#sRR').innerHTML = S.rrOpen ? `<div class="rr">
      <input class="field" type="datetime-local" id="rrInput" value="${toLocalInput(n.rueckruf)}" aria-label="Rückruf Zeitpunkt">
      <button class="btn-ghost press" type="button" data-act="rr:+1">+1 Std.</button>
      <button class="btn-ghost press" type="button" data-act="rr:morgen">Morgen 9:00</button>
      ${n.rueckruf ? '<button class="btn-ghost danger press" type="button" data-act="rr:weg">Entfernen</button>' : ''}
    </div>` : '';
  const inp = $('#rrInput');
  if (inp) inp.addEventListener('change', (e) => { const v = e.target.value; setRR(v ? new Date(v).toISOString() : null); });
}
function setRR(iso) {
  const n = findN(S.openId); if (!n) return;
  n.rueckruf = iso; n.erinnertFuer = null; n.geaendert = nowIso();
  save(); renderSheetBits(); render();
}

// ---------- Einstellungen (A-2, U-2) ----------
function updateText(s) {
  switch (s.zustand) {
    case 'dev': return { t: s.text };
    case 'suche': return { t: 'Wird gesucht …' };
    case 'aktuell': return { t: 'Aktuell' + (s.geprueft ? ' · geprüft ' + fTime.format(new Date(s.geprueft)) : ''), c: 'ok' };
    case 'laedt': return { t: `Version ${s.version} wird geladen (${s.prozent || 0} %)` };
    case 'bereit': return { t: `Version ${s.version} ist bereit`, c: 'ok' };
    case 'fehler': return { t: 'Fehler: ' + s.text, c: 'err' };
    default: return { t: 'Automatische Prüfung jede Stunde' };
  }
}
function openSettings() {
  if (S.openId) closeSheet();
  S.settingsOpen = true;
  $('#sheetHost').innerHTML = `<div class="backdrop">
    <button class="closer" type="button" tabindex="-1" data-close><span class="sr">Schließen</span></button>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="Einstellungen">
      <span class="grab" aria-hidden="true"></span>
      <div class="s-head">
        <div class="s-titlewrap"><h2 class="s-title">Einstellungen</h2><span class="s-meta num">Noteline ${esc(S.version)}</span></div>
        <button class="btn-white press" type="button" data-close>Fertig</button>
      </div>
      <div class="s-body" id="setBody"></div>
    </section>
  </div>`;
  renderSettings();
  $('#setBody button:not(:disabled)')?.focus();
}
function renderSettings() {
  if (!S.settingsOpen) return;
  const u = updateText(S.update);
  const busy = ['suche', 'laedt', 'dev'].includes(S.update.zustand);
  const updBtn = S.update.zustand === 'bereit'
    ? '<button class="btn-copy press" type="button" data-set="install">Jetzt neu starten</button>'
    : `<button class="btn-ghost press" type="button" data-set="check"${busy ? ' disabled' : ''}>Nach Updates suchen</button>`;
  const sw = (key, an, aus) => `<button class="switch" type="button" role="switch" aria-pressed="${!!an}" aria-checked="${!!an}" data-set="${key}"${aus ? ' disabled' : ''}><span class="sr">umschalten</span></button>`;
  $('#setBody').innerHTML = `<div class="set-list">
    <div class="set-row"><div class="set-label"><strong>Updates</strong><span class="${u.c || ''}" aria-live="polite">${esc(u.t)}</span></div>${updBtn}</div>
    <div class="set-row"><div class="set-label"><strong>Mit Windows starten</strong><span>${S.autostart.moeglich ? 'Noteline öffnet sich beim Anmelden.' : 'Nur in der installierten Version.'}</span></div>${sw('autostart', S.autostart.an, !S.autostart.moeglich)}</div>
    <div class="set-row"><div class="set-label"><strong>Immer im Vordergrund</strong><span>Fenster bleibt über anderen Programmen.</span></div>${sw('pin', S.immerVorne)}</div>
    <div class="set-row"><div class="set-label"><strong>Daten</strong><span>${esc(S.ordner)}<br>Nur auf diesem Rechner, tägliches Backup.</span></div><div class="b-actions"><button class="btn-ghost press" type="button" data-set="ordner">Öffnen</button><button class="btn-ghost press" type="button" data-set="backups">Backups</button></div></div>
    <div class="set-row" style="flex-direction:column;align-items:stretch"><div class="set-label"><strong>Tastenkürzel</strong></div>
      <div class="keys">
        <span class="kbd">Strg K</span><span>Suchen / notieren</span>
        <span class="kbd">Strg N</span><span>Neue Notiz</span>
        <span class="kbd">Strg 1 / 2</span><span>Hotline / Wissen</span>
        <span class="kbd">Strg Alt H</span><span>Noteline von überall nach vorne holen</span>
        <span class="kbd">Esc</span><span>Schließen / Suche leeren</span>
      </div>
    </div>
  </div>`;
}
async function setImmerVorne(an) {
  S.immerVorne = !!(await bridge.immerVorne(an));
  $('#pin').setAttribute('aria-pressed', String(S.immerVorne));
  renderSettings();
}
async function settingAction(k, btn) {
  if (k === 'check') { S.update = { zustand: 'suche' }; renderSettings(); S.update = await bridge.updateSuchen(); renderSettings(); renderBanner(); return; }
  if (k === 'install') { save('sync'); return bridge.updateInstallieren(); }
  if (k === 'autostart') { S.autostart = await bridge.autostart(btn.getAttribute('aria-pressed') !== 'true'); return renderSettings(); }
  if (k === 'pin') return setImmerVorne(!S.immerVorne);
  if (k === 'ordner' || k === 'backups') return bridge.ordnerOeffnen(k === 'backups' ? 'backups' : 'daten');
}

// ---------- Erinnerungen (H-6) ----------
function checkReminders() {
  const faellig = NL.faelligeErinnerungen(D.notizen);
  for (const n of faellig) {
    bridge.erinnern({ titel: 'Rückruf: ' + (n.kunde || 'Ohne Kunde'), text: [n.telefon, NL.ersteZeile(n.text)].filter(Boolean).join(' · ') || 'Rückruf fällig', id: n.id });
    n.erinnertFuer = n.rueckruf;
  }
  if (faellig.length) { save(); render(); }
}

// ---------- Ereignisse ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, [data-open]'); if (!t) return;
  const d = t.dataset;
  if (d.open) return openSheet(d.open, e.detail === 0);
  if (d.set) return settingAction(d.set, t);
  if (d.done) {
    const n = findN(d.done); if (!n) return;
    upd(d.done, { status: n.status === 'erledigt' ? 'offen' : 'erledigt' });
    return toast(n.status === 'erledigt' ? 'Erledigt' : 'Wieder offen');
  }
  if (d.lane) { D.ui.closed[d.lane] = !D.ui.closed[d.lane]; save(); return render(); }
  if (d.tab) return setTab(d.tab);
  if ('close' in d) return closeSheet();
  if (d.act) {
    const n = findN(S.openId); if (!n) return;
    const [k, v] = d.act.split(':');
    if (k === 'st') upd(n.id, { status: v });
    else if (k === 'pr') upd(n.id, { prio: n.prio === v ? 'normal' : v });
    else if (k === 'rr' && !v) { S.rrOpen = !S.rrOpen; }
    else if (k === 'rr' && v === '+1') { const base = n.rueckruf && new Date(n.rueckruf) > new Date() ? new Date(n.rueckruf) : new Date(); base.setHours(base.getHours() + 1); base.setSeconds(0, 0); return setRR(base.toISOString()); }
    else if (k === 'rr' && v === 'morgen') { const x = new Date(); x.setDate(x.getDate() + 1); x.setHours(9, 0, 0, 0); return setRR(x.toISOString()); }
    else if (k === 'rr' && v === 'weg') { S.rrOpen = false; return setRR(null); }
    return renderSheetBits();
  }
  if (t.id === 'sDel') {
    if (!S.armedDelete) {
      S.armedDelete = true; t.textContent = 'Wirklich löschen?'; t.classList.add('armed');
      clearTimeout(t._x); t._x = setTimeout(() => { S.armedDelete = false; if (t.isConnected) { t.textContent = 'Notiz löschen'; t.classList.remove('armed'); } }, 3000);
      return;
    }
    D.notizen = D.notizen.filter(n => n.id !== S.openId); S.openId = null; $('#sheetHost').innerHTML = ''; save(true); render(); return toast('Notiz gelöscht');
  }
  if (t.id === 'qCreate') return createNote(S.q, false);
  if (t.id === 'pin') return setImmerVorne(!S.immerVorne);
  if (t.id === 'settings') return S.settingsOpen ? closeSheet() : openSettings();
  if (t.id === 'wAdd') { if (schreibgeschuetzt()) return; setEditW('neu'); return render(); }
  if (d.wcopy) { const w = D.wissen.find(x => x.id === d.wcopy); return w && copyText(w.wert, 'w' + w.id); }
  if (d.wopen) { const w = D.wissen.find(x => x.id === d.wopen); return w && bridge.linkOeffnen(w.wert.trim()); }
  if (d.gencopy) { const w = D.wissen.find(x => x.id === d.gencopy); return w && copyText(NL.fillTemplate(w.wert, D.ui.platzhalter[w.id]), 'gen' + w.id); }
  if (d.wedit) { setEditW(S.editW === d.wedit ? null : d.wedit); return render(); }
  if ('wcancel' in d) { setEditW(null); return render(); }
  if (d.wdel) {
    const key = 'w' + d.wdel;
    if (S.armedDelete !== key) { S.armedDelete = key; render(); setTimeout(() => { if (S.armedDelete === key) { S.armedDelete = false; render(); } }, 3000); return; }
    D.wissen = D.wissen.filter(w => w.id !== d.wdel); delete D.ui.platzhalter[d.wdel];
    setEditW(null); save(); render(); return toast('Eintrag gelöscht');
  }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-wform]'); if (!f) return;
  e.preventDefault();
  if (schreibgeschuetzt()) return;
  const fd = new FormData(f);
  const val = NL.normalizeWissen({ id: f.dataset.wform, gruppe: fd.get('gruppe'), titel: String(fd.get('titel') || '').trim(), wert: String(fd.get('wert') || '').trim() });
  if (!val.titel || !val.wert) return toast('Bezeichnung und Wert ausfüllen');
  if (f.dataset.wform === 'neu') D.wissen.push({ ...val, id: NL.uid() });
  else { const w = D.wissen.find(x => x.id === f.dataset.wform); if (w) Object.assign(w, { gruppe: val.gruppe, titel: val.titel, wert: val.wert }); }
  setEditW(null); save(); render(); toast('Gespeichert');
});
document.addEventListener('input', (e) => {
  const id = e.target.dataset && e.target.dataset.ph;
  if (!id) return;
  const w = D.wissen.find(x => x.id === id); if (!w) return;
  D.ui.platzhalter[id] = { ...(D.ui.platzhalter[id] || {}), [e.target.dataset.phname]: e.target.value };
  save();
  const out = $(`[data-genout="${CSS.escape(id)}"]`); if (out) out.innerHTML = genOutHtml(w);
});
$('#q').addEventListener('input', (e) => { S.q = e.target.value; render(); });
$('#q').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && S.tab === 'hotline' && S.q.trim()) { e.preventDefault(); createNote(S.q, true); }
  if (e.key === 'Escape' && S.q) { e.preventDefault(); S.q = ''; e.target.value = ''; render(); }
});
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.ctrlKey && !e.altKey && k === 'k') { e.preventDefault(); closeSheet(); $('#q').focus(); $('#q').select(); }
  else if (e.ctrlKey && !e.altKey && k === 'n') { e.preventDefault(); closeSheet(); createNote('', true); }
  else if (e.ctrlKey && !e.altKey && k === '1') { e.preventDefault(); setTab('hotline'); }
  else if (e.ctrlKey && !e.altKey && k === '2') { e.preventDefault(); setTab('wissen'); }
  else if (e.key === 'Escape' && (S.openId || S.settingsOpen)) { e.preventDefault(); closeSheet(); }
  else if (e.key === 'Escape' && S.editW) { setEditW(null); render(); }
});
// Dateien ins Fenster ziehen: nichts tun (A-1)
for (const typ of ['dragover', 'drop']) {
  document.addEventListener(typ, (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; }
  });
}
window.addEventListener('beforeunload', () => save('sync')); // D-4
bridge.beiNotizOeffnen((id) => { setTab('hotline'); openSheet(id, true); });
bridge.beiUpdateStatus((s) => { S.update = s; renderBanner(); renderSettings(); });

function tick() { const d = new Date(); $('#clock').textContent = fClock.format(d).replace(',', '') + ' · ' + fTime.format(d); }

// ---------- Start ----------
(async () => {
  const r = await bridge.laden();
  S.ordner = r.ordner || '';
  if (r.status === 'defekt') S.schutz = r;
  else if (r.daten) D = NL.normalize(r.daten);
  try { S.immerVorne = !!(await bridge.istImmerVorne()); $('#pin').setAttribute('aria-pressed', String(S.immerVorne)); } catch {}
  try { S.version = await bridge.version(); } catch {}
  try { S.autostart = await bridge.autostart(); } catch {}
  try { S.update = await bridge.updateStatus(); } catch {}
  const startTab = new URLSearchParams(location.search).get('tab'); // nur für Screenshots
  if (startTab === 'wissen') S.tab = 'wissen';
  if (!window.api && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch {} }
  tick(); setInterval(tick, 15000);
  renderBanner();
  render();
  if (startTab === 'einstellungen') openSettings();
  if (r.migriert) toast('Notizen aus „Hotline-Notizen“ übernommen');
  checkReminders(); setInterval(checkReminders, 20000);
  setInterval(() => { if (!S.openId && !S.settingsOpen) render(); }, 60000);
  $('#q').focus();
})();
