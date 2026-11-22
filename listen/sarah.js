// =====================================================================
//  MEINE WUNSCHLISTE
//  In dieser Datei stehen alle Inhalte der Seite.
//
//  Am einfachsten bearbeitest du sie über die Admin-Seite (admin.html).
//  Von Hand geht es aber auch:
//    - Texte stehen zwischen "geraden Anführungszeichen".
//    - Nach jedem Eintrag steht ein Komma.
//    - Zeigt die Seite danach eine Fehlermeldung, fehlt meistens ein Komma
//      oder ein Anführungszeichen in der zuletzt geänderten Zeile.
//
//  Felder eines Wunsches:
//    id            Kurzname für Direktlinks (…/#kopfhoerer). Nicht ändern, sonst
//                  funktionieren bereits verschickte Direktlinks nicht mehr.
//    titel         Name des Wunsches (Pflicht)
//    beschreibung  Kurz: was genau und warum
//    kategorie     z. B. "Technik", "Bücher", "Kleidung", "Erlebnisse"
//    prioritaet    1 = Herzenswunsch, 2 = würde mich freuen, 3 = Kleinigkeit
//    preis         Ungefährer Preis in Euro, nur die Zahl (z. B. 24.99)
//    anzahl        Wie oft du dir das wünschst (z. B. 4). Fehlt es, gilt 1.
//    details       Zusatzinfos wie Größe, Farbe, Modell, ISBN …
//    bild          Pfad zu einem Bild, z. B. "bilder/jacke.jpg"
//    links         Ein oder mehrere Links zu Shops: { "name": …, "url": … }
//    hinweis       Persönliche Notiz, erscheint in Handschrift
//    erfuellt      true = schon geschenkt bekommen
// =====================================================================

window.WUNSCHLISTE = {
  "einstellungen": {
    "name": "Sarah",
    "titel": "Sarahs Wunschliste",
    "einleitung": "Schön, dass du vorbeischaust! Hier steht alles, worüber ich mich gerade freuen würde. Die Preise sind ungefähre Richtwerte. Wenn du unsicher bist, frag mich einfach.",
    "amazonWunschliste": "",
    "groessen": {},
    "fusszeile": "",
  },
  "wuensche": [],
};
