// Baut die Seite aus den Daten in wuensche.js.
// Hier musst du normalerweise nichts ändern: Inhalte pflegst du in wuensche.js.
(function () {
  "use strict";

  const PRIORITAETEN = {
    1: "Herzenswunsch",
    2: "Würde mich freuen",
    3: "Kleinigkeit",
  };

  const PREISBEREICHE = {
    "0-25": [0, 25],
    "25-75": [25, 75],
    "75-150": [75, 150],
    "150-": [150, Infinity],
  };

  const $ = (id) => document.getElementById(id);

  const zustand = {
    kategorie: "alle",
    preis: "alle",
    sortierung: "prioritaet",
  };

  // ---------- Hilfsfunktionen ----------

  function el(tag, klasse, text) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }

  function kurzname(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function alsZahl(wert) {
    if (typeof wert === "number" && isFinite(wert)) return wert;
    if (typeof wert === "string" && wert.trim() !== "") {
      const z = parseFloat(wert.replace(/[^\d,.-]/g, "").replace(",", "."));
      if (isFinite(z)) return z;
    }
    return null;
  }

  function euro(betrag) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: Number.isInteger(betrag) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(betrag);
  }

  function istWebLink(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url.trim());
  }

  function istAmazon(link) {
    return /amazon\.|amzn\./i.test(link.url) || /amazon/i.test(link.name || "");
  }

  function linkZuWunsch(id) {
    return location.href.split("#")[0] + "#" + id;
  }

  let toastTimer;
  function zeigeToast(text) {
    const t = $("hinweis-toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  function zeigeFehler(titel, text) {
    const box = $("fehler");
    box.replaceChildren(el("strong", "", titel), el("span", "", text));
    box.hidden = false;
  }

  // ---------- Daten prüfen und vorbereiten ----------

  const daten = window.WUNSCHLISTE;

  if (!daten || !Array.isArray(daten.wuensche)) {
    const fehler = (window.WL_FEHLER || []).find((e) => /wuensche\.js/.test(e.filename || ""));
    zeigeFehler(
      "Die Wünsche konnten nicht geladen werden.",
      fehler && fehler.lineno
        ? `In der Datei wuensche.js ist in oder kurz vor Zeile ${fehler.lineno} ein Tippfehler. ` +
            "Meistens fehlt ein Komma oder ein Anführungszeichen."
        : "Wahrscheinlich ist in der Datei wuensche.js ein Tippfehler. " +
            "Meistens fehlt ein Komma oder ein Anführungszeichen in der zuletzt geänderten Zeile."
    );
    $("anzahl").hidden = true;
    return;
  }

  const einstellungen = daten.einstellungen || {};
  const vergebeneIds = new Set();

  const alle = daten.wuensche
    .filter((w) => w && w.titel)
    .map((w, index) => {
      let id = kurzname(w.id || w.titel) || "wunsch-" + (index + 1);
      let basis = id;
      for (let n = 2; vergebeneIds.has(id); n++) id = basis + "-" + n;
      vergebeneIds.add(id);

      const prio = [1, 2, 3].includes(Number(w.prioritaet)) ? Number(w.prioritaet) : 2;
      const links = (Array.isArray(w.links) ? w.links : [])
        .filter((l) => l && istWebLink(l.url))
        .map((l) => ({ name: l.name || "Zum Shop", url: l.url.trim() }));

      return {
        id,
        index,
        titel: String(w.titel),
        beschreibung: w.beschreibung || "",
        kategorie: w.kategorie ? String(w.kategorie) : "",
        prioritaet: prio,
        preis: alsZahl(w.preis),
        details: w.details && typeof w.details === "object" ? w.details : {},
        bild: w.bild || "",
        links,
        hinweis: w.hinweis || "",
        erfuellt: w.erfuellt === true,
      };
    });

  const offen = alle.filter((w) => !w.erfuellt);
  const erfuellt = alle.filter((w) => w.erfuellt);

  // ---------- Kopf und Fuß ----------

  function baueRahmen() {
    if (einstellungen.titel) {
      $("titel").textContent = einstellungen.titel;
      document.title = einstellungen.titel;
    }

    $("einleitung").textContent = einstellungen.einleitung || "";
    $("einleitung").hidden = !einstellungen.einleitung;

    const stand = new Date(document.lastModified);
    if (!isNaN(stand)) {
      const label = document.querySelector(".kopf-label");
      label.textContent =
        "Stand: " + stand.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
    }

    if (istWebLink(einstellungen.amazonWunschliste)) {
      $("amazon-link").href = einstellungen.amazonWunschliste.trim();
      $("amazon-box").hidden = false;
    }

    const groessen = einstellungen.groessen || {};
    const eintraege = Object.entries(groessen).filter(([, wert]) => wert);
    if (eintraege.length) {
      const dl = $("groessen");
      for (const [name, wert] of eintraege) {
        const paar = el("div");
        paar.append(el("dt", "", name), el("dd", "", wert));
        dl.append(paar);
      }
      $("groessen-box").hidden = false;
    }

    $("fusszeile").textContent = einstellungen.fusszeile || "";
    $("fusszeile").hidden = !einstellungen.fusszeile;
  }

  // ---------- Kategorien ----------

  function baueKategorien() {
    const zaehler = new Map();
    for (const w of offen) {
      if (w.kategorie) zaehler.set(w.kategorie, (zaehler.get(w.kategorie) || 0) + 1);
    }
    const box = $("kategorien");
    // Bei nur einer Kategorie bringen Filterknöpfe nichts.
    if (zaehler.size < 2) {
      box.hidden = true;
      return;
    }

    const knoepfe = [["alle", "Alle", offen.length], ...[...zaehler].map(([k, n]) => [k, k, n])];
    for (const [wert, name, anzahl] of knoepfe) {
      const b = el("button", "chip");
      b.type = "button";
      b.dataset.kategorie = wert;
      b.append(document.createTextNode(name), el("span", "chip-zahl", anzahl));
      b.addEventListener("click", () => {
        zustand.kategorie = wert;
        zeigeListe();
      });
      box.append(b);
    }
  }

  // ---------- Wunschkarten ----------

  const LINK_SYMBOL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

  function platzhalter(bildBox, w) {
    bildBox.classList.add("ohne-bild");
    const m = el("span", "monogramm", w.titel.trim().charAt(0).toUpperCase());
    m.setAttribute("aria-hidden", "true");
    bildBox.prepend(m);
  }

  function baueKarte(w) {
    const karte = el("article", "wunsch");
    karte.id = w.id;

    // Bild oder Platzhalter
    const bildBox = el("div", "wunsch-bild");
    if (w.bild) {
      const img = el("img");
      img.src = w.bild;
      img.alt = w.titel;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        img.remove();
        platzhalter(bildBox, w);
      });
      bildBox.append(img);
    } else {
      platzhalter(bildBox, w);
    }

    if (w.preis !== null) {
      const tag = el("p", "preis-tag", "ca. " + euro(w.preis));
      bildBox.append(tag);
    }

    const kopieren = el("button", "link-kopieren");
    kopieren.type = "button";
    kopieren.title = "Link zu diesem Wunsch kopieren";
    kopieren.setAttribute("aria-label", "Link zu „" + w.titel + "“ kopieren");
    kopieren.innerHTML = LINK_SYMBOL;
    kopieren.addEventListener("click", () => kopiereLink(w.id));
    bildBox.append(kopieren);

    // Inhalt
    const inhalt = el("div", "wunsch-inhalt");

    const meta = el("div", "wunsch-meta");
    meta.append(el("span", "prio prio-" + w.prioritaet, PRIORITAETEN[w.prioritaet]));
    if (w.kategorie) meta.append(el("span", "kategorie", w.kategorie));
    inhalt.append(meta);

    inhalt.append(el("h2", "wunsch-titel", w.titel));

    if (w.beschreibung) inhalt.append(el("p", "beschreibung", w.beschreibung));

    const details = Object.entries(w.details).filter(([, wert]) => wert !== "" && wert !== null);
    if (details.length) {
      const dl = el("dl", "details");
      for (const [name, wert] of details) dl.append(el("dt", "", name), el("dd", "", wert));
      inhalt.append(dl);
    }

    if (w.hinweis) inhalt.append(el("p", "notiz", w.hinweis));

    if (w.links.length) {
      const linkBox = el("div", "wunsch-links");
      const hauptlink = w.links.find(istAmazon) || w.links[0];
      for (const link of w.links) {
        const a = el("a", "knopf " + (link === hauptlink ? "knopf-voll" : "knopf-rahmen"));
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener";
        const pfeil = el("span", "", "↗");
        pfeil.setAttribute("aria-hidden", "true");
        a.append(document.createTextNode(link.name + " "), pfeil, el("span", "sr-only", "(öffnet in neuem Tab)"));
        linkBox.append(a);
      }
      inhalt.append(linkBox);
    }

    karte.append(bildBox, inhalt);
    return karte;
  }

  function kopiereLink(id) {
    const url = linkZuWunsch(id);
    const fallback = () => {
      history.replaceState(null, "", "#" + id);
      zeigeToast("Der Link steht jetzt in der Adresszeile.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => zeigeToast("Link kopiert"), fallback);
    } else {
      fallback();
    }
  }

  // ---------- Filtern, sortieren, anzeigen ----------

  function passtZumPreis(w) {
    const bereich = PREISBEREICHE[zustand.preis];
    // Wünsche ohne Preis (z. B. Gutscheine) passen in jeden Preisbereich.
    if (!bereich || w.preis === null) return true;
    const [von, bis] = bereich;
    // Grenzen: „bis 25 €“ enthält 25 €, „25 bis 75 €“ beginnt danach.
    return (von === 0 ? w.preis >= 0 : w.preis > von) && w.preis <= bis;
  }

  function vergleiche(a, b) {
    const preisA = a.preis === null ? Infinity : a.preis;
    const preisB = b.preis === null ? Infinity : b.preis;
    if (zustand.sortierung === "preis-auf") return preisA - preisB || a.index - b.index;
    if (zustand.sortierung === "preis-ab") {
      if (a.preis === null || b.preis === null) return preisA - preisB || a.index - b.index;
      return b.preis - a.preis || a.index - b.index;
    }
    return a.prioritaet - b.prioritaet || a.index - b.index;
  }

  function zeigeListe() {
    const sichtbar = offen
      .filter((w) => zustand.kategorie === "alle" || w.kategorie === zustand.kategorie)
      .filter(passtZumPreis)
      .sort(vergleiche);

    const liste = $("liste");
    liste.replaceChildren(...sichtbar.map(baueKarte));

    for (const chip of $("kategorien").querySelectorAll(".chip")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.kategorie === zustand.kategorie));
    }

    const gefiltert = sichtbar.length !== offen.length;
    $("anzahl").textContent = gefiltert
      ? `${sichtbar.length} von ${offen.length} Wünschen`
      : offen.length === 1
        ? "1 Wunsch"
        : `${offen.length} Wünsche`;

    $("leer").hidden = sichtbar.length > 0 || offen.length === 0;
  }

  function baueErfuellt() {
    if (!erfuellt.length) return;
    $("erfuellt-anzahl").textContent = "(" + erfuellt.length + ")";
    $("erfuellt-liste").replaceChildren(...erfuellt.map((w) => el("li", "", w.titel)));
    $("erfuellt").hidden = false;
  }

  function filterZuruecksetzen() {
    zustand.kategorie = "alle";
    zustand.preis = "alle";
    $("preis-filter").value = "alle";
    zeigeListe();
  }

  // Direktlink …/#kurzname: zur Karte springen und kurz hervorheben.
  function springeZumWunsch() {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch (e) {
      return;
    }
    if (!id) return;
    const w = offen.find((x) => x.id === id);
    if (!w) return;
    if (!document.getElementById(id)) filterZuruecksetzen();
    const karte = document.getElementById(id);
    if (!karte) return;
    karte.scrollIntoView({ block: "start" });
    karte.classList.remove("hervorgehoben");
    void karte.offsetWidth;
    karte.classList.add("hervorgehoben");
    setTimeout(() => karte.classList.remove("hervorgehoben"), 3000);
  }

  // ---------- Start ----------

  $("preis-filter").addEventListener("change", (e) => {
    zustand.preis = e.target.value;
    zeigeListe();
  });
  $("sortierung").addEventListener("change", (e) => {
    zustand.sortierung = e.target.value;
    zeigeListe();
  });
  $("zuruecksetzen").addEventListener("click", filterZuruecksetzen);
  window.addEventListener("hashchange", springeZumWunsch);

  // Beim Neuladen gemerkte Auswahl der Felder übernehmen
  zustand.preis = $("preis-filter").value;
  zustand.sortierung = $("sortierung").value;

  baueRahmen();
  baueKategorien();
  zeigeListe();
  baueErfuellt();

  if (!offen.length) {
    $("anzahl").textContent = "Gerade ist die Liste leer. Schau bald wieder vorbei!";
  }

  springeZumWunsch();
})();
