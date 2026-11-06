'use strict';
// Tests für src/main/status.js (Spezifikation S-1 bis S-4). Alle Daten sind ausgedacht, das Netzwerk ist simuliert.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/main/status.js');

const tiAntwort = (eintraege) => ({ success: true, data: eintraege });
const tiEintrag = (id, status, offen = true, extra = {}) => ({
  id, title: `Pot. Einschränkung bei KIM (Test ${id})`, status, app: ['KIM'], createdAt: '2026-11-06T08:00:00.000Z',
  closedAt: offen ? null : '2026-11-06T09:00:00.000Z',
  steps: [{ id: id * 10, message: 'Es wurden <b>Einschränkungen</b> festgestellt.<br/>Bitte warten.', status, timestamp: '2026-11-06T08:05:00.000Z', hasMaintenance: false }],
  ...extra,
});
const statuspage = (indikator, extra = {}) => ({ page: { name: 'Beispiel' }, status: { indicator: indikator, description: '' },
  components: [], incidents: [], scheduled_maintenances: [], ...extra });

/** Simuliertes fetch: Antwort je URL-Teil. */
const fakeFetch = (routen) => async (url) => {
  for (const [teil, antwort] of Object.entries(routen)) {
    if (url.includes(teil)) {
      if (antwort instanceof Error) throw antwort;
      const { status = 200, json } = antwort;
      return { ok: status < 400, status, json: async () => json };
    }
  }
  throw new Error('getaddrinfo ENOTFOUND');
};

test('S-3: Klartext aus HTML', () => {
  assert.equal(S.klartext('Es wurden <b>Einschränkungen</b> festgestellt.<br/>Bitte &amp; danke'), 'Es wurden Einschränkungen festgestellt.\nBitte & danke');
  assert.equal(S.klartext('<script>alert(1)</script>Text'), 'alert(1)Text');
  assert.equal(S.klartext(null), '');
});

test('S-2: TI-Lagebild – nur offene Einschränkungen zählen', () => {
  assert.deepEqual(S.ausTiLage(tiAntwort([tiEintrag(1, 3, false)])), { zustand: 'ok', meldungen: [] });
  const r = S.ausTiLage(tiAntwort([tiEintrag(2, 4), tiEintrag(3, 1), tiEintrag(4, 3, false)]));
  assert.equal(r.zustand, 'ausfall');
  assert.deepEqual(r.meldungen.map(m => [m.schluessel, m.zustand]), [['ti-2', 'stoerung'], ['ti-3', 'ausfall']]);
  assert.equal(r.meldungen[0].text, 'Es wurden Einschränkungen festgestellt.\nBitte warten.');
  assert.match(S.ausTiLage(tiAntwort([tiEintrag(5, 2)])).meldungen[0].text, /^Erholt sich gerade/);
  assert.throws(() => S.ausTiLage({ success: false }));
});

test('S-2: Statuspage – Indikator, Vorfälle, Wartung, Komponenten', () => {
  assert.equal(S.ausStatuspage(statuspage('none')).zustand, 'ok');
  const v = S.ausStatuspage(statuspage('major', { incidents: [{ id: 'a1', name: 'Anmeldung gestört', status: 'investigating', impact: 'major',
    created_at: '2026-11-06T08:00:00Z', incident_updates: [{ body: 'Wir prüfen das.' }] }] }));
  assert.deepEqual([v.zustand, v.meldungen[0].titel, v.meldungen[0].text], ['ausfall', 'Anmeldung gestört', 'Wir prüfen das.']);
  const w = S.ausStatuspage(statuspage('maintenance', { scheduled_maintenances: [{ id: 'w1', name: 'Wartung Datenbank', status: 'in_progress' }] }));
  assert.equal(w.zustand, 'wartung');
  const k = S.ausStatuspage(statuspage('minor', { components: [{ id: 'k1', name: 'Kalender', status: 'degraded_performance' }, { id: 'k2', name: 'Login', status: 'operational' }] }));
  assert.deepEqual(k.meldungen.map(m => m.titel), ['Kalender']);
  assert.throws(() => S.ausStatuspage({ foo: 1 }));
});

test('S-2: Erreichbarkeit', () => {
  assert.equal(S.ausErreichbarkeit(200).zustand, 'ok');
  assert.equal(S.ausErreichbarkeit(301).zustand, 'ok');
  assert.equal(S.ausErreichbarkeit(503).zustand, 'ausfall');
});

