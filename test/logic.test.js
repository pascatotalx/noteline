'use strict';
// Tests für src/renderer/logic.js – Kennungen beziehen sich auf specs/specification.md.
// Alle Daten sind ausgedacht.
const test = require('node:test');
const assert = require('node:assert/strict');
const NL = require('../src/renderer/logic.js');

const lokal = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const notiz = (patch = {}) => ({ ...NL.normalizeNotiz({}), ...patch });

test('H-1: „Kunde: Stichpunkt“ trennt Kunde und Text', () => {
  assert.deepEqual(NL.parseQuickInput('Muster GmbH: Drucker offline'), { kunde: 'Muster GmbH', ansprechpartner: '', text: 'Drucker offline', telefon: '', ticket: '' });
  assert.deepEqual(NL.parseQuickInput('  nur Text  '), { kunde: '', ansprechpartner: '', text: 'nur Text', telefon: '', ticket: '' });
});

test('H-1: Telefonnummer landet im Feld Telefon', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('+49 30 1234567 Beispiel AG: Drucker'), { kunde: 'Beispiel AG', ansprechpartner: '', text: 'Drucker', telefon: '+49 30 1234567', ticket: '' });
  assert.equal(p('+493012345678').telefon, '+493012345678');
  assert.equal(p('Rückruf an 030/1234567-0 bitte').telefon, '030/1234567-0');
  assert.equal(p('Rückruf an 030/1234567-0 bitte').text, 'Rückruf an bitte');
  assert.deepEqual(p('Beispiel AG: Nummer 030 1234 5678'), { kunde: 'Beispiel AG', ansprechpartner: '', text: 'Nummer', telefon: '030 1234 5678', ticket: '' });
});

test('H-1: keine Telefonnummer bei Ports, IPs, Datum, Ticket und Links', () => {
  for (const s of ['Port 5938 offen', 'IP 192.0.2.10', 'Termin 06.11.2026', 'kurz 0711', '#0012345678',
    'https://example.org/0301234567890', 'Seriennr. AB0301234567']) {
    assert.equal(NL.parseQuickInput(s).telefon, '', s);
  }
});

test('H-1: Ticketnummer mit # oder nach „Ticket“', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('Beispiel AG #0012345: Router tauschen'), { kunde: 'Beispiel AG', ansprechpartner: '', text: 'Router tauschen', telefon: '', ticket: '#0012345' });
  assert.deepEqual(p('#0012345: Router'), { kunde: '', ansprechpartner: '', text: 'Router', telefon: '', ticket: '#0012345' });
  assert.equal(p('Ticket 4711 nachfassen').ticket, '#4711');
  assert.equal(p('Ticketnr.: #98765').ticket, '#98765');
  assert.equal(p('Farbe #12 ist kein Ticket').ticket, '');
});

test('H-1: Telefon, Ticket und Kunde in beliebiger Reihenfolge', () => {
  assert.deepEqual(NL.parseQuickInput('Beispiel AG: Drucker #0012345 +49 30 1234567'),
    { kunde: 'Beispiel AG', ansprechpartner: '', text: 'Drucker', telefon: '+49 30 1234567', ticket: '#0012345' });
  const n = NL.neueNotiz('0301234567 #123: Test');
  assert.equal(n.telefon, '0301234567');
  assert.equal(n.ticket, '#123');
  assert.equal(n.text, 'Test');
});

