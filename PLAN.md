# Plan: Wunschliste-Website

## Ziel

Eine schlanke Website mit **einem Link**, den ich an Familie und Freunde schicken kann.
Darauf stehen meine Wünsche mit allen wichtigen Infos (Beschreibung, Preis, Variante/Größe,
Bild) und Links zum Shop bzw. zu meiner Amazon-Wunschliste.

Anforderungen:

- Funktioniert gut auf dem **Handy** (die meisten öffnen den Link aus WhatsApp o. Ä.)
- Wünsche lassen sich **ohne Programmierkenntnisse** hinzufügen und ändern
- **Kostenlos** zu betreiben, keine Server-Wartung
- Gute Link-Vorschau beim Teilen (Titel, Bild)
- Nicht in Google auffindbar (nur wer den Link hat, findet die Seite)

---

## Technische Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Art der Seite | Statische Website (HTML, CSS, JavaScript) | Kein Server, keine Datenbank, nichts kann „kaputtgehen“ |
| Build-Tools | Keine (kein npm, kein Framework) | Einfach zu verstehen und zu pflegen |
| Datenhaltung | Eine Datei `wuensche.js` | Alle Wünsche an einer Stelle, direkt im GitHub-Webeditor bearbeitbar. Als `.js` statt `.json`, damit Kommentare möglich sind und `index.html` auch per Doppelklick ohne Server funktioniert |
| Bilder | Eigener Ordner `bilder/` im Repo | Shop-Bilder (v. a. Amazon) nicht direkt verlinken – die Links brechen oft |
| Hosting | GitHub Pages | Kostenlos, automatisch aktualisiert bei jedem Commit |
| Suchmaschinen | `<meta name="robots" content="noindex">` | Seite taucht nicht bei Google auf (eine `robots.txt` wirkt bei GitHub-Pages-Projektseiten nicht, weil sie nicht im Wurzelverzeichnis der Domain liegt) |

> **Hinweis zu GitHub Pages:** Bei einem kostenlosen GitHub-Konto muss das Repository dafür
> **öffentlich** sein. Da die Wunschliste ohnehin geteilt wird, ist das meist kein Problem –
> aber alles im Repo (inkl. Commit-Verlauf) ist dann einsehbar. Alternative bei privatem Repo:
> Netlify oder Cloudflare Pages (ebenfalls kostenlos).

---

## Datenmodell (ein Wunsch)

Umgesetzt in `wuensche.js` (gleiche Felder, Schreibweise als JavaScript-Objekt).

```json
{
  "id": "kopfhoerer",
  "titel": "Kabellose Kopfhörer",
  "beschreibung": "Over-Ear mit Noise Cancelling, für Bahnfahrten.",
  "kategorie": "Technik",
  "prioritaet": 1,
  "preis": 349,
  "details": {
    "Modell": "Sony WH-1000XM5",
    "Farbe": "Schwarz"
  },
  "bild": "bilder/kopfhoerer.jpg",
  "links": [
    { "name": "Amazon", "url": "https://www.amazon.de/..." },
    { "name": "Hersteller", "url": "https://www.sony.de/..." }
  ],
  "hinweis": "Gebraucht/refurbished ist auch völlig okay.",
  "erfuellt": false
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | Eindeutiger Kurzname (für Direktlinks wie `…/#kopfhoerer`) |
| `titel` | ja | Name des Wunsches |
| `beschreibung` | nein | Kurz: was und warum |
| `kategorie` | nein | z. B. Technik, Bücher, Kleidung, Erlebnisse, Haushalt |
| `prioritaet` | nein | 1 = großer Wunsch, 2 = würde mich freuen, 3 = Kleinigkeit |
| `preis` | nein | Ungefährer Preis in Euro (für Preisfilter) |
| `details` | nein | Beliebige Zusatzinfos: Größe, Farbe, Modell, ISBN … |
| `bild` | nein | Pfad zum Bild im Ordner `bilder/` |
| `links` | nein | Ein oder mehrere Links (Amazon, Hersteller, anderer Shop) |
| `hinweis` | nein | z. B. „Bitte nicht Variante X“, „Gutschein geht auch“ |
| `erfuellt` | nein | `true` → Wunsch wird ausgeblendet bzw. als erledigt angezeigt |

Zusätzlich gibt es allgemeine Einstellungen (oben in der Datei):

```json
{
  "einstellungen": {
    "name": "Dein Name",
    "titel": "Meine Wunschliste",
    "einleitung": "Schön, dass du vorbeischaust! …",
    "amazonWunschliste": "https://www.amazon.de/hz/wishlist/ls/…",
    "groessen": { "T-Shirt": "M", "Schuhe": "43" }
  },
  "wuensche": [ … ]
}
```

Die allgemeinen **Größenangaben** sind praktisch, damit Schenkende bei Kleidung nicht raten müssen.

---

## Aufbau der Seite

