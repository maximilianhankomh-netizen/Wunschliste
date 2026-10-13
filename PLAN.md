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
| Datenhaltung | Eine Datei `wuensche.json` | Alle Wünsche an einer Stelle, direkt im GitHub-Webeditor bearbeitbar |
| Bilder | Eigener Ordner `bilder/` im Repo | Shop-Bilder (v. a. Amazon) nicht direkt verlinken – die Links brechen oft |
| Hosting | GitHub Pages | Kostenlos, automatisch aktualisiert bei jedem Commit |
| Suchmaschinen | `<meta name="robots" content="noindex">` + `robots.txt` | Seite taucht nicht bei Google auf |

> **Hinweis zu GitHub Pages:** Bei einem kostenlosen GitHub-Konto muss das Repository dafür
> **öffentlich** sein. Da die Wunschliste ohnehin geteilt wird, ist das meist kein Problem –
> aber alles im Repo (inkl. Commit-Verlauf) ist dann einsehbar. Alternative bei privatem Repo:
> Netlify oder Cloudflare Pages (ebenfalls kostenlos).

---

## Datenmodell (ein Wunsch)

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
├── app.js            # Lädt wuensche.json und baut die Karten, Filter, Sortierung
├── wuensche.json     # ← hier werden die Wünsche gepflegt
├── bilder/           # Produktbilder
├── vorschau.jpg      # Bild für die Link-Vorschau (WhatsApp, Signal, …)
├── robots.txt        # Suchmaschinen aussperren
└── README.md         # Anleitung: Wunsch hinzufügen, Bild hochladen
```

---

## Umsetzung in Phasen

### Phase 1 – Grundgerüst (MVP)
- [ ] `wuensche.json` mit Einstellungen und 2–3 Beispielwünschen anlegen
- [ ] `index.html`, `style.css`, `app.js`: Wünsche laden und als Karten anzeigen
- [ ] Links öffnen in neuem Tab (`target="_blank" rel="noopener"`)
- [ ] Amazon-Wunschlisten-Button im Kopfbereich
- [ ] `noindex` + `robots.txt`

### Phase 2 – Komfort & Design
- [ ] Filter nach Kategorie und Preisbereich, Sortierung nach Priorität/Preis
- [ ] Ansprechendes, responsives Design inkl. Dunkelmodus
- [ ] Link-Vorschau (Open-Graph-Tags: Titel, Beschreibung, Vorschaubild)
- [ ] Direktlinks zu einzelnen Wünschen (`…/#kopfhoerer`)
- [ ] Erfüllte Wünsche ausblenden oder als „schon erfüllt“ markieren

### Phase 3 – Veröffentlichen
- [ ] GitHub Pages aktivieren (Settings → Pages → Branch `main`, Ordner `/`)
- [ ] Seite auf Handy und Desktop testen, Link-Vorschau in WhatsApp prüfen
- [ ] README mit Schritt-für-Schritt-Anleitung „Neuen Wunsch hinzufügen“

### Phase 4 – Optional
- [ ] **Bearbeitungsoberfläche** statt JSON von Hand: z. B. [Pages CMS](https://pagescms.org)
      (verbindet sich mit dem GitHub-Repo, Formular für jeden Wunsch, Bild-Upload)
- [ ] **„Ich schenke das“-Reservierung**, damit nichts doppelt geschenkt wird
      (braucht einen kleinen Datenspeicher, z. B. Supabase oder Firebase, kostenlos;
      Reservierungen werden ohne Namen angezeigt, damit die Überraschung bleibt)
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