test('H-8: Ticket-Link-Vorlage', () => {
  const v = 'https://support.example.org/tickets?id=<TICKET>';
  assert.equal(NL.ticketUrl(v, '#0012345'), 'https://support.example.org/tickets?id=0012345');
  assert.equal(NL.ticketUrl(v, ' 12 34 '), 'https://support.example.org/tickets?id=1234');
  assert.equal(NL.ticketUrl(v, 'a&b'), 'https://support.example.org/tickets?id=a%26b');
  assert.equal(NL.ticketUrl(v, ''), null);
  assert.equal(NL.ticketUrl('', '123'), null);
  assert.equal(NL.ticketUrl('ftp://x/<TICKET>', '123'), null);
  assert.equal(NL.pruefeTicketVorlage(''), null);
  assert.equal(NL.pruefeTicketVorlage(v), null);
  assert.match(NL.pruefeTicketVorlage('https://example.org/'), /<TICKET>/);
  assert.match(NL.pruefeTicketVorlage('example.org/<TICKET>'), /http/);
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

test('H-4: leere Spuren werden ausgeblendet', () => {
  assert.deepEqual(NL.lanes([], '').map(l => l.key), []);
  assert.deepEqual(NL.lanes([notiz({ status: 'wartet' })], '').map(l => l.key), ['wartet']);
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
  assert.equal(d.wissen[0].gruppe, ''); assert.equal(d.wissen[0].favorit, false);
  assert.deepEqual(d.ui.closed, { erledigt: false });
});

test('tageZwischen ist sommerzeitfest', () => {
  assert.equal(NL.tageZwischen(lokal(2026, 10, 24, 23), lokal(2026, 10, 25, 1)), 1); // Umstellung 25.10.2026
  assert.equal(NL.tageZwischen(lokal(2026, 3, 28, 12), lokal(2026, 3, 30, 12)), 2);
});

test('H-9: „Kunde / Ansprechpartner: Stichpunkt“ füllt beide Felder', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('Beispiel AG / Frau Muster: Drucker'), { kunde: 'Beispiel AG', ansprechpartner: 'Frau Muster', text: 'Drucker', telefon: '', ticket: '' });
  assert.equal(p('A/B GmbH: Router').kunde, 'A/B GmbH');
  assert.equal(p('A/B GmbH: Router').ansprechpartner, '');
  const n = NL.neueNotiz('+49 123 4567890 Beispiel AG / Herr Test #4711: Rückruf');
  assert.deepEqual([n.kunde, n.ansprechpartner, n.telefon, n.ticket, n.text], ['Beispiel AG', 'Herr Test', '+49 123 4567890', '#4711', 'Rückruf']);
});

test('H-9: Ansprechpartner in Suche, Anzeige, Leer-Prüfung und Normalisierung', () => {
  const n = notiz({ kunde: 'Beispiel AG', ansprechpartner: 'Frau Muster' });
  assert.deepEqual(NL.lanes([n], 'muster').flatMap(l => l.items).length, 1);
  assert.equal(NL.kundeMitAnsprechpartner(n), 'Beispiel AG · Frau Muster');
  assert.equal(NL.kundeMitAnsprechpartner(notiz({ ansprechpartner: 'Frau Muster' })), 'Frau Muster');
  assert.equal(NL.istLeer(notiz({ ansprechpartner: 'Frau Muster' })), false);
  assert.equal(NL.normalize({ notizen: [{ id: 'alt' }] }).notizen[0].ansprechpartner, '');
});

test('H-6: Rückruf-Datum ist heute vorbelegt, Uhrzeit separat', () => {
  const now = lokal(2026, 11, 6, 10, 44);
  assert.equal(NL.rueckrufDatum(null, now), '2026-11-06');
  assert.equal(NL.rueckrufZeit(null), '');
  const iso = NL.rueckrufAus('2026-11-06', '14:30');
  assert.equal(iso, lokal(2026, 11, 6, 14, 30).toISOString());
  assert.equal(NL.rueckrufDatum(iso), '2026-11-06');
  assert.equal(NL.rueckrufZeit(iso), '14:30');
  assert.equal(NL.rueckrufAus('2026-11-06', ''), null);
  assert.equal(NL.rueckrufAus('', '14:30'), null);
  assert.equal(NL.rueckrufAus('2026-11-06', '25:00'), null);
});

test('W-2: Art eines Werts wird erkannt', () => {
  const t = (v) => NL.wissenTyp(v);
  assert.equal(t('https://example.org/download'), 'link');
  assert.equal(t('support@example.org'), 'email');
  assert.equal(t('192.0.2.10'), 'ip');
  assert.equal(t('192.0.2.0/24'), 'ip');
  assert.equal(t('198.51.100.7:8443'), 'ip');
  assert.equal(t('5938'), 'port');
  assert.equal(t('70000'), 'befehl');
  assert.equal(t('0800 1234567'), 'telefon');
  assert.equal(t('+49 123 4567890'), 'telefon');
  assert.equal(t('route add <IP> mask 255.255.255.255 <GATEWAY>'), 'befehl');
  assert.equal(t('Bitte Karte neu stecken'), 'befehl');
});

