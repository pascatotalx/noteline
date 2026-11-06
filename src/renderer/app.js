// Noteline – Oberfläche (Zustand, Rendering, Ereignisse).
// Reine Logik liegt in logic.js (window.NL), die Kennungen verweisen auf specs/specification.md.
'use strict';
const NL = window.NL;

// ---------- Brücke zum Hauptprozess (Fallback: normaler Browser zum Ansehen der Oberfläche) ----------
const bridge = window.api || (() => {
  const KEY = 'noteline-daten';
  const lesen = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const schreiben = (j) => { try { localStorage.setItem(KEY, j); } catch {} return true; };
  const keineUpdates = { zustand: 'dev', text: 'Im Browser gibt es keine Updates.' };
  return {
    laden: async () => ({ status: lesen() ? 'ok' : 'neu', daten: lesen(), ordner: 'Browser (localStorage)' }),
    speichern: async (j) => schreiben(j), speichernSofort: (j) => ({ ok: schreiben(j) }),
    einstellungen: async () => ({ theme: 'dunkel', themaAktiv: 'dark', uhr: false, ticketLink: '' }),
    einstellungSetzen: async (k, v) => { if (k === 'theme') document.documentElement.dataset.theme = v === 'hell' ? 'light' : 'dark'; return true; },
    immerVorne: async (an) => an, istImmerVorne: async () => false,
    autostart: async () => ({ an: false, moeglich: false }),
    ordnerOeffnen: async () => {}, linkOeffnen: async (u) => window.open(u, '_blank', 'noopener'),
    erinnern: async ({ titel, text }) => { try { if (Notification.permission === 'granted') new Notification(titel, { body: text }); } catch {} },
    notizOffen: async () => {}, version: async () => 'Browser',
    updateSuchen: async () => keineUpdates, updateStatus: async () => keineUpdates, updateInstallieren: async () => {},
    beiNotizOeffnen: () => {}, beiUpdateStatus: () => {}, beiTheme: () => {},
  };
})();