1. **Kopfbereich** – Titel, kurze Begrüßung, Button „Zu meiner Amazon-Wunschliste“
2. **Filter & Sortierung** – Kategorie, Preisbereich (z. B. bis 25 €, 25–75 €, über 75 €),
   sortieren nach Priorität oder Preis
3. **Wunsch-Karten** (Raster, auf dem Handy eine Spalte) mit
   - Bild, Titel, Preis, Prioritäts-Kennzeichnung (z. B. ★★★)
   - Beschreibung und Details (Größe, Farbe, Modell …)
   - Buttons zu den Shops („Bei Amazon ansehen“, „Beim Hersteller“)
   - Hinweis-Text
4. **Fußbereich** – allgemeine Größen, „Gutscheine/Geld für X sind auch willkommen“, ggf. Kontakt

---

## Projektstruktur

```
Wunschliste/
├── index.html        # Seitengerüst
├── style.css         # Design (Mobile-first, heller/dunkler Modus)
├── app.js            # Liest wuensche.js und baut die Karten, Filter, Sortierung
├── wuensche.js       # ← hier werden die Wünsche gepflegt
├── bilder/           # Produktbilder
├── vorschau.png      # Bild für die Link-Vorschau (WhatsApp, Signal, …)
├── favicon.svg       # Symbol im Browser-Tab
├── schriften/        # Schriftarten, lokal eingebunden
└── README.md         # Anleitung: Wunsch hinzufügen, Bild hochladen
```

---

## Umsetzung in Phasen

### Phase 1 – Grundgerüst (MVP)
- [x] `wuensche.js` mit Einstellungen und Beispielwünschen anlegen
- [x] `index.html`, `style.css`, `app.js`: Wünsche laden und als Karten anzeigen
- [x] Links öffnen in neuem Tab (`target="_blank" rel="noopener"`)
- [x] Amazon-Wunschlisten-Button im Kopfbereich
- [x] `noindex`
- [x] Verständliche Fehlermeldung mit Zeilennummer bei Tippfehlern in `wuensche.js`

### Phase 2 – Komfort & Design
- [x] Filter nach Kategorie und Preisbereich, Sortierung nach Priorität/Preis
- [x] Ansprechendes, responsives Design inkl. Dunkelmodus
- [x] Link-Vorschau (Open-Graph-Tags: Titel, Beschreibung, Vorschaubild)
- [x] Direktlinks zu einzelnen Wünschen (`…/#kopfhoerer`) mit Kopier-Knopf
- [x] Erfüllte Wünsche ausblenden und unten unter „Schon erfüllt“ auflisten

### Phase 3 – Veröffentlichen
- [ ] GitHub Pages aktivieren (Settings → Pages → Branch `main`, Ordner `/`)
- [ ] Seite auf Handy und Desktop testen, Link-Vorschau in WhatsApp prüfen
- [x] README mit Schritt-für-Schritt-Anleitung „Neuen Wunsch hinzufügen“

### Phase 4 – Optional
- [x] **Bearbeitungsoberfläche** statt Datei von Hand: eigene Admin-Seite `admin.html`
      (Anmeldung mit GitHub-Schlüssel, Formulare, Bild-Upload, speichert über die GitHub-API)
- [ ] **„Ich schenke das“-Reservierung**, damit nichts doppelt geschenkt wird
      (braucht einen kleinen Datenspeicher, z. B. Supabase oder Firebase, kostenlos;
      Reservierungen werden ohne Namen angezeigt, damit die Überraschung bleibt)
- [x] Anzahl pro Wunsch (Feld `anzahl`, Anzeige „3× gewünscht“, Preis pro Stück)
- [ ] Mehrere Listen (z. B. Geburtstag / Weihnachten) über Feld `anlass`
- [ ] Eigene Domain

---

## Amazon-Wunschliste – Hinweise

- In Amazon die Liste auf **„Geteilt“ oder „Öffentlich“** stellen, sonst sehen andere nur eine Fehlermeldung.
- Optional eine **Geschenk-Lieferadresse** hinterlegen: Schenkende können direkt an dich
  liefern lassen, ohne deine Adresse zu sehen.
- Vorteil: Amazon markiert gekaufte Artikel automatisch als gekauft – für Amazon-Artikel
  ist das Problem „doppelt geschenkt“ damit schon gelöst.
- Preise und Daten von Amazon werden **nicht automatisch** übernommen (Amazon blockiert das
  automatische Auslesen). Preis und Bild trägt man einmal von Hand ein; der Preis ist nur
  ein Richtwert.

---

## Offene Fragen

1. Soll das Repo öffentlich sein (→ GitHub Pages) oder privat bleiben (→ Netlify/Cloudflare Pages)?
2. Wird die Reservierungsfunktion gebraucht oder reicht zunächst die Amazon-Liste?
3. Gewünschter Stil (z. B. schlicht/modern, verspielt, Farbwunsch)?
4. Eine Liste für alles oder getrennte Listen pro Anlass?
