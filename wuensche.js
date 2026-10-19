// =====================================================================
//  MEINE WUNSCHLISTE
//  In dieser Datei stehen alle Inhalte der Seite. Nur hier musst du
//  etwas ändern, wenn du Wünsche hinzufügen, ändern oder löschen willst.
// =====================================================================
//
//  So fügst du einen neuen Wunsch hinzu:
//    1. Kopiere einen kompletten Wunsch-Block: von der Zeile mit  {
//       bis zur Zeile mit  },  (das Komma gehört dazu).
//    2. Füge ihn in der Liste "wuensche" ein (z. B. direkt unter "wuensche: [").
//    3. Ändere die Werte. Felder, die du nicht brauchst, löschst du einfach.
//
//  Damit nichts kaputtgeht:
//    - Texte stehen immer zwischen "geraden Anführungszeichen".
//    - Brauchst du im Text selbst Anführungszeichen, nimm „deutsche“.
//    - Nach jedem Eintrag steht ein Komma.
//    - Zeilen, die mit // beginnen, sind Kommentare und werden ignoriert.
//    - Zeigt die Seite eine Fehlermeldung, fehlt meistens ein Komma oder
//      ein Anführungszeichen in der Zeile, die du zuletzt geändert hast.
//
//  Alle Felder eines Wunsches:
//    titel         Name des Wunsches (Pflicht)
//    beschreibung  Kurz: was genau und warum
//    kategorie     z. B. "Technik", "Bücher", "Kleidung", "Erlebnisse"
//    prioritaet    1 = Herzenswunsch, 2 = würde mich freuen, 3 = Kleinigkeit
//    preis         Ungefährer Preis in Euro, nur die Zahl (z. B. 24.99)
//    anzahl        Wie oft du dir das wünschst (z. B. 4). Fehlt es, gilt 1.
//    details       Zusatzinfos wie Größe, Farbe, Modell, ISBN …
//    bild          Pfad zu einem Bild im Ordner "bilder", z. B. "bilder/jacke.jpg"
//    links         Ein oder mehrere Links zu Shops (Amazon, Hersteller …)
//    hinweis       Persönliche Notiz, z. B. „Gebraucht ist auch okay“
//    erfuellt      true = schon geschenkt bekommen (rutscht nach unten)
//    id            Optional: Kurzname für Direktlinks (…/#kopfhoerer).
//                  Fehlt er, wird er automatisch aus dem Titel gebildet.
//
// Beispiel Wunschblock:
/*
{
      titel: "Kopfhörer mit Noise Cancelling",
      beschreibung: "Over-Ear-Kopfhörer für Bahnfahrten und konzentriertes Arbeiten.",
      kategorie: "Technik",
      prioritaet: 1,
      preis: 299,
      details: {
        "Modell": "Sony WH-1000XM5",
        "Farbe": "Schwarz oder Silber",
      },
      links: [
        { name: "Amazon", url: "https://www.amazon.de/s?k=Sony+WH-1000XM5" },
        { name: "Hersteller", url: "https://www.sony.de/" },
      ],
      hinweis: "Refurbished oder B-Ware ist völlig okay!",
    },
  */
// =====================================================================

window.WUNSCHLISTE = {
  "einstellungen": {
    "titel": "Meine Wunschliste",
    "einleitung": "Schön, dass du vorbeischaust! Hier steht alles, worüber ich mich gerade freuen würde. Die Preise sind ungefähre Richtwerte. Wenn du unsicher bist, frag mich einfach.",
    "amazonWunschliste": "https://www.amazon.de/hz/wishlist/ls/2LDERB4L73188?ref_=wl_share",
    "groessen": {},
    "fusszeile": "Gutscheine oder ein Zuschuss für einen größeren Wunsch sind genauso willkommen. Und am meisten freue ich mich sowieso über gemeinsame Zeit.",
  },
  "wuensche": [
    {
      "id": "kajplats-led-leuchtmittel-gu10-575-lm",
      "titel": "KAJPLATS LED-Leuchtmittel GU10 575 lm",
      "kategorie": "Smart Home",
      "prioritaet": 2,
      "preis": 6.99,
      "anzahl": 6,
      "details": {
        "Helligkeit": "575 lm !!!",
      },
      "bild": "https://www.ikea.com/de/de/images/products/kajplats-led-leuchtmittel-gu10-575-lm-smart-weissspektrum__1452573_pe991092_s5.jpg?f=xl",
      "links": [
        {
          "name": "IKEA",
          "url": "https://www.ikea.com/de/de/p/kajplats-led-leuchtmittel-gu10-575-lm-smart-weissspektrum-50611442/",
        },
      ],
    },
    {
      "id": "kajplats-led-leuchtmittel-e27-1521-lm",
      "titel": "KAJPLATS LED-Leuchtmittel E27 1521 lm",
      "kategorie": "Smart Home",
      "prioritaet": 2,
      "preis": 9.99,
      "anzahl": 4,
      "details": {
        "Helligkeit": "1521 lm !!!",
      },
      "bild": "https://www.ikea.com/de/de/images/products/kajplats-led-leuchtmittel-e27-1521-lm-smart-weissspektrum-rund-opalweiss__1452572_pe991091_s5.jpg?f=xl",
      "links": [
        {
          "name": "IKEA",
          "url": "https://www.ikea.com/de/de/p/kajplats-led-leuchtmittel-e27-1521-lm-smart-weissspektrum-rund-opalweiss-10611302/",
        },
      ],
    },
    {
      "id": "biqu-panda-claw-extruder-zahnradsatz-fuer-bambu-x1-p1-a1-serie",
      "titel": "BIQU Panda Claw Extruder-Zahnradsatz für Bambu X1/P1/A1 Serie",
      "beschreibung": "ein hochwertiges Extruder-Zahnrad-Upgrade, das speziell für Bambu Lab-Drucker entwickelt wurde",
      "kategorie": "Technik",
      "prioritaet": 2,
      "preis": 24.95,
      "details": {
        "Für A1 Serie": "A1",
      },
      "bild": "https://biqu.equipment/cdn/shop/files/1-1_6819309d-d2d6-45f9-b9ea-5472699dbb9a.png?v=1757556816&width=610",
      "links": [
        {
          "name": "BIQU",
          "url": "https://biqu.equipment/de/products/biqu-panda-claw-extruder-gear?variant=41425356750946",
        },
      ],
    },
  ],
};