test('W-1: Eingabe in einer Zeile wird in Name und Wert zerlegt', () => {
  const p = (s) => NL.parseWissenEingabe(s);
  assert.deepEqual(p('Support-Hotline 0800 1234567'), { titel: 'Support-Hotline', wert: '0800 1234567' });
  assert.deepEqual(p('Support-E-Mail support@example.org'), { titel: 'Support-E-Mail', wert: 'support@example.org' });
  assert.deepEqual(p('Firmware Kartenterminal https://example.org/fw?x=1'), { titel: 'Firmware Kartenterminal', wert: 'https://example.org/fw?x=1' });
  assert.deepEqual(p('https://example.org/fw Firmware'), { titel: 'Firmware', wert: 'https://example.org/fw' });
  assert.deepEqual(p('Fachdienst A 192.0.2.10'), { titel: 'Fachdienst A', wert: '192.0.2.10' });
  assert.deepEqual(p('Fernwartung 5938'), { titel: 'Fernwartung', wert: '5938' });
  assert.deepEqual(p('Route Fachdienst: route add <IP> mask 255.255.255.255 <GATEWAY>'), { titel: 'Route Fachdienst', wert: 'route add <IP> mask 255.255.255.255 <GATEWAY>' });
  assert.deepEqual(p('ipconfig /flushdns'), { titel: '', wert: 'ipconfig /flushdns' });
  assert.deepEqual(p('https://example.org'), { titel: '', wert: 'https://example.org' });
  assert.deepEqual(p('   '), { titel: '', wert: '' });
});

test('W-2/W-5: Abschnitte nach Art, Favoriten zuerst, alphabetisch, Suche', () => {
  const w = (titel, wert, favorit = false) => NL.normalizeWissen({ titel, wert, favorit });
  const liste = [w('Port B', '8443'), w('Hotline', '0800 1234567', true), w('Port A', '5938'), w('Doku', 'https://example.org'), w('Zeta', 'ping <IP>')];
  const ab = NL.wissenAbschnitte(liste);
  assert.deepEqual(ab.map(a => a.key), ['favoriten', 'link', 'port', 'befehl']);
  assert.deepEqual(ab.find(a => a.key === 'port').items.map(x => x.titel), ['Port A', 'Port B']);
  assert.deepEqual(NL.wissenAbschnitte(liste, 'port').map(a => a.key), ['port']);
  assert.deepEqual(NL.favoriten(liste).map(x => x.titel), ['Hotline']);
});

test('W-4: Platzhalter in Links werden URL-sicher eingesetzt', () => {
  assert.equal(NL.fillTemplate('https://example.org/s?q=<MODELL>', { MODELL: 'ORGA 6141 & Co' }, { url: true }), 'https://example.org/s?q=ORGA%206141%20%26%20Co');
  assert.equal(NL.fillTemplate('ping <IP>', { IP: '192.0.2.1' }), 'ping 192.0.2.1');
});

test('H-10: Notiz als Text', () => {
  const n = notiz({ kunde: 'Beispiel AG', ansprechpartner: 'Frau Muster', telefon: '+49 123 4567890', ticket: '#4711',
    status: 'wartet', rueckruf: lokal(2026, 11, 6, 14, 30).toISOString(), text: 'Drucker offline\nTreiber neu' });
  assert.equal(NL.notizAlsText(n), 'Kunde: Beispiel AG\nAnsprechpartner: Frau Muster\nTelefon: +49 123 4567890\nTicket: #4711\nStatus: Wartet\nRückruf: 06.11.2026 14:30 Uhr\n\nDrucker offline\nTreiber neu');
  assert.equal(NL.notizAlsText(notiz({ text: 'nur Text' })), 'Status: Offen\n\nnur Text');
});

test('W-1: Live-Vorschau zeigt Name, Wert und Art', () => {
  const v = (s) => NL.wissenVorschau(s);
  assert.equal(v('').zustand, 'leer');
  assert.deepEqual(v('Fachdienst-IP'), { zustand: 'name', titel: 'Fachdienst-IP', wert: '', typ: null, leerzeichen: false });
  assert.equal(v('Fachdienst-IP ').leerzeichen, true);
  assert.equal(v('Fachdienst-IP 192.0').zustand, 'name');
  assert.deepEqual(v('Fachdienst-IP 192.0.2.10'), { zustand: 'fertig', titel: 'Fachdienst-IP', wert: '192.0.2.10', typ: 'ip', leerzeichen: false });
  assert.equal(v('https://example.org').typ, 'link');
  assert.deepEqual(v('Route: route print'), { zustand: 'fertig', titel: 'Route', wert: 'route print', typ: 'befehl', leerzeichen: false });
  assert.equal(v('Route: ').titel, 'Route');
});

