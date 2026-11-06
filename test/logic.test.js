'use strict';
// Tests für src/renderer/logic.js – Kennungen beziehen sich auf specs/specification.md.
// Alle Daten sind ausgedacht.
const test = require('node:test');
const assert = require('node:assert/strict');
const NL = require('../src/renderer/logic.js');

const lokal = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const notiz = (patch = {}) => ({ ...NL.normalizeNotiz({}), ...patch });

test('H-1: „Kunde: Stichpunkt“ trennt Kunde und Text', () => {
  assert.deepEqual(NL.parseQuickInput('Muster GmbH: Drucker offline'), { kunde: 'Muster GmbH', text: 'Drucker offline' });
  assert.deepEqual(NL.parseQuickInput('  nur Text  '), { kunde: '', text: 'nur Text' });
});

test('H-1: Links und zu lange Präfixe sind kein Kundenname', () => {
  assert.equal(NL.parseQuickInput('https://example.org/hilfe').kunde, '');
  assert.equal(NL.parseQuickInput(':führender Doppelpunkt').kunde, '');
  assert.equal(NL.parseQuickInput('x'.repeat(60) + ': Text').kunde, '');
  assert.equal(NL.parseQuickInput('x'.repeat(59) + ': Text').kunde, 'x'.repeat(59));
});

test('H-1: leere Notiz wird erkannt', () => {
  assert.equal(NL.istLeer(notiz()), true);
  assert.equal(NL.istLeer(notiz({ telefon: '0123' })), false);
  assert.equal(NL.istLeer(notiz({ text: '   ' })), true);
});

test('H-6: Rückrufstatus over / today / later', () => {
  const now = lokal(2026, 11, 6, 12, 0);
  assert.equal(NL.rrState(notiz({ rueckruf: lokal(2026, 11, 6, 11, 59).toISOString() }), now), 'over');
  assert.equal(NL.rrState(notiz({ rueckruf: lokal(2026, 11, 6, 23, 30).toISOString() }), now), 'today');
  assert.equal(NL.rrState(notiz({ rueckruf: lokal(2026, 11, 7, 9, 0).toISOString() }), now), 'later');
  assert.equal(NL.rrState(notiz({ rueckruf: lokal(2026, 11, 6, 11, 0).toISOString(), status: 'erledigt' }), now), '');
  assert.equal(NL.rrState(notiz(), now), '');
});

test('H-6: genau eine Erinnerung pro Rückrufzeitpunkt', () => {
  const now = lokal(2026, 11, 6, 12, 0);
  const rr = lokal(2026, 11, 6, 11, 0).toISOString();
  const n = notiz({ rueckruf: rr });
  assert.equal(NL.faelligeErinnerungen([n], now).length, 1);
  n.erinnertFuer = rr;
  assert.equal(NL.faelligeErinnerungen([n], now).length, 0);
  n.rueckruf = lokal(2026, 11, 6, 11, 30).toISOString(); // neuer Zeitpunkt → erneut
  assert.equal(NL.faelligeErinnerungen([n], now).length, 1);
});

test('H-4: Spuren Jetzt / Offen / Wartet / Erledigt', () => {
  const now = lokal(2026, 11, 6, 12, 0);
  const t = (h) => lokal(2026, 11, 6, h).toISOString();
  const a = notiz({ id: 'a', prio: 'hoch', geaendert: t(8) });
  const b = notiz({ id: 'b', rueckruf: t(15), geaendert: t(9) });
  const c = notiz({ id: 'c', geaendert: t(10) });
  const d = notiz({ id: 'd', status: 'wartet', geaendert: t(10) });
  const e = notiz({ id: 'e', status: 'erledigt', prio: 'hoch', geaendert: t(11) });
  const ls = NL.lanes([a, b, c, d, e], '', now);
  const ids = Object.fromEntries(ls.map(l => [l.key, l.items.map(x => x.id)]));
  assert.deepEqual(ids, { jetzt: ['b', 'a'], offen: ['c'], wartet: ['d'], erledigt: ['e'] });
});

