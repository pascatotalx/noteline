# Noteline – Spezifikation

Beschreibt **was** Noteline kann und **warum**. Das Wie steht in `plan.md`.
Die Kennungen (z. B. `H-3`) werden in `tasks.md`, im Code und in den Tests referenziert.

Stand: Version 1.3.0 (06.11.2026). `[x]` = umgesetzt und getestet, `[ ]` = offen oder nur manuell prüfbar (T-16).

---

## 1. Ausgangslage

Pascal notiert während Hotline-Anrufen bisher in einer Notepad++-Datei. Probleme damit:

- Notizen verschiedener Anrufe gehen ineinander über, nichts ist erkennbar „offen" oder „erledigt".
- Rückrufe werden vergessen, weil nichts erinnert.
- Oft gebrauchte Werte (Ports, IPs, Links) liegen verstreut und müssen gesucht und markiert werden.

## 2. Nutzer und Umgebung

- Ein Nutzer, ein Windows-11-Laptop, meist mit zweitem Bildschirm. Die App läuft den ganzen Arbeitstag
  neben dem Ticketsystem.
- Während eines Anrufs hat Pascal die Hände an der Tastatur und wenig Aufmerksamkeit übrig.
- **Typische Anordnung:** Ticketsystem links, Web-Telefonie rechts oben, Noteline rechts unten in einem
  **breiten, niedrigen** Fenster (etwa 850 × 540 px). Rufnummern stehen in der Telefonie, Ticketnummern im
  Ticketsystem. Noteline läuft den ganzen Tag und soll nie versehentlich geschlossen werden.

---

## 3. User Stories und Akzeptanzkriterien

### Bereich Hotline (Anrufnotizen)

**H-1 Schnell erfassen.** Als Hotline-Mitarbeiter will ich eine Notiz anlegen, ohne die Maus zu benutzen,
damit ich beim Anruf nichts verpasse.
- [x] Nach dem Start hat das Eingabefeld oben den Fokus.
- [x] Text eingeben und Enter drücken legt eine Notiz an und öffnet sie zum Weiterschreiben.
- [x] Format `Kunde: Stichpunkt` füllt das Feld *Kunde* mit dem Teil vor dem ersten Doppelpunkt, sofern dieser
      Teil 1–59 Zeichen lang ist und kein `://` direkt dahinter folgt (Links sind kein Kundenname).
- [x] Eine **Telefonnummer** in der Eingabe (mindestens 9 Ziffern, z. B. `+49 711 1234567` oder
      `0711/1234567`) landet im Feld *Telefon* statt im Text.
- [x] Eine **Ticketnummer** mit `#` (z. B. `#0012345`) oder nach dem Wort „Ticket" landet im Feld *Ticket*.
- [x] Beides lässt sich mit `Kunde: Stichpunkt` kombinieren, die Reihenfolge ist egal.
- [x] **Ansprechpartner per Anrede** (1.2.2, Rückmeldung von Pascal): „Frau Müller“, „Herr Dr. Schmidt“, „Fr. Meier“,
      „Hr. Weber“ werden überall in der Eingabe als *Ansprechpartner* erkannt. Steht vor dem Doppelpunkt nur eine
      Anrede („Frau Müller: …“), ist das der Ansprechpartner, nicht der Kunde.
- [x] **Kunde per Merkmal**: Beginnt die Eingabe mit einem typischen Wort (Praxis, Zahnarztpraxis, Apotheke, MVZ,
      Klinik, Pflegedienst, Pflegeheim, Kanzlei, …) oder enthält der Anfang eine Rechtsform (GmbH, AG, KG, GbR, e.V.,
      UG, …), wird dieser Name als *Kunde* erkannt. Er endet an einem Komma, Gedankenstrich oder Doppelpunkt, an einer
      Anrede, nach der Rechtsform oder vor einem kleingeschriebenen Wort.
- [x] Steht nach Kunde oder Ansprechpartner ein Satzzeichen oder ein großgeschriebenes Wort, werden sie aus dem
      Stichpunkt herausgenommen. Folgt ein Verb („Frau Müller meldet, …“), bleibt der Satz als Stichpunkt vollständig.
