# Wunschliste

Eine kleine Website mit meinen Wünschen, die ich per Link an Familie und Freunde schicken kann.
Zu jedem Wunsch gibt es Beschreibung, ungefähren Preis, Details (Größe, Farbe, Modell …) und
Links zum Shop bzw. zu Amazon.

- Funktioniert auf Handy und Computer, hell und dunkel
- Filter nach Kategorie und Preis, Sortierung nach Wichtigkeit oder Preis
- Direktlink zu einzelnen Wünschen (Ketten-Symbol auf jeder Karte)
- Erscheint nicht bei Google (`noindex`)
- **Admin-Seite** zum Anlegen, Bearbeiten und Löschen von Wünschen, mit Bild-Upload
- Keine Datenbank, kein Server, keine Kosten

**Alle Inhalte stehen in einer einzigen Datei: [`wuensche.js`](wuensche.js).**
Die Admin-Seite ändert genau diese Datei.

---

## Seite online stellen (einmalig)

Die Seite braucht einen kostenlosen Hoster. Es gibt zwei Wege.

### Weg A: GitHub Pages (empfohlen, alles bleibt bei GitHub)

Bei einem kostenlosen GitHub-Konto funktioniert GitHub Pages nur mit **öffentlichen** Repositories.
Öffentlich heißt: Jeder kann den Code und die Wunschliste auf GitHub sehen. Bei einer Wunschliste,
die man ohnehin verschickt, ist das meist unproblematisch.

1. Die Änderungen in den Branch `main` übernehmen (Pull Request mergen).
2. **Settings → General →** ganz unten bei *Danger Zone* auf **Change visibility → Public**.
3. **Settings → Pages →** bei *Source* „Deploy from a branch“ wählen, Branch **`main`**, Ordner **`/ (root)`**, **Save**.
4. Ein bis zwei Minuten warten. Dann ist die Seite erreichbar unter
   **https://maximilianhankomh-netizen.github.io/Wunschliste/**

### Weg B: Netlify (Repository bleibt privat)