test('S-2: alle Quellen prüfen, Netzwerkfehler sauber behandeln', async () => {
  const quellen = [
    { id: 'ti', name: 'TI', art: 'ti', url: 'https://ti.example/lageapi/v1/tistatus/incident', aktiv: true },
    { id: 'sp', name: 'Seite', art: 'statuspage', url: 'https://status.example.org', aktiv: true },
    { id: 'web', name: 'Hoster', art: 'erreichbar', url: 'https://hoster.example', aktiv: true },
    { id: 'aus', name: 'Abgeschaltet', art: 'erreichbar', url: 'https://aus.example', aktiv: false },
  ];
  const r = await S.pruefeAlle(quellen, fakeFetch({ 'ti.example': { json: tiAntwort([tiEintrag(7, 4)]) },
    'status.example.org/api/v2/summary.json': { json: statuspage('none') }, 'hoster.example': new Error('Zeitüberschreitung') }));
  assert.deepEqual(r.map(e => [e.id, e.zustand]), [['ti', 'stoerung'], ['sp', 'ok'], ['web', 'ausfall']]);
  // ohne Internet: alles unbekannt, nicht „Ausfall“
  const offline = await S.pruefeAlle(quellen, fakeFetch({}));
  assert.deepEqual(offline.map(e => e.zustand), ['unbekannt', 'unbekannt', 'unbekannt']);
});

test('S-4: Änderungen – neu, schlimmer, besser, behoben, unbekannt', () => {
  const e = (zustand, meldungen = []) => ({ id: 'q', name: 'TI', zustand, meldungen });
  const m = (schluessel, zustand = 'stoerung') => ({ schluessel, titel: 'KIM gestört', text: 'Details', zustand });
  assert.deepEqual(S.aenderungen([], [e('stoerung', [m('a')])]), []);                         // erste Prüfung: nichts melden
  assert.equal(S.aenderungen([e('ok')], [e('stoerung', [m('a')])])[0].typ, 'stoerung');
  assert.equal(S.aenderungen([e('stoerung', [m('a')])], [e('stoerung', [m('a')])]).length, 0); // unverändert
  assert.equal(S.aenderungen([e('stoerung', [m('a')])], [e('stoerung', [m('a'), m('b')])])[0].typ, 'stoerung'); // weitere Störung
  assert.equal(S.aenderungen([e('stoerung', [m('a')])], [e('ausfall', [m('a', 'ausfall')])])[0].zustand, 'ausfall');
  assert.equal(S.aenderungen([e('ausfall', [m('a', 'ausfall')])], [e('stoerung', [m('a')])])[0].typ, 'besser');
  assert.equal(S.aenderungen([e('stoerung', [m('a')])], [e('ok')])[0].typ, 'behoben');
  assert.deepEqual(S.aenderungen([e('ok')], [e('unbekannt')]), []);
  assert.deepEqual(S.aenderungen([e('unbekannt')], [e('stoerung', [m('a')])]), []);
});

test('S-3: Gesamtbild für das Statusfeld', () => {
  assert.deepEqual(S.gesamt([]), { zustand: 'aus', betroffen: 0 });
  assert.equal(S.gesamt([{ zustand: 'unbekannt' }]).zustand, 'unbekannt');
  assert.deepEqual(S.gesamt([{ zustand: 'ok' }, { zustand: 'stoerung' }, { zustand: 'unbekannt' }]), { zustand: 'stoerung', betroffen: 1, unbekannt: 1 });
});

test('S-2: Art einer eigenen Quelle erkennen', async () => {
  assert.equal((await S.erkenneArt('status.example.org', fakeFetch({ 'status.example.org/api/v2/summary.json': { json: statuspage('none') } }))).art, 'statuspage');
  assert.equal((await S.erkenneArt('https://hoster.example', fakeFetch({ 'summary.json': { status: 404, json: {} }, 'hoster.example': { status: 200 } }))).art, 'erreichbar');
  assert.equal((await S.erkenneArt('https://x.example/lageapi/v1/tistatus/incident', fakeFetch({}))).art, 'ti');
  assert.equal((await S.erkenneArt('javascript:alert(1)', fakeFetch({}))).ok, false);
});

test('S-1: Einstellungen – Standard aus, Vorlagen vorhanden, nicht angehakt', () => {
  const s = S.statusEinstellungen(undefined);
  assert.equal(s.aktiv, false);
  assert.equal(s.intervall, 15);
  assert.deepEqual(s.quellen.map(q => [q.id, q.aktiv]), [['ti', false], ['doctolib', false]]);
  const eigen = S.statusEinstellungen({ aktiv: true, intervall: 5, quellen: [{ id: 'x', name: 'X', art: 'erreichbar', url: 'https://x.example', aktiv: true }, { id: 'kaputt' }] });
  assert.deepEqual(eigen.quellen.map(q => q.id), ['x', 'ti', 'doctolib']);
  assert.equal(S.statusEinstellungen({ intervall: 7 }).intervall, 15);
});