- [x] **Bezeichnungen und Kürzel** (1.2.3, Rückmeldung von Pascal: im Hotline-Alltag wird viel abgekürzt):
      `KD`, `Kd.`, `Kunde` vor einem großgeschriebenen Namen → *Kunde*; `ASP`, `Asp.`, `Ansprechpartner(in)` → *Ansprechpartner*
      (bewusst **nicht** `AP`: das steht im Hotline-Alltag für „Arbeitsplatz“);
      `Tel`, `Tel.`, `Telefon`, `Fon`, `Mobil`, `Handy` vor einer Nummer → *Telefon* (mit Bezeichnung genügen 5 Ziffern,
      z. B. eine Durchwahl); `Tkt`, `Ticket-Nr.`, `Ticketnr.` vor einer Nummer → *Ticket*. Doppelpunkt danach ist erlaubt.
      Bezeichnung und Wert werden aus dem Stichpunkt herausgenommen. „Kunde meldet …“ (kleingeschrieben danach) bleibt Text.
- [x] `PX` am Anfang eines Kundennamens gilt als Branchenwort und wird zu „Praxis“ ausgeschrieben („PX Sonnenschein“ →
      „Praxis Sonnenschein“).
- [x] `Dr.` (auch `Dr. med.`, `Prof. Dr.`) am Anfang steht für einen Arzt bzw. seine Praxis und wird *Kunde*
      („Dr. Müller, Connector defekt“). Mit Anrede davor („Herr Dr. Schmidt“) bleibt es der Ansprechpartner.
- [x] **Kleinschreibung und Namenslänge** (1.2.4, Rückmeldung von Pascal: „px“/„kd“ wurden nicht erkannt):
      Die Kürzel `PX`, `KD`, `Kd.`, `ASP`, `Tel` gelten in jeder Schreibweise, der Name danach darf kleingeschrieben sein und
      wird mit großem Anfangsbuchstaben übernommen (Rechtsformen in üblicher Schreibweise, z. B. „gmbh“ → „GmbH“).
      Der Name reicht bis zu einem Komma, Doppelpunkt oder Gedankenstrich, sonst bis zu einer Rechtsform, sonst über alle
      großgeschriebenen Wörter vor einem Personen-Verb („meldet“, „bittet“, „fragt“ …). Gibt es nichts davon, ist es ein
      Wort (bei PX/Praxis/Dr. das Wort danach): „KD Müller Drucker offline“ → Kunde „Müller“.
- [x] Steht nur ein Kürzel ohne Namen da („PX“, „KD“), sagt die Vorschau „Jetzt den Namen eintippen“.
- [x] Ein Name ohne Merkmal (z. B. nur „Sonnenschein“) wird wie bisher mit Doppelpunkt zum Kunden:
      „Sonnenschein: Connector läuft nicht“ (siehe K-4).
- [x] Strg+N legt von überall eine leere Notiz an. Der Cursor steht im Feld *Kunde*.
- [x] Eine Notiz, die beim Schließen komplett leer ist, wird verworfen.

**H-11 Vorschau beim Anlegen.** Wie im Bereich Wissen zeigt Noteline unter dem Eingabefeld live, was erkannt wird.
- [x] Sobald getippt wird, erscheinen Anzeigen für *Kunde*, *Ansprechpartner*, *Telefon*, *Ticket* und *Stichpunkt*.
      Erkannte Felder leuchten auf, nicht erkannte bleiben blass.
- [x] Ein kurzer Hinweis erklärt die Schreibweise, z. B. „Tipp: Komma nach dem Kunden, dann der Stichpunkt.“
- [x] Die leere Liste erklärt das Anlegen in einfachen Worten mit Beispiel.

**H-2 Notiz bearbeiten.** Eine Notiz hat die Felder Kunde, Ansprechpartner, Ticket, Telefon und Freitext.
- [x] Jede Änderung wird automatisch gespeichert (spätestens 0,25 s nach der letzten Eingabe).
- [x] Die Notiz zeigt, wann sie angelegt und zuletzt geändert wurde.
- [x] Fertig, Esc oder ein Klick neben die Notiz schließen sie.

**H-3 Status und Priorität.**
- [x] Status: *Offen* (Standard), *Wartet*, *Erledigt*. Priorität: *Hoch*, *Normal* (Standard), *Niedrig*.
- [x] Eine Zeile in der Liste lässt sich mit einem Klick auf erledigt bzw. wieder auf offen setzen.