test('W-1: Befehle werden erkannt, IPs darin schneiden nicht ab', () => {
  const p = (s) => NL.parseWissenEingabe(s);
  assert.deepEqual(p('Fachdienst-Route route -p add <ZIEL> mask 255.255.255.255 <GATEWAY>'),
    { titel: 'Fachdienst-Route', wert: 'route -p add <ZIEL> mask 255.255.255.255 <GATEWAY>' });
  assert.deepEqual(p('Feste IP setzen New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress <IP> -PrefixLength 24 -DefaultGateway <GATEWAY>'),
    { titel: 'Feste IP setzen', wert: 'New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress <IP> -PrefixLength 24 -DefaultGateway <GATEWAY>' });
  assert.deepEqual(p('Netzwerk prüfen ping 192.0.2.10 -n 4'), { titel: 'Netzwerk prüfen', wert: 'ping 192.0.2.10 -n 4' });
  assert.deepEqual(p('DNS leeren ipconfig /flushdns'), { titel: 'DNS leeren', wert: 'ipconfig /flushdns' });
  assert.deepEqual(p('ipconfig /all'), { titel: '', wert: 'ipconfig /all' });
  assert.deepEqual(p('Adapter anzeigen Get-NetAdapter'), { titel: 'Adapter anzeigen', wert: 'Get-NetAdapter' });
  assert.deepEqual(p('Route: route print'), { titel: 'Route', wert: 'route print' });
  assert.equal(NL.wissenTyp('New-NetRoute -DestinationPrefix 192.0.2.0/24 -NextHop 192.0.2.1'), 'befehl');
});

test('W-1: Bindestrich-Namen sind keine Cmdlets', () => {
  const p = (s) => NL.parseWissenEingabe(s);
  assert.deepEqual(p('Test-Server 192.0.2.5'), { titel: 'Test-Server', wert: '192.0.2.5' });
  assert.deepEqual(p('Support-Hotline 0800 1234567'), { titel: 'Support-Hotline', wert: '0800 1234567' });
  assert.deepEqual(p('Set-Up Anleitung https://example.org/setup'), { titel: 'Set-Up Anleitung', wert: 'https://example.org/setup' });
  assert.deepEqual(p('Routenplaner https://example.org'), { titel: 'Routenplaner', wert: 'https://example.org' });
});

test('W-1: Vorschau meldet Befehl als fertig erkannt', () => {
  const v = NL.wissenVorschau('Feste IP setzen New-NetIPAddress -IPAddress <IP>');
  assert.equal(v.zustand, 'fertig');
  assert.equal(v.typ, 'befehl');
  assert.equal(v.titel, 'Feste IP setzen');
});

test('H-1: Ansprechpartner per Anrede, Satz bleibt bei Verb erhalten', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('Frau Müller meldet, Connector läuft nicht mehr'),
    { kunde: '', ansprechpartner: 'Frau Müller', text: 'Frau Müller meldet, Connector läuft nicht mehr', telefon: '', ticket: '' });
  assert.deepEqual(p('Herr Dr. Schmidt, Kartenleser defekt'), { kunde: '', ansprechpartner: 'Herr Dr. Schmidt', text: 'Kartenleser defekt', telefon: '', ticket: '' });
  assert.equal(p('Rückruf von Hr. Weber-Lang erbeten').ansprechpartner, 'Hr. Weber-Lang');
  assert.deepEqual(p('Frau Müller: Connector läuft nicht'), { kunde: '', ansprechpartner: 'Frau Müller', text: 'Connector läuft nicht', telefon: '', ticket: '' });
});

test('H-1: Kunde per Branchenwort oder Rechtsform', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('Praxis Sonnenschein, Frau Müller, Connector läuft nicht'),
    { kunde: 'Praxis Sonnenschein', ansprechpartner: 'Frau Müller', text: 'Connector läuft nicht', telefon: '', ticket: '' });
  assert.deepEqual(p('Praxis Dr. Sonnenschein meldet Kartenleser defekt'),
    { kunde: 'Praxis Dr. Sonnenschein', ansprechpartner: '', text: 'Praxis Dr. Sonnenschein meldet Kartenleser defekt', telefon: '', ticket: '' });
  assert.deepEqual(p('Muster GmbH Herr Schmidt Drucker offline'),
    { kunde: 'Muster GmbH', ansprechpartner: 'Herr Schmidt', text: 'Drucker offline', telefon: '', ticket: '' });
  assert.equal(p('Muster GmbH & Co. KG, Router tauschen').kunde, 'Muster GmbH & Co. KG');
  assert.equal(p('Zahnarztpraxis am Park – Telefon geht nicht').kunde, 'Zahnarztpraxis am Park');
  assert.equal(p('Zahnarztpraxis am Park – Telefon geht nicht').text, 'Telefon geht nicht');
  assert.equal(p('Pflegedienst Sonnenhof e.V., Drucker offline').kunde, 'Pflegedienst Sonnenhof e.V.');
});