1. Auf [netlify.com](https://www.netlify.com) mit dem GitHub-Konto anmelden.
2. **Add new site → Import an existing project → GitHub →** Repository `Wunschliste` auswählen.
3. Branch `main`, *Build command* leer lassen, *Publish directory* `.` → **Deploy**.
4. Unter *Site configuration → Change site name* einen schönen Namen vergeben,
   z. B. `meine-wuensche` → `https://meine-wuensche.netlify.app`.
5. In `index.html` die beiden Adressen bei `og:url` und `og:image` auf die neue Adresse ändern
   (sonst fehlt das Vorschaubild in WhatsApp).

Bei beiden Wegen wird die Seite nach jeder Änderung an `main` automatisch neu veröffentlicht.

---

## Wünsche bearbeiten: die Admin-Seite

Unter **`…/Wunschliste/admin.html`** (also z. B.
https://maximilianhankomh-netizen.github.io/Wunschliste/admin.html) kannst du dich anmelden und
alles über Formulare bearbeiten:

- Wünsche anlegen, ändern, löschen und als „erfüllt“ markieren
- Bilder hochladen (werden automatisch verkleinert)
- Reihenfolge mit Pfeilen ändern
- Einstellungen: Überschrift, Begrüßung, Amazon-Wunschliste, Größen, Fußzeile

Jedes Speichern wird als ein Commit direkt im GitHub-Repository abgelegt (inklusive Bild). Nach
1 bis 2 Minuten ist die Änderung auf der Seite sichtbar. Da alles in der Git-Historie liegt, lässt
sich jede Änderung auf GitHub nachvollziehen und rückgängig machen.

Hinweis: GitHub Pages baut die Seite höchstens etwa 10-mal pro Stunde neu. Wenn du sehr viele
Änderungen hintereinander machst, kann es etwas länger dauern, bis alles online ist.

### Anmelden (einmal pro Gerät)

Statt eines Passworts benutzt die Admin-Seite einen **Admin-Schlüssel** von GitHub
(„Fine-grained personal access token“). Er darf nur die Dateien dieses einen Repositorys ändern.

Am einfachsten über den Link auf der Admin-Seite: Er öffnet das GitHub-Formular schon vorausgefüllt
(Name, Ablauf nach einem Jahr, Berechtigung *Contents: Read and write*). Von Hand geht es so:

1. Bei GitHub anmelden und
   [einen neuen Schlüssel erstellen](https://github.com/settings/personal-access-tokens/new)
   (*Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*).
2. Name, z. B. *Wunschliste Admin*. Ablaufdatum wählen, z. B. in einem Jahr.
3. *Repository access*: **Only select repositories** → `Wunschliste`. (Diesen Schritt füllt auch der
   Link nicht vor.)
4. *Permissions*: **Contents** hinzufügen → **Read and write**.
5. **Generate token**, den Schlüssel kopieren und auf der Admin-Seite einfügen.

Der Schlüssel wird nur im Browser dieses Geräts gespeichert und nur an GitHub geschickt. Auf dem
eigenen Gerät erscheint danach oben auf der Wunschliste ein Knopf **„Bearbeiten“**. Andere Besucher
sehen ihn nicht.

Wichtig:

- Den Schlüssel wie ein Passwort behandeln und niemandem schicken.
- Auf fremden Geräten beim Anmelden den Haken „angemeldet bleiben“ weglassen bzw. danach abmelden.
- Ist der Schlüssel abgelaufen, meldet die Admin-Seite das. Dann einfach einen neuen erstellen.
- Verloren oder in falsche Hände geraten? Bei GitHub unter *Fine-grained tokens* den Schlüssel löschen.

---

## Von Hand bearbeiten (ohne Admin-Seite)

### Neuen Wunsch hinzufügen

1. Auf GitHub die Datei **`wuensche.js`** öffnen und auf das **Stift-Symbol** („Edit this file“) klicken.
2. Einen vorhandenen Wunsch-Block kopieren: von `{` bis `},`.
3. Unter `wuensche: [` einfügen und die Werte anpassen. Nicht benötigte Felder einfach löschen.
4. **Commit changes** klicken. Nach ca. einer Minute ist der Wunsch online.

Ein vollständiger Wunsch sieht so aus:

```js
{
  titel: "Kopfhörer mit Noise Cancelling",
  beschreibung: "Over-Ear-Kopfhörer für Bahnfahrten.",
  kategorie: "Technik",
  prioritaet: 1,            // 1 = Herzenswunsch, 2 = würde mich freuen, 3 = Kleinigkeit
  preis: 299,               // ungefährer Preis in Euro, nur die Zahl
  details: {
    "Modell": "Sony WH-1000XM5",
    "Farbe": "Schwarz",
  },
  bild: "bilder/kopfhoerer.jpg",
  links: [
    { name: "Amazon", url: "https://www.amazon.de/dp/..." },
    { name: "Hersteller", url: "https://www.sony.de/..." },
  ],
  hinweis: "Refurbished ist auch okay!",
},
```

Nur `titel` ist Pflicht. Alle Felder sind oben in `wuensche.js` erklärt.

### Bild hinzufügen

1. Im Ordner [`bilder`](bilder) auf **Add file → Upload files** klicken und das Bild hochladen
   (Dateiname ohne Leerzeichen und Umlaute, z. B. `kopfhoerer.jpg`).
2. Beim Wunsch eintragen: `bild: "bilder/kopfhoerer.jpg",`

Ohne Bild zeigt die Karte automatisch den Anfangsbuchstaben des Wunsches.

### Wunsch wurde erfüllt

Beim Wunsch `erfuellt: true,` ergänzen. Er verschwindet dann aus der Liste und steht unten
unter „Schon erfüllt“. Oder den Block einfach löschen.

### Amazon-Wunschliste verknüpfen

1. Bei Amazon die Wunschliste öffnen → **Mehr → Liste verwalten** → Datenschutz auf **Geteilt** oder **Öffentlich**.
2. Den Link der Liste kopieren und in `wuensche.js` bei `amazonWunschliste: ""` zwischen die Anführungszeichen setzen.

Dann erscheint oben auf der Seite der Knopf „Zur Amazon-Wunschliste“. Tipp: In der Amazon-Liste
eine Geschenk-Lieferadresse hinterlegen. Dann können andere direkt an dich liefern lassen.

### Wenn die Seite eine Fehlermeldung zeigt

Dann hat sich in `wuensche.js` ein Tippfehler eingeschlichen. Die Meldung nennt die Zeilennummer.
Fast immer fehlt dort oder eine Zeile davor ein **Komma** oder ein **Anführungszeichen**.

---

## Lokal ansehen

`index.html` per Doppelklick im Browser öffnen. Die Seite funktioniert auch ohne Internet.

## Dateien

| Datei | Inhalt |
|---|---|
| `wuensche.js` | **Alle Inhalte**: Wünsche, Begrüßungstext, Größen, Amazon-Link |
| `index.html` | Seitengerüst und Link-Vorschau (Titel/Bild beim Teilen) |
| `style.css` | Design |
| `app.js` | Baut die Seite aus `wuensche.js` (muss normalerweise nicht geändert werden) |
| `admin.html`, `admin.js`, `admin.css` | Admin-Seite zum Bearbeiten. Repository und Branch stehen oben in `admin.js` |
| `bilder/` | Produktbilder |
| `vorschau.png` | Vorschaubild beim Teilen in WhatsApp & Co. |
| `schriften/` | Schriftarten (lokal, keine Verbindung zu Google Fonts nötig) |
| `PLAN.md` | Ursprünglicher Plan und Ideen für später |