**H-4 Übersicht.** Die Liste ist in Spuren gegliedert:
- [x] *Jetzt*: nicht erledigt **und** (Priorität hoch **oder** Rückruf heute oder überfällig).
      Sortiert nach Rückrufzeit, dann Priorität.
- [x] Leere Spuren werden ausgeblendet. Gibt es gar keine Notizen, erscheint ein Hinweis zur Bedienung.
- [x] *Offen* und *Wartet*: übrige Notizen dieses Status, sortiert nach Priorität, dann neueste Änderung.
- [x] *Erledigt*: neueste Änderung zuerst, standardmäßig eingeklappt.
- [x] Ein- und Ausklappen der Spuren bleibt nach einem Neustart erhalten.
- [x] Jede Zeile zeigt Kunde, Ticket, die erste Zeile Freitext und rechts Datum oder Rückrufzeit.

**H-5 Suchen.** Text im Eingabefeld filtert sofort über Kunde, Ticket, Telefon und Freitext, ohne
Groß-/Kleinschreibung. Während der Suche sind alle Spuren aufgeklappt. Esc leert die Suche.

**H-6 Rückruf-Erinnerung.**
- [x] Eine Notiz kann einen Rückrufzeitpunkt haben. Schnellwahl: *+1 Std.*, *Morgen 9:00*, freie Eingabe.
- [x] Die freie Eingabe hat getrennte Felder für Datum und Uhrzeit. Das Datum steht beim Öffnen schon auf
      **heute** (bzw. auf dem vorhandenen Rückruftag), sodass nur die Uhrzeit eingetragen werden muss. Sobald eine
      Uhrzeit steht, ist der Rückruf gesetzt.
- [ ] Zum fälligen Zeitpunkt (Prüfung mindestens alle 30 s) erscheint eine Windows-Benachrichtigung mit
      Kunde, Telefon und erster Zeile. Ein Klick darauf öffnet die Notiz.
- [ ] Die Rückruf-Benachrichtigung bleibt unten rechts stehen, bis sie angeklickt oder geschlossen wird, und
      kommt mit dem Windows-Benachrichtigungston (außer bei „Nicht stören“). Sie erscheint auch, wenn Noteline
      im Infobereich versteckt ist.
- [x] ~~Ist das Fenster nicht aktiv, blinkt zusätzlich das Taskleistensymbol.~~ Entfällt ab 1.2.3 (kein Taskleisten-Knopf mehr, A-3).
- [x] Pro Rückrufzeitpunkt wird genau einmal erinnert. Ein neuer Zeitpunkt löst erneut aus.
- [x] Der Reiter *Hotline* zeigt die Zahl der heute fälligen und überfälligen Rückrufe als Badge.

**H-10 Notiz als Text kopieren.** Damit die Notiz ohne Abtippen ins Ticketsystem kommt.
- [x] Ein Knopf *Als Text kopieren* in der Notiz kopiert Kunde, Ansprechpartner, Telefon, Ticket, Status,
      Rückruf und Stichpunkte als lesbaren Text. Leere Felder fehlen.