test('H-1: keine falschen Kunden ohne Merkmal', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.equal(p('Connector läuft nicht, bitte zurückrufen').kunde, '');
  assert.equal(p('Praxis ist heute geschlossen').kunde, '');
  assert.equal(p('Drucker druckt leere Seiten').kunde, '');
  assert.equal(p('Sonnenschein: Connector läuft nicht').kunde, 'Sonnenschein');
});

test('H-1: alles zusammen mit Telefon und Ticket', () => {
  const n = NL.neueNotiz('Praxis Sonnenschein, Frau Müller, +49 123 4567890 #4711 Connector startet neu');
  assert.deepEqual([n.kunde, n.ansprechpartner, n.telefon, n.ticket, n.text],
    ['Praxis Sonnenschein', 'Frau Müller', '+49 123 4567890', '#4711', 'Connector startet neu']);
});

test('H-1 (1.2.3): Bezeichnungen KD, Kunde, ASP, Tel, Tkt', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('KD Muster GmbH ASP Frau Müller Tel 0123 45678 Drucker offline'),
    { kunde: 'Muster GmbH', ansprechpartner: 'Frau Müller', text: 'Drucker offline', telefon: '0123 45678', ticket: '' });
  assert.deepEqual(p('Kunde: Sonnenschein, Connector defekt'), { kunde: 'Sonnenschein', ansprechpartner: '', text: 'Connector defekt', telefon: '', ticket: '' });
  assert.deepEqual(p('Kd. Sonnenschein Tel. 123 Rückruf wegen Kartenleser'),
    { kunde: 'Sonnenschein', ansprechpartner: '', text: 'Rückruf wegen Kartenleser', telefon: '123', ticket: '' });
  assert.equal(p('Tkt 12345 nachfassen').ticket, '#12345');
  assert.equal(p('Ticket-Nr.: 4711 offen').ticket, '#4711');
  assert.deepEqual(p('ASP Herr Weber, Rückruf erbeten'), { kunde: '', ansprechpartner: 'Herr Weber', text: 'Rückruf erbeten', telefon: '', ticket: '' });
  assert.equal(p('Mobil: 0151 1234567 bitte zurückrufen').telefon, '0151 1234567');
});

test('H-1 (1.2.3): PX und Dr. am Anfang sind Kunden', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.deepEqual(p('PX Sonnenschein, Frau Müller, Connector defekt'),
    { kunde: 'Praxis Sonnenschein', ansprechpartner: 'Frau Müller', text: 'Connector defekt', telefon: '', ticket: '' });
  assert.equal(p('KD PX Sonnenschein Kartenleser defekt').kunde, 'Praxis Sonnenschein Kartenleser');
  assert.deepEqual(p('Dr. Müller, Connector defekt'), { kunde: 'Dr. Müller', ansprechpartner: '', text: 'Connector defekt', telefon: '', ticket: '' });
  assert.deepEqual(p('Dr. med. Anna Beispiel meldet Kartenleser defekt'),
    { kunde: 'Dr. med. Anna Beispiel', ansprechpartner: '', text: 'Dr. med. Anna Beispiel meldet Kartenleser defekt', telefon: '', ticket: '' });
  assert.equal(p('Herr Dr. Schmidt, Kartenleser defekt').ansprechpartner, 'Herr Dr. Schmidt');
  assert.equal(p('Herr Dr. Schmidt, Kartenleser defekt').kunde, '');
  assert.equal(p('Dr. ist im Urlaub').kunde, '');
});

test('H-1 (1.2.3): keine falschen Treffer', () => {
  const p = (s) => NL.parseQuickInput(s);
  assert.equal(p('Kunde meldet Drucker offline').kunde, '');
  assert.equal(p('AP neu gestartet').ansprechpartner, '');
  assert.equal(p('AP Konfiguration geändert').ansprechpartner, '');
  assert.equal(p('AP Frau Müller defekt').ansprechpartner, 'Frau Müller');   // nur über die Anrede, nicht über „AP“
  assert.equal(p('Telefonie fällt aus').telefon, '');
  assert.equal(p('Telefon geht nicht').telefon, '');
});