test('H-4: leere Spur „Jetzt“ wird ausgeblendet, andere nicht', () => {
  const keys = NL.lanes([], '').map(l => l.key);
  assert.deepEqual(keys, ['offen', 'wartet', 'erledigt']);
});

test('H-5: Suche über Kunde, Ticket, Telefon und Text, ohne Groß/klein', () => {
  const ns = [notiz({ id: '1', kunde: 'Beispiel AG' }), notiz({ id: '2', ticket: '#4711' }), notiz({ id: '3', text: 'Router neu gestartet' })];
  const treffer = (q) => NL.lanes(ns, q).flatMap(l => l.items.map(x => x.id));
  assert.deepEqual(treffer('beispiel'), ['1']);
  assert.deepEqual(treffer('4711'), ['2']);
  assert.deepEqual(treffer('ROUTER'), ['3']);
});

test('W-2: Platzhalter eindeutig in Reihenfolge', () => {
  assert.deepEqual(NL.placeholders('ping <IP> -n <ANZAHL> && tracert <IP>'), ['IP', 'ANZAHL']);
  assert.deepEqual(NL.placeholders('a < b > c'), []);
  assert.deepEqual(NL.placeholders('kein Platzhalter'), []);
});

test('W-2: alle Platzhalter ersetzen, leere bleiben stehen, $ wörtlich', () => {
  const v = 'ping <IP> -n <ANZAHL> && tracert <IP>';
  assert.equal(NL.fillTemplate(v, { IP: '10.0.0.1' }), 'ping 10.0.0.1 -n <ANZAHL> && tracert 10.0.0.1');
  assert.equal(NL.fillTemplate('echo <X>', { X: '$& $1 $$' }), 'echo $& $1 $$');
  assert.equal(NL.fillTemplate('echo <X>', { X: '   ' }), 'echo <X>');
});

test('W-1: Links erkennen', () => {
  assert.equal(NL.istLink(' https://example.org '), true);
  assert.equal(NL.istLink('ftp://example.org'), false);
});

test('D-5: Normalisierung ergänzt fehlende Felder und verwirft Unsinn', () => {
  const d = NL.normalize({ notizen: [{ id: 'x', kunde: 'K' }, null, 'kaputt', { status: 'quatsch', prio: 42, rueckruf: 'kein Datum' }] });
  assert.equal(d.version, NL.DATEN_VERSION);
  assert.equal(d.notizen.length, 2);
  const [a, b] = d.notizen;
  assert.equal(a.ticket, '');
  assert.equal(a.status, 'offen');
  assert.equal(b.prio, 'normal');
  assert.equal(b.rueckruf, null);
  assert.deepEqual(d.ui.closed, { erledigt: true });
  assert.deepEqual(d.wissen, []);
});

test('D-5: Prototyp-Format (Platzhalter als String) wird übernommen', () => {
  const d = NL.normalize({
    notizen: [],
    wissen: [{ id: 'w1', gruppe: '', titel: 'Ping', wert: 'ping <IP>' }],
    ui: { closed: { erledigt: false }, platzhalter: { w1: '192.0.2.5', weg: 'x' } },
  });
  assert.deepEqual(d.ui.platzhalter, { w1: { IP: '192.0.2.5' } });
  assert.equal(d.wissen[0].gruppe, 'Allgemein');
  assert.deepEqual(d.ui.closed, { erledigt: false });
});

test('tageZwischen ist sommerzeitfest', () => {
  assert.equal(NL.tageZwischen(lokal(2026, 10, 24, 23), lokal(2026, 10, 25, 1)), 1); // Umstellung 25.10.2026
  assert.equal(NL.tageZwischen(lokal(2026, 3, 28, 12), lokal(2026, 3, 30, 12)), 2);
});
