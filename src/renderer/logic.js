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
  // Mit Bezeichnung davor reichen 3 Ziffern, z. B. eine Durchwahl (1.2.3): „Tel. 123“, „Mobil: 0151 …“
  const TELEFON_BEZ = /(?<![\wäöüÄÖÜß])(?:Tel(?:efon)?\.?|Fon|Mobil|Handy)\s*:?\s*((?:\+\d|\d)[\d /()-]*\d|\d)/i;
  const TICKET = [/(?<![\w&])#\s?(\d{3,})\b/, /(?<![\wäöüÄÖÜß])(?:Ticket(?:-?(?:nummer|nr\.?))?|Tkt\.?)\s*:?\s*#?\s*(\d{3,})\b/i];
  const ziffern = (s) => s.replace(/\D/g, '').length;

  // Ansprechpartner per Anrede (H-1, 1.2.2): „Frau Müller“, „Herr Dr. Schmidt“, „Fr. Meier“, „Hr. Weber-Lang“
  const ANREDE_QUELLE = '(?:Frau|Herr|Fr\\.|Hr\\.)\\s+(?:(?:Dr|Prof)\\.\\s*(?:med\\.\\s*)?)*[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?';
  const ANREDE_IRGENDWO = new RegExp(`(?<![\\wäöüÄÖÜß])${ANREDE_QUELLE}`);
  const ANREDE_VORN = new RegExp(`^${ANREDE_QUELLE}`);
  const istAnrede = (t) => new RegExp(`^${ANREDE_QUELLE}$`).test(str(t).trim());
  // Kunde per Merkmal: Branchenwort am Anfang (auch Kürzel PX) oder Rechtsform im Namen
  const BRANCHE = /^(?:(?:Zahnarzt|Arzt|Hausarzt|Kinderarzt|Tierarzt|Frauenarzt|Augenarzt|Gemeinschafts|Physiotherapie|Ergotherapie|Logopädie)?[Pp]raxis|Praxisgemeinschaft|PX\.?|Px\.?|Apotheke|MVZ|Klinik|Klinikum|Krankenhaus|Pflegedienst|Pflegeheim|Altenheim|Seniorenheim|Seniorenresidenz|Seniorenzentrum|Tagespflege|Hospiz|Sanitätshaus|Labor|Kanzlei|Steuerkanzlei|Notariat|Stadtwerke|Stadtverwaltung|Gemeinde|Hotel|Autohaus|Schule|Kita|Kindergarten)$/;
  const TITEL_VORN = /^(?:Dr|Dres|Prof)\.$/;                    // „Dr. Müller“ am Anfang = Arzt bzw. Praxis (1.2.3)
  const RECHTSFORM = /^(?:GmbH|gGmbH|mbH|AG|KG|GbR|OHG|UG|e\.V\.|eV|e\.K\.|eG|PartG|SE|KGaA|Ltd\.?|Inc\.?)$/;
  const VERBINDER = new Set(['am', 'an', 'im', 'in', 'der', 'die', 'das', 'den', 'dem', 'des', 'und', '&', 'für', 'zum', 'zur', 'bei', 'von', 'vom', 'auf', 'Co.', 'Co']);
  const TITEL_TEIL = /^(?:Dr|Dres|Prof|med|dent|Dipl|rer|nat)\.$/;
  // Bezeichnungen vor Kunde und Ansprechpartner (1.2.3). „AP“ bewusst nicht: steht für „Arbeitsplatz“.
  const BEZ_KUNDE = /(?<![\wäöüÄÖÜß])(?:Kunde|KUNDE|Kd\.|KD|kd\.)\s*:?\s+(?=[A-ZÄÖÜ])/;
  const BEZ_ANSPRECHPARTNER = /(?<![\wäöüÄÖÜß])(?:Ansprechpartner(?:in)?|ASP|Asp\.)\s*:?\s+(?=[A-ZÄÖÜ])/;
  const BEZ_WORT = /^(?:Kunde|KUNDE|Kd\.|KD|kd\.|Ansprechpartner(?:in)?|ASP|Asp\.|Tel(?:efon)?\.?|Fon|Mobil|Handy|Ticket|Tkt\.?)$/;
  const ohneSatzzeichen = (t) => t.replace(/[,:;]+$/, '');
  const ausschreiben = (name) => name.replace(/^(?:PX|Px)\.?(?=\s|$)/, 'Praxis');

  /** Länge eines Namens am Anfang von v (Großschreibung, Verbinder, Titel, Rechtsform). */
  function nameLaenge(v, { anredeErlaubt = false, max = 6 } = {}) {
    const tokens = [...v.matchAll(/\S+/g)];
    let ende = -1;
    for (let i = 0; i < tokens.length && i < max; i++) {
      const roh = tokens[i][0], t = ohneSatzzeichen(roh);
      const anrede = /^(?:Frau|Herr|Fr\.|Hr\.)$/.test(t);
      if (i > 0 && (BEZ_WORT.test(t) || (anrede && !anredeErlaubt))) break;   // nächste Bezeichnung oder Anrede
      const passt = /^[A-ZÄÖÜ]/.test(t) || VERBINDER.has(t) || RECHTSFORM.test(t) || TITEL_TEIL.test(t);
      if (!passt) break;
      ende = i;
      if (roh !== t) break;                                                     // Komma/Doppelpunkt am Wort
      const weiter = tokens[i + 1] && tokens[i + 1][0];
      if (RECHTSFORM.test(t) && !(weiter && /^(?:&|Co\.?|KG|mbH)/.test(weiter))) break;
    }
    while (ende > 0 && VERBINDER.has(ohneSatzzeichen(tokens[ende][0]))) ende--;
    return ende < 0 ? 0 : tokens[ende].index + ohneSatzzeichen(tokens[ende][0]).length;
  }

  /** Länge eines Kundennamens am Anfang (Branchenwort, PX, Dr. oder Rechtsform), sonst 0. */
  function kundeAmAnfang(v) {
    const tokens = [...v.matchAll(/\S+/g)];
    if (!tokens.length) return 0;
    const erstes = ohneSatzzeichen(tokens[0][0]);
    const branche = BRANCHE.test(erstes) || TITEL_VORN.test(erstes);
    const rfIndex = tokens.slice(0, 7).findIndex(t => RECHTSFORM.test(ohneSatzzeichen(t[0])));
    if (!branche && rfIndex < 0) return 0;
    let ende = -1;
    for (let i = 0; i < tokens.length && i < 8; i++) {
      const roh = tokens[i][0], t = ohneSatzzeichen(roh);
      if (i > 0 && (/^(?:Frau|Herr|Fr\.|Hr\.)$/.test(t) || BEZ_WORT.test(t))) break;  // Anrede oder Bezeichnung beginnt
      const passt = i === 0 || /^[A-ZÄÖÜ0-9]/.test(t) || VERBINDER.has(t) || RECHTSFORM.test(t) || TITEL_TEIL.test(t);
      if (!passt) break;                                                              // kleingeschriebenes Wort
      ende = i;
      if (roh !== t) break;                                                           // Komma/Doppelpunkt am Wort
      const weiter = tokens[i + 1] && tokens[i + 1][0];
      if (RECHTSFORM.test(t) && !(weiter && /^(?:&|Co\.?|KG|mbH)/.test(weiter))) break; // Name endet mit Rechtsform
    }
    while (ende > 0 && (VERBINDER.has(ohneSatzzeichen(tokens[ende][0])) || TITEL_TEIL.test(ohneSatzzeichen(tokens[ende][0])))) ende--;
    if (ende < 0) return 0;
    if (branche && rfIndex < 0 && ende < 1) return 0;                                 // „Praxis“/„Dr.“ allein reicht nicht
    if (!branche && rfIndex > ende) return 0;                                         // Rechtsform muss im Namen liegen
    return tokens[ende].index + ohneSatzzeichen(tokens[ende][0]).length;
  }

  /** Was nach einem erkannten Namen kommt: Satzzeichen/Großschreibung → Name raus, Verb → Satz bleibt. */
  function nachName(rest) {
    const sep = /^\s*(?:[,:;–]|\s-)\s*/.exec(rest);
    if (sep) return { raus: true, rest: rest.slice(sep[0].length) };
    if (/^\s+[a-zäöüß]/.test(rest)) return { raus: false };
    return { raus: true, rest: rest.trim() };
  }

  const aufraeumen = (v) => v.replace(/\s+/g, ' ').replace(/\s+([:,;])/g, '$1').replace(/([,;:])(?:\s*[,;])+/g, '$1')
    .replace(/^[\s:,;–-]+|[\s,;–-]+$/g, '');
  const ausschneiden = (v, start, ende) => v.slice(0, start) + ', ' + v.slice(ende);

  /** Teilt die Schnellerfassung auf: Telefon, Ticket, Kunde, Ansprechpartner, Stichpunkt (H-1, H-9). */
  function parseQuickInput(raw) {
    let v = str(raw).trim();
    let telefon = '', ticket = '', kunde = '', ansprechpartner = '';
    let geaendert = false;

    // Telefon: erst mit Bezeichnung (auch kurze Durchwahl), sonst lange Nummer irgendwo
    const tb = v.match(TELEFON_BEZ);
    if (tb && ziffern(tb[1]) >= 3) { telefon = tb[1].trim(); v = ausschneiden(v, tb.index, tb.index + tb[0].length); geaendert = true; }
    else {
      for (const m of v.matchAll(TELEFON)) {
        if (ziffern(m[0]) >= 9) { telefon = m[0].trim(); v = v.slice(0, m.index) + ' ' + v.slice(m.index + m[0].length); geaendert = true; break; }
      }
    }
    for (const re of TICKET) {
      const m = v.match(re);
      if (m) { ticket = '#' + m[1]; v = v.slice(0, m.index) + ' ' + v.slice(m.index + m[0].length); geaendert = true; break; }
    }
    // Bezeichnungen: „KD Muster GmbH“, „Kunde: Sonnenschein“, „ASP Frau Müller“
    const bk = v.match(BEZ_KUNDE);
    if (bk) {
      const start = bk.index + bk[0].length, laenge = nameLaenge(v.slice(start));
      if (laenge) { kunde = ausschreiben(v.slice(start, start + laenge).trim()); v = ausschneiden(v, bk.index, start + laenge); geaendert = true; }
    }
    const ba = v.match(BEZ_ANSPRECHPARTNER);
    if (ba) {
      const start = ba.index + ba[0].length, laenge = nameLaenge(v.slice(start), { anredeErlaubt: true, max: 5 });
      if (laenge) { ansprechpartner = v.slice(start, start + laenge).trim(); v = ausschneiden(v, ba.index, start + laenge); geaendert = true; }
    }
    if (geaendert) v = aufraeumen(v);
    let text = v;

    // 1. Ausdrücklich mit Doppelpunkt: „Kunde / Ansprechpartner: Stichpunkt“ (auch „Kunde, Frau Müller: …“)
    const i = v.indexOf(':');
    if (i > 0 && i < 60 && v.slice(i, i + 3) !== '://') {
      text = v.slice(i + 1).trim();
      for (const teil of v.slice(0, i).split(/\s+\/\s+|,\s*/)) {
        const t = teil.trim();
        if (!t) continue;
        if (!ansprechpartner && istAnrede(t)) ansprechpartner = t;
        else if (!kunde) kunde = ausschreiben(t);
        else if (!ansprechpartner) ansprechpartner = t;
      }
      if (!ansprechpartner) { const m = text.match(ANREDE_IRGENDWO); if (m) ansprechpartner = m[0]; }
      return { kunde, ansprechpartner, text, telefon, ticket };
    }

    // 2. Ohne Doppelpunkt: Kunde am Anfang (Branchenwort/PX/Dr./Rechtsform), dann Anrede
    let rest = v;
    const k = kunde ? 0 : kundeAmAnfang(v);
    if (k) {
      kunde = ausschreiben(v.slice(0, k).trim());
      const n = nachName(v.slice(k));
      if (!n.raus) {
        const m = ansprechpartner ? null : v.match(ANREDE_IRGENDWO);
        return { kunde, ansprechpartner: ansprechpartner || (m ? m[0] : ''), text: v, telefon, ticket };
      }
      rest = n.rest;
    }
    if (!ansprechpartner) {
      const vorn = rest.match(ANREDE_VORN);
      if (vorn) {
        ansprechpartner = vorn[0];
        const n = nachName(rest.slice(vorn[0].length));
        if (n.raus) rest = n.rest;
      } else {
        const m = rest.match(ANREDE_IRGENDWO);
        if (m) ansprechpartner = m[0];
      }
    }
    return { kunde, ansprechpartner, text: rest.trim(), telefon, ticket };
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

  // ---------- Befehle erkennen (W-1, 1.2.2) ----------
  // PowerShell-Verben (Auswahl der offiziellen „approved verbs“)
  const PS_VERBEN = new Set(('Add Approve Block Clear Compare Compress Connect Convert ConvertFrom ConvertTo Copy Debug Disable Disconnect '
    + 'Dismount Enable Enter Exit Expand Export Find Format Get Grant Import Initialize Install Invoke Join Lock Measure Mount Move New '
    + 'Optimize Out Pop Publish Push Read Receive Register Remove Rename Repair Reset Resize Resolve Restart Resume Revoke Save Select '
    + 'Send Set Show Split Start Stop Suspend Sync Test Trace Unblock Uninstall Unlock Unregister Update Use Wait Write').split(' '));
  // Windows-Befehle in Kleinschreibung; die erste Gruppe braucht Argumente, die zweite steht auch allein
  const CLI_MIT_ARGS = new Set(('route ping tracert pathping nslookup netsh netstat arp telnet curl ssh scp mstsc gpresult sfc dism chkdsk '
    + 'shutdown net sc reg wmic powershell pwsh cmd msiexec robocopy xcopy certutil icacls schtasks winget setx cmdkey runas taskkill '
    + 'ipconfig start').split(' '));
  const CLI_ALLEIN = new Set('ipconfig whoami hostname systeminfo gpupdate tasklist'.split(' '));

  /** Index, an dem ein Befehl beginnt, sonst -1. */
  function befehlStart(text) {
    const tokens = [...str(text).matchAll(/\S+/g)];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i][0], naechstes = tokens[i + 1] && tokens[i + 1][0];
      const cmdlet = /^([A-Z][a-z]+)-[A-Z][A-Za-z0-9]+$/.exec(t);
      if (cmdlet && PS_VERBEN.has(cmdlet[1]) && (!naechstes || naechstes.startsWith('-') || naechstes === '|')) return tokens[i].index;
      const cli = t.replace(/\.exe$/, '');
      if (CLI_ALLEIN.has(cli) && (!naechstes || /^[-/]/.test(naechstes))) return tokens[i].index;
      if (CLI_MIT_ARGS.has(cli) && naechstes) return tokens[i].index;
    }
    return -1;
  }

  /** "Name: Wert" oder "Name mit Wert darin" → { titel, wert }. */
  function parseWissenEingabe(raw) {
    const v = str(raw).trim().replace(/\s+/g, ' ');
    if (!v) return { titel: '', wert: '' };
    const doppel = /^([^:]{1,60}?):\s+(.+)$/.exec(v);
    if (doppel && !/^https?$/i.test(doppel[1])) return { titel: doppel[1].trim(), wert: doppel[2].trim() };
    const b = befehlStart(v); // Befehle zuerst, sonst würde z. B. die Maske 255.255.255.255 als IP abgeschnitten
    if (b >= 0) return { titel: v.slice(0, b).trim().replace(/[\s:,;–-]+$/, ''), wert: v.slice(b).trim() };
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

  /** Live-Vorschau beim Tippen (W-1): leer | name (Wert fehlt noch) | fertig (Wert erkannt). */
  function wissenVorschau(raw) {
    const v = str(raw), t = v.trim();
    const leerzeichen = /\s$/.test(v);
    if (!t) return { zustand: 'leer', titel: '', wert: '', typ: null, leerzeichen };
    const p = parseWissenEingabe(t);
    const typ = wissenTyp(p.wert);
    if (typ !== 'befehl' || /^([^:]{1,60}?):\s+(.+)$/.test(t) || befehlStart(t) >= 0) return { zustand: 'fertig', titel: p.titel, wert: p.wert, typ, leerzeichen };
    return { zustand: 'name', titel: t.replace(/:\s*$/, ''), wert: '', typ: null, leerzeichen };
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
    placeholders, fillTemplate, istLink, wissenTyp, parseWissenEingabe, wissenVorschau, wissenAbschnitte, favoriten, notizAlsText,
    normalize, normalizeNotiz, normalizeWissen,
  };
});