// ---------- Zustand ----------
let D = NL.normalize(null);
const BREIT = window.matchMedia('(min-width: 760px)'); // L-1
const S = {
  tab: 'hotline', q: '', openId: null, settingsOpen: false, rrOpen: false, breit: BREIT.matches,
  copied: null, editW: null, wDraft: null, focusForm: false, wNeu: '', firstRender: true,
  schutz: null, ordner: '', version: '', update: { zustand: 'idle' }, autostart: { an: false, moeglich: false }, immerVorne: false,
  einst: { theme: 'dunkel', uhr: false, ticketLink: '' }, ticketEntwurf: null, ticketFehler: '',
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
const ticketUrl = (ticket) => NL.ticketUrl(S.einst.ticketLink, ticket);

const PRIO = { hoch: { c: 'var(--pink)', l: 'Hoch' }, normal: { c: 'rgba(var(--fg),.5)', l: 'Normal' }, niedrig: { c: 'rgba(var(--fg),.16)', l: 'Niedrig' } };
const LANE_FARBE = { jetzt: 'var(--pink)', offen: 'var(--cyan)', wartet: 'var(--amber)', erledigt: 'var(--lime)' };
const svg = (w, sw, inner, stroke = 'currentColor') => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
// Symbole: Lucide (https://lucide.dev), ISC-Lizenz – siehe THIRD_PARTY_NOTICES.md
const ICON = {
  check: svg(15, 2.25, '<path d="M20 6 9 17l-5-5"/>'),
  undo: svg(15, 2, '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  chev: svg(14, 2, '<path d="m9 18 6-6-6-6"/>').replace('<svg', '<svg class="chev"'),
  edit: svg(14, 1.75, '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  ext: svg(14, 1.75, '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  saved: svg(13, 2.25, '<path d="M20 6 9 17l-5-5"/>', 'var(--lime-text)'),
  stern: svg(16, 1.75, '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
  mail: svg(14, 1.75, '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'),
};

let toastTimer, rueckgaengigAktion = null;
function toast(msg, mitRueckgaengig) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (mitRueckgaengig ? ' <button class="toast-btn" type="button" data-undo>Rückgängig</button>' : '');
  t.classList.remove('versteckt');
  if (!mitRueckgaengig) rueckgaengigAktion = null;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.add('versteckt'); rueckgaengigAktion = null; }, mitRueckgaengig ? 6000 : 1800);
}
/** Löschen ohne Nachfrage, dafür 6 s Rückgängig (A-4). */
function rueckgaengig(msg, wiederherstellen) { toast(msg, true); rueckgaengigAktion = wiederherstellen; }
function rueckgaengigAusfuehren() {
  const a = rueckgaengigAktion; rueckgaengigAktion = null;
  $('#toast').classList.add('versteckt');
  if (a) { a(); toast('Wiederhergestellt'); }
}
async function copyText(text, key) {
  try { if (window.api) await bridge.kopieren(text); else await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  S.copied = key; render();
  clearTimeout(copyText.t); copyText.t = setTimeout(() => { S.copied = null; render(); }, 1400);
}

// ---------- Hotline (H-1 – H-8) ----------
function rowHtml(n) {
  const st = NL.rrState(n);
  const right = st ? 'Rückruf ' + rrLabel(n.rueckruf) : relDate(n.erstellt);
  const done = n.status === 'erledigt';
  const aktiv = S.breit && n.id === S.openId;
  const url = ticketUrl(n.ticket);
  return `<li class="row${done ? ' done' : ''}${aktiv ? ' active' : ''}">
    <span class="bar" style="background:${PRIO[n.prio].c}" title="Priorität ${PRIO[n.prio].l}"></span>
    <button class="row-main" type="button" data-open="${esc(n.id)}"${aktiv ? ' aria-current="true"' : ''}>
      <span class="row-title"><span class="kunde">${esc(n.kunde || (n.ansprechpartner ? '' : 'Ohne Kunde'))}${n.ansprechpartner ? `<span class="ap">${n.kunde ? ' · ' : ''}${esc(n.ansprechpartner)}</span>` : ''}</span>${n.ticket ? `<span class="ticket" translate="no">${esc(n.ticket)}</span>` : ''}</span>
      <span class="snippet">${esc(NL.ersteZeile(n.text) || n.telefon || 'Keine Stichpunkte')}</span>
    </button>
    <span class="right num${st ? ' ' + st : ''}">${esc(right)}</span>
    <span class="quick">${url ? `<button class="q-btn press" type="button" data-ticket="${esc(n.id)}" title="Ticket öffnen"><span class="sr">Ticket öffnen</span>${ICON.ext}</button>` : ''}<button class="q-btn press${done ? '' : ' ok'}" type="button" data-done="${esc(n.id)}" title="${done ? 'Wieder öffnen' : 'Erledigt'}"><span class="sr">${done ? 'Wieder öffnen' : 'Als erledigt markieren'}</span>${done ? ICON.undo : ICON.check}</button></span>
  </li>`;
}
function renderHotline(anim) {
  const ls = NL.lanes(D.notizen, S.q);
  if (!ls.length) {
    return S.q.trim()
      ? `<div class="empty${anim}"><strong>Keine Notiz gefunden</strong><span>Enter legt „${esc(S.q.trim())}“ als neue Notiz an.</span></div>`
      : `<div class="empty${anim}"><strong>Noch keine Notizen</strong><span>Oben tippen und Enter drücken, oder Strg+N.<br>„Kunde / Ansprechpartner: Stichpunkt“, Telefonnummern und #Ticketnummern werden automatisch erkannt.</span></div>`;
  }
  return ls.map((l, i) => {
    const open = !D.ui.closed[l.key] || !!S.q.trim();
    return `<section class="lane${anim}" style="animation-delay:${i * 50}ms">
      <button class="lane-head press" type="button" aria-expanded="${open}" data-lane="${l.key}">${ICON.chev}<span class="dot" style="background:${LANE_FARBE[l.key]}"></span><span class="lane-name">${l.name}</span><span class="count num">${l.items.length}</span></button>
      ${open ? `<ul class="rows">${l.items.map(rowHtml).join('')}</ul>` : ''}
    </section>`;
  }).join('');
}

// ---------- Wissen (W-1 – W-6) ----------
const ART_LABEL = { telefon: 'Telefonnummer', email: 'E-Mail', link: 'Link', ip: 'IP-Adresse', port: 'Port', befehl: 'Befehl oder Text' };
const istUrlVorlage = (w) => NL.wissenTyp(w.wert) === 'link';
/** Fertiger Wert eines Eintrags: Platzhalter eingesetzt, in Links URL-sicher (W-4). */
const wissenWert = (w) => NL.fillTemplate(w.wert, D.ui.platzhalter[w.id], { url: istUrlVorlage(w) });
const genOutHtml = (w) => wissenWert(w).split(' ').map(x => `<b>${esc(x)}</b>`).join(' ');

// Vorschläge für den Wert mit neutralen Beispielen (W-1)
const WERT_VORSCHLAEGE = [
  ['Link', 'https://…'], ['IP-Adresse', '192.0.2.10'], ['Telefon', '0800 1234567'],
  ['E-Mail', 'name@example.org'], ['Port', '5938'], ['Befehl oder Text', 'Name: Text'],
];
const ABSCHNITT = { telefon: 'Telefon und E-Mail', email: 'Telefon und E-Mail', link: 'Links', ip: 'IP-Adressen', port: 'Ports', befehl: 'Befehle und Texte' };

/** Live-Vorschau unter dem Eingabefeld: zwei Anzeigen Name und Wert, dazu Vorschläge und was Enter tut (W-1). */
function vorschauHtml(eingabe) {
  const v = NL.wissenVorschau(eingabe);
  const chip = (label, inhalt, an, platzhalter) => `<span class="vs-chip${an ? ' an' : ''}"><b>${esc(label)}</b><span>${inhalt ? esc(inhalt) : `<i>${platzhalter}</i>`}</span></span>`;
  const name = chip('Name', v.titel, !!v.titel, v.zustand === 'fertig' ? 'ohne Namen' : 'z. B. Fachdienst-IP');
  const wert = chip(v.typ ? ART_LABEL[v.typ] : 'Wert', v.wert, v.zustand === 'fertig', 'z. B. 192.0.2.10 oder https://…');
  let hinweis;
  if (v.zustand === 'leer') hinweis = 'Erst den Namen, dann ein Leerzeichen und den Wert.';
  else if (v.zustand === 'fertig') hinweis = `<span>Enter speichert unter <b>${esc(ABSCHNITT[v.typ])}</b>.</span>`;
  else if (v.leerzeichen) hinweis = `<span class="vs-tipp">Als Wert passt:</span>${WERT_VORSCHLAEGE.map(([art, bsp]) => `<span class="vs-vorschlag"><b>${art}</b> ${esc(bsp)}</span>`).join('')}`;
  else hinweis = 'Jetzt ein Leerzeichen und den Wert eintippen. Oder Enter speichert alles als Text.';
  return `<div class="vs-chips">${name}${wert}</div><div class="vs-hinweis">${hinweis}</div>`;
}

function wissenZeile(w, favIndex) {
  if (S.editW === w.id) return wissenBearbeiten(w);
  const typ = NL.wissenTyp(w.wert);
  const phs = NL.placeholders(w.wert);
  const ok = S.copied === 'w' + w.id;
  const anzeige = phs.length ? w.wert : (typ === 'link' ? w.wert.replace(/^https?:\/\//i, '') : w.wert);
  const tool = (attr, titel, icon) => `<button class="w-tool press" type="button" ${attr}="${esc(w.id)}" title="${titel}"><span class="sr">${titel}</span>${icon}</button>`;
  const felder = phs.map(name => `<label><span translate="no">${esc(name)}</span><input class="field" type="text" autocomplete="off" spellcheck="false" data-ph="${esc(w.id)}" data-phname="${esc(name)}" value="${esc((D.ui.platzhalter[w.id] || {})[name] || '')}" placeholder="${esc(name)} …"></label>`).join('');
  return `<div class="w-eintrag">
    <div class="w-row">
      <button class="w-star press${w.favorit ? ' an' : ''}" type="button" data-wfav="${esc(w.id)}" title="${w.favorit ? 'Aus Favoriten entfernen' : 'Als Favorit anheften'}" aria-pressed="${!!w.favorit}"><span class="sr">Favorit</span>${ICON.stern}</button>
      <button class="w-main${w.titel ? '' : ' ohne-titel'}" type="button" data-wcopy="${esc(w.id)}" title="Kopieren">
        ${w.titel ? `<span class="w-titel">${esc(w.titel)}</span>` : ''}<span class="w-wert" translate="no">${esc(anzeige)}</span>
      </button>
      <span class="w-side">
        <span class="w-tools">${typ === 'link' ? tool('data-wopen', 'Im Browser öffnen', ICON.ext) : ''}${typ === 'email' ? tool('data-wmail', 'Mail schreiben', ICON.mail) : ''}${tool('data-wedit', 'Bearbeiten', ICON.edit)}</span>
        <span class="w-hint${ok ? ' ok' : ''}">${ok ? 'Kopiert' : 'Kopieren'}</span>
        ${favIndex >= 0 && favIndex < 9 ? `<span class="kbd" title="Mit Alt+${favIndex + 1} kopieren">Alt ${favIndex + 1}</span>` : ''}
      </span>
    </div>
    ${phs.length ? `<div class="w-ph">${felder}<code translate="no" data-genout="${esc(w.id)}">${genOutHtml(w)}</code></div>` : ''}
  </div>`;
}

function wissenBearbeiten(w) {
  const v = S.wDraft && S.wDraft.id === w.id ? S.wDraft : w; // angefangene Eingaben gehen nie verloren (W-3)
  return `<form class="w-edit" data-wform="${esc(w.id)}">
    <input class="field" name="titel" value="${esc(v.titel)}" autocomplete="off" placeholder="Name …" aria-label="Name">
    <input class="field mono" name="wert" value="${esc(v.wert)}" autocomplete="off" spellcheck="false" placeholder="Wert …" aria-label="Wert">
    <div class="actions"><button class="btn-ghost danger press" type="button" data-wdel="${esc(w.id)}">Löschen</button><span style="flex-grow:1"></span><button class="btn-ghost press" type="button" data-wcancel>Abbrechen</button><button class="btn-copy press" type="submit">Speichern</button></div>
  </form>`;
}

function renderWissen(anim) {
  const abschnitte = NL.wissenAbschnitte(D.wissen, S.q);
  const favs = NL.favoriten(D.wissen);
  const kopf = S.breit ? '<h2 class="sec-title w-kopf">Wissen</h2>' : '';
  const neu = `<div class="w-add${anim}">
      <input class="field" id="wNeu" type="text" autocomplete="off" spellcheck="false" placeholder="Neuer Eintrag …" value="${esc(S.wNeu)}" aria-label="Neuer Eintrag">
      <button class="btn-copy press" type="button" data-wneu>Hinzufügen</button>
    </div>
    <div class="w-vorschau" id="wVorschau">${vorschauHtml(S.wNeu)}</div>`;
  let liste;
  if (!D.wissen.length) {
    liste = `<div class="empty${anim}"><strong>Noch kein Wissen abgelegt</strong><span>Telefonnummern, E-Mails, Links, IPs, Ports und Befehle, die du oft brauchst.<br>Ein Klick kopiert sie, ein Stern heftet sie oben an.</span></div>`;
  } else if (!abschnitte.length) {
    liste = `<div class="empty"><strong>Kein Wissen gefunden</strong><span>Kein Eintrag passt zu „${esc(S.q.trim())}“.</span></div>`;
  } else {
    liste = abschnitte.map((a, i) => `<section class="w-sec${anim}" style="animation-delay:${i * 40}ms">
      <h2 class="sec-title">${esc(a.name)}<span class="count num">${a.items.length}</span></h2>
      ${a.items.map(w => wissenZeile(w, favs.indexOf(w))).join('')}
    </section>`).join('');
  }
  return `<div class="wissen">${kopf}${neu}${liste}</div>`;
}

function wissenNeu() {
  if (schreibgeschuetzt()) return;
  const p = NL.parseWissenEingabe(S.wNeu);
  if (!p.wert) return toast('Erst einen Wert eintippen');
  const w = NL.normalizeWissen({ ...p, id: NL.uid() });
  D.wissen.push(w);
  S.wNeu = ''; save(); render();
  $('#wNeu')?.focus();
  toast(`Gespeichert unter „${NL.wissenAbschnitte([w])[0].name}“`);
}

/** Kopiert einen Wissens-Eintrag (Klick, Alt+1–9, Strg+Enter). */
function wissenKopieren(w, meldung) {
  copyText(wissenWert(w), 'w' + w.id);
  if (meldung) toast(`„${w.titel || w.wert}“ kopiert`);
}

function setEditW(id) { S.editW = id; S.wDraft = null; S.focusForm = !!id; }

// ---------- Rendering ----------
/** Sichert Formularentwurf und Fokus, damit Neuzeichnen im Hintergrund nichts zerstört (W-1). */
function zustandSichern(bereich) {
  const f = bereich.querySelector('.w-edit');
  if (f && f.dataset.wform === S.editW) { const fd = new FormData(f); S.wDraft = { id: f.dataset.wform, titel: fd.get('titel'), wert: fd.get('wert') }; }
  const a = document.activeElement;
  if (!a || !bereich.contains(a)) return null;
  let sel = null;
  if (a.dataset.ph) sel = `[data-ph="${CSS.escape(a.dataset.ph)}"][data-phname="${CSS.escape(a.dataset.phname)}"]`;
  else if (a.name && a.closest('.w-edit')) sel = `.w-edit [name="${a.name}"]`;
  else if (a.id === 'wNeu') sel = '#wNeu';
  return sel ? { sel, start: a.selectionStart, end: a.selectionEnd } : null;
}
function render() {
  const anim = S.firstRender ? ' enter' : '';
  S.firstRender = false;
  const main = $('main'), list = $('#colList'), side = $('#colSide');
  const fokus = zustandSichern(main);
  const stL = list.scrollTop, stS = side.scrollTop;
  if (S.breit) {
    list.innerHTML = renderHotline(anim);
    if (!S.openId) { side.classList.remove('mit-notiz'); side.innerHTML = renderWissen(anim); side.scrollTop = stS; }
  } else {
    list.innerHTML = S.tab === 'hotline' ? renderHotline(anim) : renderWissen(anim);
  }
  list.scrollTop = stL;
  if (S.focusForm) {
    const f = main.querySelector('.w-edit [name="titel"]');
    if (f) f.focus();
    S.focusForm = false;
  } else if (fokus) {
    const el = main.querySelector(fokus.sel);
    if (el) { el.focus(); try { el.setSelectionRange(fokus.start, fokus.end); } catch {} }
  }
  const due = NL.anzahlFaellig(D.notizen);
  const b = $('#badge'); b.hidden = !due; b.textContent = due;
  const hotlineAktiv = S.breit || S.tab === 'hotline';
  $('#q').placeholder = S.breit ? 'Notieren oder in Notizen und Wissen suchen …' : (hotlineAktiv ? 'Notieren oder suchen …' : 'Port, IP oder Link suchen …');
  const hasQ = !!S.q.trim() && hotlineAktiv;
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
      Datei reparieren oder eine Sicherung aus dem Unterordner „Backups“ als daten.json zurückkopieren, dann Noteline neu starten.
      ${S.schutz.kopie ? `<div class="b-mono">Sicherungskopie im Datenordner: ${esc(S.schutz.kopie.split(/[\\/]/).pop())}</div>` : ''}</div>
      <div class="b-actions"><button class="btn-ghost press" type="button" data-set="ordner">Datenordner öffnen</button></div>
    </div>`;
  } else if (S.update.zustand === 'bereit') {
    html = `<div class="banner update"><span class="b-text"><strong>Update ${esc(S.update.version)} bereit.</strong> Sonst wird es beim Beenden oder in einer Pause installiert.</span><button class="btn-copy press" type="button" data-set="install">Jetzt neu starten</button></div>`;
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
  openSheet(n.id, instant, !n.kunde);
}
const findN = (id) => D.notizen.find(n => n.id === id);
function upd(id, patch) { const n = findN(id); if (!n) return; Object.assign(n, patch, { geaendert: nowIso() }); save(); render(); }

function notizHtml(n, imBlatt) {
  return `${imBlatt ? '<span class="grab" aria-hidden="true"></span>' : ''}
    <div class="s-head">
      <div class="s-titlewrap">
        <input class="s-kunde" id="sKunde" type="text" autocomplete="off" placeholder="Kunde …" value="${esc(n.kunde)}" aria-label="Kunde">
        <input class="s-ap" id="sAp" type="text" autocomplete="off" placeholder="Ansprechpartner …" value="${esc(n.ansprechpartner)}" aria-label="Ansprechpartner">
        <span class="s-meta num" id="sMeta"></span>
      </div>
      <button class="btn-white press" type="button" data-close>Fertig</button>
    </div>
    <div class="s-body">
      <div class="chips" id="sChips"></div>
      <div id="sRR"></div>
      <div class="s-fields">
        <label>Ticket<span class="field-row"><input class="field" id="sTicket" type="text" autocomplete="off" spellcheck="false" placeholder="z. B. #12345 …" value="${esc(n.ticket)}"><button class="q-btn press" type="button" id="sTicketLink" title="Ticket öffnen" hidden><span class="sr">Ticket öffnen</span>${ICON.ext}</button></span></label>
        <label>Telefon<input class="field" id="sTel" type="tel" inputmode="tel" autocomplete="off" placeholder="Rückrufnummer …" value="${esc(n.telefon)}" style="font-family:var(--body)"></label>
      </div>
      <textarea class="s-text" id="sText" aria-label="Stichpunkte" placeholder="Stichpunkte zum Anruf …">${esc(n.text)}</textarea>
      <div class="s-foot"><span class="saved">${ICON.saved}<span>${S.schutz ? 'Schutzmodus: nicht gespeichert' : 'Automatisch gespeichert'}</span></span><button class="btn-ghost press" type="button" id="sKopie" title="Kunde, Ansprechpartner, Telefon, Ticket, Rückruf und Stichpunkte als Text kopieren">Als Text kopieren</button><button class="link-danger" type="button" id="sDel">Löschen</button></div>
    </div>`;
}

/** Öffnet eine Notiz: breit rechts im Seitenbereich, schmal als Blatt von unten (L-1). */
function openSheet(id, instant, focusKunde) {
  const n = findN(id); if (!n) return;
  if (S.settingsOpen) closeSheet();
  if (S.openId && S.openId !== id) notizSchliessen();
  S.openId = id; S.rrOpen = false;
  if (S.breit) {
    $('#sheetHost').innerHTML = '';
    const side = $('#colSide');
    side.classList.add('mit-notiz');
    side.innerHTML = `<section class="panel" aria-label="Anrufnotiz">${notizHtml(n, false)}</section>`;
  } else {
    $('#sheetHost').innerHTML = `<div class="backdrop${instant ? ' instant' : ''}">
      <button class="closer" type="button" tabindex="-1" data-close><span class="sr">Schließen</span></button>
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Anrufnotiz">${notizHtml(n, true)}</section>
    </div>`;
  }
  renderSheetBits();
  ticketLinkAnzeigen();
  const bind = (sel, key) => $(sel).addEventListener('input', (e) => {
    const x = findN(S.openId); if (!x) return;
    x[key] = e.target.value; x.geaendert = nowIso(); save(); renderSheetMeta(); scheduleListRefresh();
    if (key === 'ticket') ticketLinkAnzeigen();
  });
  bind('#sKunde', 'kunde'); bind('#sAp', 'ansprechpartner'); bind('#sTicket', 'ticket'); bind('#sTel', 'telefon'); bind('#sText', 'text');
  bridge.notizOffen(true);
  render();
  (focusKunde ? $('#sKunde') : $('#sText')).focus();
  if (!focusKunde) { const t = $('#sText'); t.setSelectionRange(t.value.length, t.value.length); }
}
function ticketLinkAnzeigen() {
  const btn = $('#sTicketLink'), n = findN(S.openId);
  if (btn && n) btn.hidden = !ticketUrl(n.ticket);
}
let listTimer;
function scheduleListRefresh() { clearTimeout(listTimer); listTimer = setTimeout(render, 300); }

/** Schließt die offene Notiz, verwirft sie, wenn sie leer ist (H-1). Zeichnet nicht neu. */
function notizSchliessen(loeschen) {
  const n = findN(S.openId);
  if (n && (loeschen || NL.istLeer(n))) D.notizen = D.notizen.filter(x => x !== n);
  S.openId = null;
  $('#sheetHost').innerHTML = '';
  const side = $('#colSide'); side.classList.remove('mit-notiz'); side.innerHTML = '';
  bridge.notizOffen(false);
  save(true);
}
function closeSheet() {
  if (S.settingsOpen) { S.settingsOpen = false; $('#sheetHost').innerHTML = ''; $('#q').focus(); return; }
  if (!S.openId) return;
  notizSchliessen();
  render(); $('#q').focus();
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
  renderChips(n);
  renderRR(n);
}
function renderChips(n) {
  const chip =(label, pressed, act, c) => `<button class="chip press" type="button" aria-pressed="${pressed}" data-act="${act}"${c ? ` style="--c:${c}"` : ''}>${label}</button>`;
  const st = NL.rrState(n);
  $('#sChips').innerHTML = [
    chip('Offen', n.status === 'offen', 'st:offen', 'var(--cyan)'),
    chip('Wartet', n.status === 'wartet', 'st:wartet', 'var(--amber)'),
    chip('Erledigt', n.status === 'erledigt', 'st:erledigt', 'var(--lime)'),
    '<span class="chip-sep" aria-hidden="true"></span>',
    chip('Prio hoch', n.prio === 'hoch', 'pr:hoch', 'var(--pink)'),
    chip('Niedrig', n.prio === 'niedrig', 'pr:niedrig', '#c9ccd3'),
    '<span class="chip-sep" aria-hidden="true"></span>',
    chip(n.rueckruf ? 'Rückruf ' + esc(rrLabel(n.rueckruf)) : '+ Rückruf', !!n.rueckruf || S.rrOpen, 'rr', st === 'over' ? 'var(--pink)' : 'var(--amber)'),
  ].join('');
}
/** Rückruf-Eingabe: Datum steht schon auf heute, nur die Uhrzeit fehlt (H-6). */
function renderRR(n) {
  $('#sRR').innerHTML = S.rrOpen ? `<div class="rr">
      <input class="field" type="date" id="rrDatum" value="${NL.rueckrufDatum(n.rueckruf)}" aria-label="Rückruf Datum">
      <input class="field rr-zeit" type="time" id="rrZeit" value="${NL.rueckrufZeit(n.rueckruf)}" aria-label="Rückruf Uhrzeit">
      <button class="btn-ghost press" type="button" data-act="rr:+1">+1 Std.</button>
      <button class="btn-ghost press" type="button" data-act="rr:morgen">Morgen 9:00</button>
      ${n.rueckruf ? '<button class="btn-ghost danger press" type="button" data-act="rr:weg">Entfernen</button>' : ''}
    </div>` : '';
  const uebernehmen = () => {
    const iso = NL.rueckrufAus($('#rrDatum').value, $('#rrZeit').value);
    if (iso && iso !== n.rueckruf) setRR(iso, true);
  };
  for (const id of ['#rrDatum', '#rrZeit']) { const el = $(id); if (el) el.addEventListener('change', uebernehmen); }
}
/** Rückruf setzen. `ausEingabe` = aus den Feldern, dann bleibt die Eingabe stehen und behält den Fokus. */
function setRR(iso, ausEingabe) {
  const n = findN(S.openId); if (!n) return;
  n.rueckruf = iso; n.erinnertFuer = null; n.geaendert = nowIso();
  save();
  if (ausEingabe) { renderSheetMeta(); renderChips(n); } else renderSheetBits();
  render();
}

/** Fensterbreite wechselt zwischen ein- und zweispaltig: offene Notiz umhängen, nichts verlieren (L-1). */
BREIT.addEventListener('change', (e) => {
  S.breit = e.matches;
  const offen = S.openId;
  if (offen) {
    S.openId = null;
    $('#sheetHost').innerHTML = ''; const side = $('#colSide'); side.classList.remove('mit-notiz'); side.innerHTML = '';
    openSheet(offen, true, false);
  } else render();
});

// ---------- Einstellungen (A-2, H-8, U-2) ----------
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
  if (S.openId) { notizSchliessen(); render(); }
  S.settingsOpen = true; S.ticketEntwurf = null; S.ticketFehler = '';
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
  const body = $('#setBody');
  const fokusTicket = document.activeElement && document.activeElement.id === 'setTicket';
  const auswahl = fokusTicket ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  const scroll = body.scrollTop;
  const u = updateText(S.update);
  const busy = ['suche', 'laedt', 'dev'].includes(S.update.zustand);
  const updBtn = S.update.zustand === 'bereit'
    ? '<button class="btn-copy press" type="button" data-set="install">Jetzt neu starten</button>'
    : `<button class="btn-ghost press" type="button" data-set="check"${busy ? ' disabled' : ''}>Nach Updates suchen</button>`;
  const sw = (key, an, aus) => `<button class="switch" type="button" role="switch" aria-pressed="${!!an}" aria-checked="${!!an}" data-set="${key}"${aus ? ' disabled' : ''}><span class="sr">umschalten</span></button>`;
  const seg = (wert, label) => `<button type="button" class="press" data-thema="${wert}" aria-pressed="${S.einst.theme === wert}">${label}</button>`;
  const ticketWert = S.ticketEntwurf ?? S.einst.ticketLink;
  body.innerHTML = `<div class="set-list">
    <div class="set-row"><div class="set-label"><strong>Updates</strong><span class="${u.c || ''}" aria-live="polite">${esc(u.t)}</span></div>${updBtn}</div>
    <div class="set-row"><div class="set-label"><strong>Erscheinungsbild</strong></div><div class="seg" role="group" aria-label="Erscheinungsbild">${seg('dunkel', 'Dunkel')}${seg('hell', 'Hell')}${seg('system', 'Wie Windows')}</div></div>
    <div class="set-row"><div class="set-label"><strong>Uhr anzeigen</strong><span>Datum und Uhrzeit oben in der Titelleiste.</span></div>${sw('uhr', S.einst.uhr)}</div>
    <div class="set-row stack"><div class="set-label"><strong>Ticket-Link</strong><span>Adresse eures Ticketsystems mit &lt;TICKET&gt; als Platzhalter. Dann öffnet ein Klick das Ticket einer Notiz. Bleibt nur auf diesem Rechner.</span></div>
      <input class="field" id="setTicket" type="url" autocomplete="off" spellcheck="false" placeholder="https://support.example.org/tickets?id=<TICKET>" value="${esc(ticketWert)}">
      ${S.ticketFehler ? `<div class="set-label"><span class="err">${esc(S.ticketFehler)}</span></div>` : ''}</div>
    <div class="set-row"><div class="set-label"><strong>Mit Windows starten</strong><span>${S.autostart.moeglich ? 'Noteline öffnet sich beim Anmelden.' : 'Nur in der installierten Version.'}</span></div>${sw('autostart', S.autostart.an, !S.autostart.moeglich)}</div>
    <div class="set-row"><div class="set-label"><strong>Immer im Vordergrund</strong><span>Fenster bleibt über anderen Programmen.</span></div>${sw('pin', S.immerVorne)}</div>
    <div class="set-row"><div class="set-label"><strong>Speicherort</strong><button class="pfad press" type="button" data-set="ordner" title="Ordner im Explorer öffnen">${esc(S.ordner)}</button><span>Notizen und Wissen als Datei, nur auf diesem Rechner.</span></div></div>
    <div class="set-row"><div class="set-label"><strong>Im Hintergrund</strong><span>Das Kreuz und Minimieren lassen Noteline unten rechts im Infobereich weiterlaufen. Beenden über Rechtsklick auf das Symbol.</span></div></div>
    <div class="set-row stack"><div class="set-label"><strong>Tastenkürzel</strong></div>
      <div class="keys">
        <span class="kbd">Strg K</span><span>Suchen / notieren</span>
        <span class="kbd">Strg N</span><span>Neue Notiz</span>
        <span class="kbd">Strg Enter</span><span>Besten Wissens-Treffer der Suche kopieren</span>
        <span class="kbd">Alt 1–9</span><span>Favoriten kopieren</span>
        <span class="kbd">Strg 1 / 2</span><span>Hotline / Wissen (schmales Fenster)</span>
        <span class="kbd">Strg Alt H</span><span>Noteline von überall nach vorne holen</span>
        <span class="kbd">Esc</span><span>Schließen / Suche leeren</span>
      </div>
    </div>
  </div>`;
  body.scrollTop = scroll;
  if (fokusTicket) { const el = $('#setTicket'); el.focus(); try { el.setSelectionRange(...auswahl); } catch {} }
}
async function ticketLinkSpeichern(wert) {
  const v = wert.trim();
  const fehler = NL.pruefeTicketVorlage(v);
  S.ticketFehler = fehler || '';
  if (!fehler && v !== S.einst.ticketLink) {
    await bridge.einstellungSetzen('ticketLink', v);
    S.einst.ticketLink = v; S.ticketEntwurf = null;
    toast(v ? 'Ticket-Link gespeichert' : 'Ticket-Link entfernt');
    render();
  }
  renderSettings();
}
async function setImmerVorne(an) {
  S.immerVorne = !!(await bridge.immerVorne(an));
  $('#pin').setAttribute('aria-pressed', String(S.immerVorne));
  renderSettings();
}
function uhrAnzeigen() { $('#clock').hidden = !S.einst.uhr; if (S.einst.uhr) tick(); }
async function settingAction(k, btn) {
  if (k === 'check') { S.update = { zustand: 'suche' }; renderSettings(); S.update = await bridge.updateSuchen(); renderSettings(); renderBanner(); return; }
  if (k === 'install') { save('sync'); return bridge.updateInstallieren(); }
  if (k === 'autostart') { S.autostart = await bridge.autostart(btn.getAttribute('aria-pressed') !== 'true'); return renderSettings(); }
  if (k === 'pin') return setImmerVorne(!S.immerVorne);
  if (k === 'uhr') { S.einst.uhr = !S.einst.uhr; await bridge.einstellungSetzen('uhr', S.einst.uhr); uhrAnzeigen(); return renderSettings(); }
  if (k === 'ordner') return bridge.ordnerOeffnen();
}

// ---------- Erinnerungen (H-6) ----------
function checkReminders() {
  const faellig = NL.faelligeErinnerungen(D.notizen);
  for (const n of faellig) {
    bridge.erinnern({ titel: 'Rückruf: ' + (NL.kundeMitAnsprechpartner(n) || 'Ohne Kunde'), text: [n.telefon, NL.ersteZeile(n.text)].filter(Boolean).join(' · ') || 'Rückruf fällig', id: n.id });
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
  if (d.thema) { S.einst.theme = d.thema; bridge.einstellungSetzen('theme', d.thema); return renderSettings(); }
  if (d.ticket) { const n = findN(d.ticket); const url = n && ticketUrl(n.ticket); return url && bridge.linkOeffnen(url); }
  if (t.id === 'sTicketLink') { const n = findN(S.openId); const url = n && ticketUrl(n.ticket); return url && bridge.linkOeffnen(url); }
  if (d.done) {
    const n = findN(d.done); if (!n) return;
    upd(d.done, { status: n.status === 'erledigt' ? 'offen' : 'erledigt' });
    if (S.openId === n.id) renderSheetBits();
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
  if (t.id === 'sDel') { // A-4: sofort löschen, mit Rückgängig
    const n = findN(S.openId); if (!n) return;
    const index = D.notizen.indexOf(n), kopie = { ...n };
    notizSchliessen(true); render(); $('#q').focus();
    return rueckgaengig('Notiz gelöscht', () => { D.notizen.splice(Math.min(index, D.notizen.length), 0, kopie); save(); render(); });
  }
  if (t.id === 'sKopie') { const n = findN(S.openId); if (n) { copyText(NL.notizAlsText(n), null); toast('Notiz als Text kopiert'); } return; }
  if (d.undo !== undefined) return rueckgaengigAusfuehren();
  if (t.id === 'qCreate') return createNote(S.q, false);
  if (t.id === 'pin') return setImmerVorne(!S.immerVorne);
  if (t.id === 'settings') return S.settingsOpen ? closeSheet() : openSettings();
  if ('wneu' in d) return wissenNeu();
  const w = D.wissen.find(x => x.id === (d.wcopy || d.wopen || d.wmail || d.wfav || d.wdel));
  if (d.wcopy) return w && wissenKopieren(w);
  if (d.wopen) { const url = w && wissenWert(w).trim(); return url && bridge.linkOeffnen(url); }
  if (d.wmail) return w && bridge.linkOeffnen('mailto:' + w.wert.trim());
  if (d.wfav) { if (!w || schreibgeschuetzt()) return; w.favorit = !w.favorit; save(); render(); return toast(w.favorit ? 'Als Favorit angeheftet' : 'Aus Favoriten entfernt'); }
  if (d.wedit) { setEditW(S.editW === d.wedit ? null : d.wedit); return render(); }
  if ('wcancel' in d) { setEditW(null); return render(); }
  if (d.wdel) { // A-4
    if (!w) return;
    const index = D.wissen.indexOf(w), werte = D.ui.platzhalter[w.id];
    D.wissen = D.wissen.filter(x => x !== w); delete D.ui.platzhalter[w.id];
    setEditW(null); save(); render();
    return rueckgaengig('Eintrag gelöscht', () => { D.wissen.splice(Math.min(index, D.wissen.length), 0, w); if (werte) D.ui.platzhalter[w.id] = werte; save(); render(); });
  }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-wform]'); if (!f) return;
  e.preventDefault();
  if (schreibgeschuetzt()) return;
  const fd = new FormData(f);
  const titel = String(fd.get('titel') || '').trim(), wert = String(fd.get('wert') || '').trim();
  if (!wert) return toast('Der Wert darf nicht leer sein');
  const w = D.wissen.find(x => x.id === f.dataset.wform); if (w) Object.assign(w, { titel, wert });
  setEditW(null); save(); render(); toast('Gespeichert');
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'setTicket') { S.ticketEntwurf = e.target.value; return; }
  if (e.target.id === 'wNeu') { S.wNeu = e.target.value; $('#wVorschau').innerHTML = vorschauHtml(S.wNeu); return; }
  const id = e.target.dataset && e.target.dataset.ph;
  if (!id) return;
  const w = D.wissen.find(x => x.id === id); if (!w) return;
  D.ui.platzhalter[id] = { ...(D.ui.platzhalter[id] || {}), [e.target.dataset.phname]: e.target.value };
  save();
  const out = $(`[data-genout="${CSS.escape(id)}"]`); if (out) out.innerHTML = genOutHtml(w);
});
document.addEventListener('change', (e) => { if (e.target.id === 'setTicket') ticketLinkSpeichern(e.target.value); });
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'wNeu' && e.key === 'Enter') { e.preventDefault(); wissenNeu(); }
  if (e.target.id === 'wNeu' && e.key === 'Escape' && S.wNeu) { e.preventDefault(); e.stopPropagation(); S.wNeu = ''; e.target.value = ''; $('#wVorschau').innerHTML = vorschauHtml(''); }
}, true);
/** Bester Wissens-Treffer zur aktuellen Suche (W-6). */
const ersterWissensTreffer = () => (NL.wissenAbschnitte(D.wissen, S.q)[0] || { items: [] }).items[0];
$('#q').addEventListener('input', (e) => { S.q = e.target.value; render(); });
$('#q').addEventListener('keydown', (e) => {
  const wissenTab = !S.breit && S.tab === 'wissen';
  if (e.key === 'Enter' && (e.ctrlKey || wissenTab) && S.q.trim()) {
    e.preventDefault();
    const w = ersterWissensTreffer();
    return w ? wissenKopieren(w, true) : toast('Kein Wissens-Eintrag gefunden');
  }
  if (e.key === 'Enter' && (S.breit || S.tab === 'hotline') && S.q.trim()) { e.preventDefault(); createNote(S.q, true); }
  if (e.key === 'Escape' && S.q) { e.preventDefault(); S.q = ''; e.target.value = ''; render(); }
});
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) { // W-5: Favoriten kopieren
    e.preventDefault();
    const w = NL.favoriten(D.wissen)[+e.key - 1];
    return w ? wissenKopieren(w, true) : toast(`Kein Favorit auf Alt+${e.key}`);
  }
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
bridge.beiTheme((t) => { document.documentElement.dataset.theme = t; });

function tick() { const d = new Date(); $('#clock').textContent = fClock.format(d).replace(',', '') + ' · ' + fTime.format(d); }

// ---------- Start ----------
(async () => {
  const r = await bridge.laden();
  S.ordner = r.ordner || '';
  if (r.status === 'defekt') S.schutz = r;
  else if (r.daten) D = NL.normalize(r.daten);
  try { S.einst = { ...S.einst, ...(await bridge.einstellungen()) }; } catch {}
  try { S.immerVorne = !!(await bridge.istImmerVorne()); $('#pin').setAttribute('aria-pressed', String(S.immerVorne)); } catch {}
  try { S.version = await bridge.version(); } catch {}
  try { S.autostart = await bridge.autostart(); } catch {}
  try { S.update = await bridge.updateStatus(); } catch {}
  const start = new URLSearchParams(location.search).get('tab'); // nur für Screenshots
  if (start === 'wissen') S.tab = 'wissen';
  if (!window.api && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch {} }
  uhrAnzeigen(); setInterval(tick, 15000);
  renderBanner();
  render();
  if (start === 'einstellungen') openSettings();
  if (start === 'notiz' && D.notizen[0]) openSheet(D.notizen[0].id, true, false);
  if (r.migriert) toast('Notizen aus „Hotline-Notizen“ übernommen');
  checkReminders(); setInterval(checkReminders, 20000);
  setInterval(render, 60000);
  if (!S.openId && !S.settingsOpen) $('#q').focus();
})();