**H-9 Ansprechpartner.** Damit klar ist, mit wem telefoniert wurde bzw. wer beim Kunden zuständig ist.
- [x] Das Feld *Ansprechpartner* steht in der Notiz direkt unter dem Kunden.
- [x] Die Listenzeile zeigt ihn hinter dem Kunden (z. B. „Beispiel AG · Frau Muster").
- [x] Die Suche findet Notizen auch über den Ansprechpartner.
- [x] Schnellerfassung: `Kunde / Ansprechpartner: Stichpunkt` füllt beide Felder. Getrennt wird nur an ` / `
      mit Leerzeichen, damit Namen wie „A/B GmbH" ganz bleiben.
- [x] Die Rückruf-Benachrichtigung nennt den Ansprechpartner mit.

**H-7 Löschen.** Siehe A-4 (ab 1.2.0 mit Rückgängig statt zweitem Klick).

**H-8 Ticket im Ticketsystem öffnen.**
- [x] In den Einstellungen lässt sich eine Link-Vorlage mit `<TICKET>` hinterlegen,
      z. B. `https://support.example.org/tickets?id=<TICKET>`. Sie wird nur lokal gespeichert.
- [x] Ist eine Vorlage gesetzt, öffnet ein Knopf am Ticketfeld der Notiz und in der Listenzeile das Ticket im
      Standardbrowser. `#` und Leerzeichen werden entfernt, die Nummer wird URL-sicher eingesetzt.
- [x] Ungültige Vorlagen (kein `http(s)://` oder kein `<TICKET>`) werden mit Hinweis abgelehnt.

### Bereich Wissen (Nachschlagewerte)

Überarbeitet für 1.2.0 nach Rückmeldung von Pascal: Gruppe, Bezeichnung und Wert als Formular waren zu umständlich,
die Gruppe musste immer wieder gleich eingetippt werden. Vorbild sind Snippet- und Clipboard-Werkzeuge
(Raycast, Alfred, Ditto): **Name + Wert, Typ automatisch, Favoriten, alles per Tastatur**.

**W-1 Einträge anlegen in einer Zeile, mit Live-Vorschau.** (1.2.1: Rückmeldung von Pascal, das Feld soll auf
den ersten Blick zeigen, was gerade eingetippt wird. Zwei getrennte Felder wurden erwogen und verworfen.)
- [x] Oben im Bereich Wissen steht ein Eingabefeld „Neuer Eintrag“. Enter legt den Eintrag an.
- [x] Erkannt werden: `Name: Wert` (Doppelpunkt mit Leerzeichen danach) oder ein Name mit einem erkennbaren Wert
      darin: Link, E-Mail, IP-Adresse, Telefonnummer oder Port als letztes Wort. Sonst ist alles der Wert (Text).
- [x] **Befehle** (1.2.2, Rückmeldung von Pascal): Ein PowerShell-Cmdlet (Verb-Nomen, z. B. `New-NetRoute`) oder ein
      bekannter Windows-Befehl in Kleinschreibung mit Argumenten (z. B. `route`, `ping`, `ipconfig`, `netsh`) markiert
      den Anfang des Werts. Alles davor ist der Name, alles ab dem Befehl der Wert, auch wenn IPs darin vorkommen.
      Befehle haben Vorrang vor Link-, IP- und Telefon-Erkennung.
- [x] Die Vorschau zeigt bei Befehlen „Befehl“ an und nennt vorhandene Platzhalter, die später ein Eingabefeld bekommen.
- [x] Unter dem Feld stehen zwei Anzeigen **Name** und **Wert**. Sie zeigen live, was gerade erkannt wird, und
      leuchten auf, sobald sie belegt sind. Die Wert-Anzeige nennt die erkannte Art (z. B. „IP-Adresse“).
- [x] Solange nur ein Name dasteht und nach einem Leerzeichen der Wert folgen könnte, erscheinen Vorschläge, was
      als Wert passt, jeweils mit neutralem Beispiel: Link, IP-Adresse, Telefon, E-Mail, Port, Befehl/Text (mit `:`).
- [x] Die Zeile darunter sagt, was Enter jetzt tut (z. B. „Enter speichert unter IP-Adressen“ oder
      „Enter speichert alles als Text“).
- [x] Der Name ist optional. Ohne Namen zeigt die Zeile nur den Wert.

**W-2 Übersicht ohne Gruppen.**
- [x] Einträge ordnen sich **automatisch nach Art**: *Favoriten*, *Telefon und E-Mail*, *Links*, *IP-Adressen*,
      *Ports*, *Befehle und Texte*. Innerhalb einer Art alphabetisch. Leere Arten werden ausgeblendet.
- [x] Alle Einträge sind jederzeit durchscrollbar. Die Suche filtert nur, wenn etwas eingetippt ist.
- [x] Vorhandene Einträge mit Gruppe aus 1.0/1.1 bleiben erhalten und werden ebenfalls nach Art sortiert.

**W-3 Aktionen passend zur Art.**
- [x] Klick auf die Zeile kopiert den Wert. Die Zeile zeigt kurz „Kopiert“.
- [x] Links haben zusätzlich *Öffnen*, E-Mail-Adressen *Mail schreiben*.
- [x] Bearbeiten direkt in der Zeile (Name und Wert), Löschen mit *Rückgängig* (A-4).
- [x] **Ein angefangenes Bearbeiten verliert nie Eingaben**, auch nicht durch Erinnerungen oder Aktualisierung im Hintergrund.

**W-4 Vorlagen mit Platzhaltern.** Enthält ein Wert `<NAME>`, bekommt die Zeile Eingabefelder.
- [x] Für jeden **unterschiedlichen** Platzhalter gibt es ein Eingabefeld. Gleichnamige Platzhalter werden
      gemeinsam ersetzt.
- [x] Leere Felder zeigen weiter `<NAME>`. Sonderzeichen (z. B. `$`, `&`) werden wörtlich übernommen.
- [x] Die zuletzt eingegebenen Werte bleiben gespeichert.
- [x] In **Links** werden eingesetzte Werte URL-sicher kodiert (Leerzeichen, `&`, `?` usw.).

**W-5 Favoriten.**
- [x] Ein Stern an jeder Zeile macht den Eintrag zum Favoriten. Favoriten stehen ganz oben.
- [x] Die ersten neun Favoriten lassen sich mit **Alt+1 bis Alt+9** kopieren, auch ohne den Bereich Wissen
      zu öffnen. Die Zeile zeigt das Kürzel an.

**W-6 Suchen und per Tastatur kopieren.**
- [x] Das Eingabefeld oben filtert über Name und Wert.
- [x] **Strg+Enter** kopiert den ersten Wissens-Treffer. In der schmalen Ansicht im Reiter Wissen reicht Enter.

### Bedienung allgemein

**L-1 Breites Layout.** Ab 760 px Fensterbreite nutzt Noteline zwei Spalten.
- [x] Links steht die Hotline-Liste, rechts der Bereich Wissen. Die Reiter unten entfallen.
- [x] Eine geöffnete Notiz erscheint rechts in voller Höhe statt als Blatt von unten. Die Liste bleibt sichtbar,
      die geöffnete Notiz ist dort markiert.
- [x] Das Eingabefeld sucht in beiden Spalten gleichzeitig. Enter legt weiterhin eine Notiz an.
- [ ] Wird das Fenster schmaler, wechselt Noteline ohne Datenverlust in die einspaltige Ansicht.

**A-1 Fenster.**
- [x] Erster Start: Breite ein Viertel des Hauptbildschirms (mindestens 440 px), volle Höhe, rechter Rand.
- [ ] Eigene, flache Titelleiste: Logo, Name und Knöpfe teilen sich eine Zeile mit den Fensterknöpfen von
      Windows. Die Zeile dient zum Verschieben des Fensters.
- [x] Die Titelleiste bleibt **immer sichtbar und bedienbar**, auch in einem niedrigen Fenster und wenn Einstellungen
      oder eine Notiz als Blatt offen sind. Blätter beginnen unter der Titelleiste und scrollen innen
      (1.2.5, Fehlerbericht von Pascal).
- [x] Position und Größe werden gemerkt. Liegt die gespeicherte Position auf keinem Bildschirm mehr,
      gilt die Standardposition.
- [x] *Immer im Vordergrund* ist umschaltbar und wird gemerkt.
- [ ] Strg+Alt+H holt das Fenster aus jeder Anwendung nach vorne.
- [x] Nur eine Instanz läuft. Ein zweiter Start holt das vorhandene Fenster nach vorne.
- [x] Wird eine Datei ins Fenster gezogen, passiert nichts (die App wird nicht durch die Datei ersetzt).

**A-2 Einstellungen und Info.** Ein Zahnrad öffnet ein Panel mit:
- [x] installierter Version
- [x] Update-Status und Knopf *Nach Updates suchen* (siehe U-2)
- [x] Erscheinungsbild *Dunkel*, *Hell* oder *Wie Windows*. Gilt sofort, auch für die Titelleiste, und wird gemerkt.
- [ ] Schalter *Uhr anzeigen* (Standard: aus, die Taskleiste zeigt die Uhrzeit bereits)
- [x] Feld *Ticket-Link* (siehe H-8)
- [x] Schalter *Mit Windows starten* und *Immer im Vordergrund*
- [x] Speicherort als anklickbarer Pfad (`Dokumente\Noteline`), der den Ordner im Explorer öffnet.
      Kein eigener Backup-Knopf.

**A-4 Rückgängig statt Nachfragen.** (Best Practice: Bestätigungen werden aus Gewohnheit weggeklickt.)
- [x] Löschen einer Notiz oder eines Wissens-Eintrags passiert sofort. Ein Hinweis „Gelöscht · Rückgängig“ bleibt
      6 Sekunden sichtbar, ein Klick holt den Eintrag unverändert zurück.

**A-3 Läuft im Hintergrund.** Noteline wird nicht versehentlich beendet.
- [x] Das Schließen-Kreuz und das Minimieren verstecken das Fenster. Noteline läuft im Infobereich der
      Taskleiste (unten rechts) weiter, Erinnerungen und Updates funktionieren weiter.
- [ ] Beim ersten Verstecken erklärt eine Windows-Benachrichtigung, wo Noteline weiterläuft.
- [ ] Ein Klick auf das Symbol im Infobereich zeigt das Fenster. Rechtsklick bietet *Noteline öffnen*,
      *Nach Updates suchen* und *Beenden*.
- [ ] Beenden ist nur über das Symbol im Infobereich möglich, außerdem beim Abmelden oder Herunterfahren von Windows.
- [ ] Strg+Alt+H und ein erneuter Start über die Verknüpfung holen das versteckte Fenster nach vorne.
- [ ] **Kein Taskleisten-Knopf** (1.2.3, Wunsch von Pascal): Noteline erscheint nur als kleines Symbol im Infobereich,
      auch wenn das Fenster offen ist. Öffnen über das Symbol, Strg+Alt+H oder die Verknüpfung.

### Statusmonitor (optional, ab 1.3.0)

Wunsch von Pascal: Ausfälle von Online-Diensten (TI, Doctolib) bekommt man im Hotline-Alltag oft zu spät mit.
Noteline prüft öffentliche Statusseiten und meldet Änderungen sofort. Für andere Nutzer ist die Funktion
standardmäßig aus (Constitution 2).

**S-1 Ein- und ausschalten.**
- [x] In den Einstellungen gibt es einen Schalter *Statusmonitor*. Standard: aus. Aus heißt: kein Abruf, keine Anzeige.
- [x] Mitgelieferte Vorlagen zum Anhaken: *TI-Lagebild (gematik)* und *Doctolib*. Weitere Dienste (z. B. Hoster ohne
      Statusseite) lassen sich als eigene Quelle ergänzen.
- [x] Prüfabstand wählbar: 5, 15 (Standard) oder 30 Minuten. Zusätzlich wird beim Start und per Knopf geprüft.

**S-2 Arten von Quellen.**
- [x] **TI-Lagebild:** offizielle TI-Status-API der gematik (`/lageapi/v1/tistatus/incident`). Offene Einschränkungen
      (ohne `closedAt`) zählen: Status 1 = Ausfall, 4 = Teilausfall, 2 = erholt sich gerade.
- [x] **Statusseite:** Seiten im verbreiteten Statuspage-Format (`/api/v2/summary.json`), z. B. Doctolib. Gesamtstatus
      und offene Vorfälle werden übernommen, Wartungen gesondert gekennzeichnet.
- [x] **Erreichbarkeit:** für Dienste ohne Statusseite. Antwortet die Adresse nicht innerhalb von 15 s oder mit Fehler,
      gilt der Dienst als nicht erreichbar.
- [x] Eigene Quellen: Name und Adresse eintragen, Noteline erkennt selbst, ob es eine Statusseite ist, sonst Erreichbarkeit.

**S-3 Anzeige.**
- [x] Links neben der Uhr in der Titelleiste steht ein kleines Statusfeld: grün „Status ok“, gelb „Störung“, rot „Ausfall“,
      grau „unbekannt“ (Abruf fehlgeschlagen), jeweils mit Anzahl betroffener Dienste.
- [x] Ein Klick öffnet die Übersicht: je Dienst Zustand, letzte Prüfung, offene Meldungen mit Text und Beginn,
      Link zur Originalseite und *Jetzt prüfen*.
- [x] Texte aus den Quellen werden als reiner Text angezeigt (kein HTML aus fremden Quellen).

**S-4 Benachrichtigungen.**
- [x] Bei jeder Änderung kommt eine Windows-Benachrichtigung, die stehen bleibt, bis sie weggeklickt wird:
      neue Störung, Verschlechterung, Behebung. Ein Klick öffnet die Übersicht.
- [x] Beim allerersten Abruf nach dem Einschalten wird nichts gemeldet (keine Flut für längst bekannte Störungen).
- [x] Ein fehlgeschlagener Abruf (z. B. kein Internet) löst keine Störungsmeldung aus, er zeigt nur „unbekannt“.

### Installation und Updates

**U-1 Installation.** Ein Installer `Noteline-Setup-<version>.exe` installiert pro Benutzer ohne
Adminrechte, legt Startmenü- und Desktop-Verknüpfung an und lässt sich über Windows deinstallieren.
Deinstallieren löscht **keine** Daten.

**U-2 Updates.**
- [ ] 10 s nach dem Start und danach **jede Stunde** prüft die App auf eine neuere Version auf GitHub.
- [ ] Gibt es eine, wird sie im Hintergrund heruntergeladen.
- [ ] Danach erscheint ein Hinweis „Update x.y.z bereit" mit dem Knopf *Jetzt neu starten*.
- [ ] Zusätzlich kommt **einmal pro Version** eine Windows-Benachrichtigung. Ein Klick darauf zeigt Noteline.
- [ ] Ohne Klick installiert sich das Update beim Beenden oder **still im Ruhezustand**: Fenster ist im
      Infobereich versteckt, keine Notiz offen und Windows seit mindestens 10 Minuten ohne Eingabe.
      Danach startet Noteline wieder versteckt im Infobereich (siehe K-2).
- [ ] Ein Neustart, während Pascal mit Noteline arbeitet, passiert nie (siehe Constitution 5).
- [ ] *Nach Updates suchen* zeigt den Ergebnisstatus: *Wird gesucht …*, *Aktuell*, *Wird geladen (x %)*,
      *Bereit*, *Fehler: …*.
- [ ] Ohne Internet oder bei GitHub-Fehlern läuft die App normal weiter. Der Fehler steht nur im Panel.
- [ ] Vor dem Neustart für ein Update werden alle Daten gespeichert.

### Daten und Sicherheit

**D-1 Speicherort.** Daten liegen in `Dokumente\Noteline\daten.json`, Einstellungen (Fenster,
Erscheinungsbild, Ticket-Link) in `einstellungen.json`. Eine vorhandene `fenster.json` aus Version 1.0 wird
übernommen. Gibt es beim ersten Start noch `Dokumente\Hotline-Notizen\daten.json` (Prototyp),
wird sie einmalig übernommen. Das Original bleibt liegen.

**D-2 Backups.** Ohne eigenen Knopf in der Oberfläche: Mindestens einmal pro Kalendertag, an dem die App läuft, entsteht
`Backups\daten-JJJJ-MM-TT.json`, auch wenn die App über Mitternacht offen bleibt. Es werden die letzten
30 Backups behalten.

**D-3 Schutzmodus.** Ist `daten.json` vorhanden, aber nicht lesbar oder kein gültiges Noteline-Format:
- [x] Die App zeigt einen roten Hinweis mit Knopf zum Datenordner (Backups liegen im Unterordner `Backups`).
- [x] Sie speichert **nichts**, bis die Datei repariert und die App neu gestartet ist.
- [x] Eine Kopie der defekten Datei wird als `daten-defekt-<Zeitstempel>.json` abgelegt.

**D-4 Kein Datenverlust beim Beenden.** Beim Schließen des Fensters, beim Beenden und vor einem
Update-Neustart wird der aktuelle Stand synchron geschrieben.

**D-5 Fehlerhafte Einträge.** Fehlt einer Notiz ein Feld (z. B. aus älteren Dateien), ergänzt die App
Standardwerte, statt abzustürzen.

---

## 4. Nicht-Ziele (Version 1)

- Mehrere Benutzer, Synchronisation, Cloud, Mobil-Version
- Formatierter Text, Bilder oder Anhänge in Notizen
- macOS oder Linux
- Code-Signatur (der Installer ist unsigniert, SmartScreen-Hinweis beim ersten Installieren ist akzeptiert)

## 5. Offene Punkte / Backlog

- **B-1 Import aus Notepad++**: bestehende Textdatei einlesen und in Notizen aufteilen. Trennregel klären.
- **B-2 Export** im Format wie Skill „Ticket schreiben" (der einfache Text-Export ist H-10).
- **B-5 Erledigte Notizen archivieren**: ältere erledigte Notizen automatisch aus der Liste nehmen, durchsuchbar halten.

## 6. Entscheidungen (Clarify)

- **K-1 Update-Quelle (06.11.2026):** Ein **öffentliches** Repo `pascatotalx/noteline` enthält Code,
  Specs und Releases. Die App braucht deshalb keinen Token. Daraus folgen die Anforderungen R-1 bis R-3.
- **K-2 Update-Zeitpunkt:** Automatisch geladen, installiert per Klick auf *Jetzt neu starten* oder beim
  nächsten Beenden. Kein Zwangsneustart während eines Anrufs.
  *Ergänzt am 06.11.2026:* Weil Noteline dauerhaft im Infobereich läuft (A-3), käme ein „nächstes Beenden"
  kaum vor. Deshalb installiert es sich zusätzlich still, wenn Noteline versteckt ist und Windows seit
  10 Minuten ohne Eingabe ist.
- **K-3 Backups (06.11.2026):** Pascal braucht keinen Backup-Knopf, nur den Datenordner. Die täglichen
  Sicherungen laufen unsichtbar weiter, weil sie nichts kosten und vor Datenverlust schützen.
- **K-4 Kundenerkennung (06.11.2026):** Automatisch nur mit sicheren Merkmalen (Anrede, Branchenwort am Anfang,
  Rechtsform). Ein reines Komma reicht nicht, weil „Connector läuft nicht, bitte zurückrufen“ sonst einen falschen
  Kunden ergäbe. Für Namen ohne Merkmal gilt der Doppelpunkt. Die Live-Vorschau (H-11) zeigt vor dem Enter, was erkannt wurde.

## 7. Öffentliches Repository

**R-1 Keine sensiblen Daten im Repo (höchste Priorität).** Gilt auch, wenn die App weitergegeben wird
und andere Personen Daten eintragen.
- [x] Die App speichert Nutzerdaten ausschließlich im Dokumente-Ordner des Benutzers, nie im
      Programm- oder Projektordner.
- [x] Die App lädt keine Nutzerdaten hoch. Netzwerkzugriffe sind nur der lesende Update-Abruf und, wenn eingeschaltet,
      die lesenden Abrufe des Statusmonitors (S-1).
- [x] Der Installer enthält keine Daten. Ein neuer Benutzer startet mit leerer App.
- [x] `.gitignore` schließt Datendateien, Backups, Build-Ausgaben, `.env` und Logs aus.
- [x] Ein Git-Hook blockiert Commits mit Datendateien (`daten*.json`, `fenster.json`, `einstellungen.json`, `Backups/`) oder
      Zugangsdaten (Token-Muster, privaten Schlüsseln).
- [x] Ein GitHub-Workflow prüft jeden Push zusätzlich auf Zugangsdaten und Datendateien.
- [x] Testdaten sind ausgedacht (keine echten Kunden, Telefonnummern, Tickets, internen IPs).
- [x] Veröffentlicht wird über die Anmeldung von `gh`. Kein Token in Dateien, Skripten oder Umgebungsvariablen.
- [x] Commits verwenden die GitHub-noreply-Adresse statt einer privaten E-Mail-Adresse.

**R-4 Logo „One Flow".** (06.11.2026, von Pascal geliefert)
- [x] Vektorquellen liegen in `brand/`, daraus abgeleitet `build/icon.ico` (16–256 px) und `build/icon.png`.
- [ ] Installer, Programm, Taskleiste und Infobereich nutzen das neue Icon.
- [x] Die Titelleiste zeigt das Logo-Symbol. Der helle Strich folgt dem Theme, damit es auch im hellen Modus sichtbar ist.
- [x] Das README zeigt das App-Icon.

**R-2 Gepflegter Auftritt.**
- [x] README mit Kurzbeschreibung, Screenshot, Installation, Funktionen, Tastenkürzeln, Datenschutz und
      Entwicklung.
- [x] `LICENSE` (MIT), `CHANGELOG.md` im Format „Keep a Changelog", `SECURITY.md`.
- [x] Repo-Beschreibung und Topics sind gesetzt.
- [x] Commits sind klein und aussagekräftig (Conventional Commits, z. B. `feat:`, `fix:`, `docs:`).

**R-3 Releases.**
- [x] Jede Version ist ein GitHub-Release mit Tag `vX.Y.Z`, Titel `Noteline X.Y.Z` und deutschen
      Release-Notes aus `CHANGELOG.md`.
- [x] Assets: `Noteline-Setup-X.Y.Z.exe`, `.blockmap` und `latest.yml` (für den Updater).
- [x] Ein Release wird erst veröffentlicht, wenn alle Dateien hochgeladen sind (kein halbfertiges „Latest").
