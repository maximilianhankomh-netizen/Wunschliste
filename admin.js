// Admin-Seite: Wünsche über eine Oberfläche anlegen, bearbeiten und löschen.
// Änderungen werden direkt im GitHub-Repository gespeichert (über die GitHub-API).
// GitHub Pages veröffentlicht sie danach automatisch.
(function () {
  "use strict";

  // ---------- Einstellungen ----------
  // Nur ändern, wenn das Repository umbenannt oder verschoben wird.
  const KONFIG = {
    besitzer: "maximilianhankomh-netizen",
    repo: "Wunschliste",
    branch: "main",
    datei: "wuensche.js",
    bilderOrdner: "bilder",
  };

  const SPEICHER_SCHLUESSEL = "wunschliste-admin";
  const API = "https://api.github.com";
  const MAX_BILD_KANTE = 1200;
  const BEKANNTE_FELDER = new Set([
    "id", "titel", "beschreibung", "kategorie", "prioritaet", "preis", "anzahl",
    "details", "bild", "links", "hinweis", "erfuellt",
  ]);

  const DATEI_KOPF = `// =====================================================================
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

`;

  const PRIORITAETEN = { 1: "Herzenswunsch", 2: "Würde mich freuen", 3: "Kleinigkeit" };

  // ---------- Zustand ----------
  let token = null;
  let daten = null; // { einstellungen: {}, wuensche: [] }
  let dateiSha = null;
  let zuletztGeschrieben = null; // Dateitext, wie er zuletzt bei GitHub lag
  let dateiKopf = null; // Kommentare vor „window.WUNSCHLISTE“, bleiben beim Speichern erhalten
  let bearbeiteId = null; // id des Wunsches im Editor, null = neuer Wunsch
  let editorBild = null; // null | { art: "pfad", wert } | { art: "neu", blob, url }
  let editorStart = null; // Formularstand beim Öffnen, für „ungespeicherte Änderungen“
  let speichertGerade = false;
  let reihenfolgeTimer = null;
  let warteschlange = Promise.resolve();
  let offeneSchreibvorgaenge = 0;
  let bildVorbereitung = null; // läuft gerade die Verkleinerung eines ausgewählten Fotos?
  let editorSitzung = 0; // zählt jedes Öffnen/Schließen des Editors
  let zurueckNachLogin = null; // nach abgelaufenem Schlüssel: wohin nach dem Anmelden
  let fehlerZaehler = 0;
  const frischeBilder = new Map(); // gerade hochgeladene Bilder (noch nicht veröffentlicht)

  const $ = (id) => document.getElementById(id);

  function el(tag, klasse, text) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }

  function knopf(text, klasse, beiKlick) {
    const b = el("button", klasse, text);
    b.type = "button";
    if (beiKlick) b.addEventListener("click", beiKlick);
    return b;
  }

  function klon(objekt) {
    return JSON.parse(JSON.stringify(objekt));
  }

  // Gleiche Regel wie in app.js, damit Direktlinks gleich bleiben.
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

  // Gleiche Regel wie in app.js: ganze Zahl ab 1, alles andere zählt als 1.
  function ganzeAnzahl(wert) {
    const n = Number(wert);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, 999) : 1;
  }

  function euro(betrag) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: Number.isInteger(betrag) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(betrag);
  }

  // ---------- Anmeldung speichern ----------

  function ladeToken() {
    try {
      return localStorage.getItem(SPEICHER_SCHLUESSEL) || sessionStorage.getItem(SPEICHER_SCHLUESSEL);
    } catch (e) {
      return null;
    }
  }

  function speichereToken(wert, merken) {
    try {
      (merken ? localStorage : sessionStorage).setItem(SPEICHER_SCHLUESSEL, wert);
    } catch (e) {
      // Ohne Speicher bleibt die Anmeldung nur bis zum Neuladen bestehen.
    }
  }

  function loescheToken() {
    try {
      localStorage.removeItem(SPEICHER_SCHLUESSEL);
      sessionStorage.removeItem(SPEICHER_SCHLUESSEL);
    } catch (e) {
      // nichts zu tun
    }
  }

  // ---------- Anzeige ----------

  const ANSICHTEN = ["login", "laden", "liste", "editor"];
  let aktuelleAnsicht = null;

  function zeige(name) {
    for (const a of ANSICHTEN) $("ansicht-" + a).hidden = a !== name;
    $("abmelden").hidden = !token || name === "login";
    if (aktuelleAnsicht !== name) window.scrollTo(0, 0);
    aktuelleAnsicht = name;
  }

  function meldung(text, optionen) {
    const { art = "fehler", aktionen = [] } = optionen || {};
    const box = $("meldung");
    box.classList.toggle("ok", art === "ok");
    box.setAttribute("role", art === "ok" ? "status" : "alert");
    $("meldung-text").textContent = text;
    $("meldung-aktionen").replaceChildren(
      ...aktionen.map(([beschriftung, aktion, klasse, behalten]) =>
        knopf(beschriftung, "knopf knopf-klein " + (klasse || "knopf-rahmen"), () => {
          if (!behalten) meldungWeg();
          aktion();
        })
      )
    );
    box.hidden = false;
    box.scrollIntoView({ block: "nearest" });
  }

  function meldungWeg() {
    $("meldung").hidden = true;
  }

  let toastTimer;
  function toast(text, dauer) {
    const t = $("hinweis-toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    if (dauer !== 0) toastTimer = setTimeout(() => (t.hidden = true), dauer || 3500);
  }

  function setzeBeschaeftigt(an, text) {
    speichertGerade = an;
    // Während des Speicherns nichts ändern lassen, sonst gingen Eingaben unbemerkt verloren.
    for (const form of [$("editor-form"), $("einstellungen-form")]) {
      for (const feld of form.elements) feld.disabled = an;
    }
    $("neu").disabled = an;
    if (an) toast(text || "Speichere …", 0);
  }

  // Fehler direkt am Feld anzeigen (auf dem Handy wäre eine Meldung oben nicht zu sehen).
  function entferneFeldfehler(form) {
    for (const f of form.querySelectorAll("[aria-invalid]")) {
      f.removeAttribute("aria-invalid");
      f.removeAttribute("aria-describedby");
    }
    for (const h of form.querySelectorAll(".feld-fehler")) h.remove();
  }

  function zeigeFeldfehler(form, fehler) {
    entferneFeldfehler(form);
    const erledigt = new Set();
    for (const [feld, text] of fehler) {
      feld.setAttribute("aria-invalid", "true");
      if (erledigt.has(feld)) continue;
      erledigt.add(feld);
      const hinweis = el("small", "feld-fehler", text);
      hinweis.id = "feld-fehler-" + ++fehlerZaehler;
      feld.setAttribute("aria-describedby", hinweis.id);
      (feld.closest(".zeile") || feld.closest(".eingabe") || feld).after(hinweis);
    }
    fehler[0][0].focus();
    toast("Bitte prüfe die rot markierten Felder.");
  }

  // ---------- GitHub-API ----------

  class GitHubFehler extends Error {
    constructor(status, nachricht, headers) {
      super(nachricht || "GitHub-Fehler " + status);
      this.status = status;
      this.headers = headers || null;
    }
  }

  class DateiFehler extends Error {}

  async function gh(pfad, optionen) {
    const { methode = "GET", body } = optionen || {};
    if (!token) throw new GitHubFehler(-1, "Abgemeldet");
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
    };
    if (body) headers["Content-Type"] = "application/json";
    let antwort;
    try {
      antwort = await fetch(API + pfad, {
        method: methode,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    } catch (e) {
      throw new GitHubFehler(0, "Netzwerkfehler");
    }
    if (antwort.status === 204) return null;
    const json = await antwort.json().catch(() => null);
    if (!antwort.ok) throw new GitHubFehler(antwort.status, json && json.message, antwort.headers);
    return json;
  }

  function inhaltPfad(dateipfad) {
    return (
      "/repos/" + encodeURIComponent(KONFIG.besitzer) + "/" + encodeURIComponent(KONFIG.repo) +
      "/contents/" + dateipfad.split("/").map(encodeURIComponent).join("/")
    );
  }

  function base64ZuUtf8(b64) {
    const binaer = atob(String(b64).replace(/\s/g, ""));
    const bytes = new Uint8Array(binaer.length);
    for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function blobZuBase64(blob) {
    return new Promise((ok, fehler) => {
      const leser = new FileReader();
      leser.onload = () => ok(String(leser.result).split(",")[1]);
      leser.onerror = () => fehler(leser.error);
      leser.readAsDataURL(blob);
    });
  }

  function istKonflikt(f) {
    return f instanceof GitHubFehler && (f.status === 409 || (f.status === 422 && /sha/i.test(f.message)));
  }

  function fehlerText(f) {
    if (f instanceof DateiFehler) return f.message;
    if (!(f instanceof GitHubFehler)) return "Unerwarteter Fehler: " + ((f && f.message) || f);
    const repo = KONFIG.besitzer + "/" + KONFIG.repo;
    if (f.status === 0) return "Keine Verbindung zu GitHub. Bist du online?";
    if (f.status === 401) return "Der Admin-Schlüssel ist ungültig oder abgelaufen. Bitte melde dich neu an.";
    if (f.status === 403 || f.status === 429) {
      const rest = f.headers && f.headers.get("x-ratelimit-remaining");
      if (f.status === 429 || rest === "0" || /rate limit/i.test(f.message)) {
        return "GitHub bremst gerade, weil zu viele Anfragen kamen. Warte ein paar Minuten und versuche es dann noch einmal.";
      }
      return (
        "Der Admin-Schlüssel darf die Wunschliste nicht ändern. Prüfe bei GitHub beim Schlüssel: " +
        "„Repository access“ → „Only select repositories“ → „" + KONFIG.repo + "“ und bei „Permissions“ → " +
        "„Contents“ → „Read and write“."
      );
    }
    if (f.status === 404) {
      return (
        "Nicht gefunden. Entweder hat der Admin-Schlüssel keinen Zugriff auf das Repository „" + repo +
        "“, oder die Datei " + KONFIG.datei + " liegt noch nicht im Branch „" + KONFIG.branch + "“."
      );
    }
    if (istKonflikt(f)) {
      return "Die Wunschliste wurde inzwischen woanders geändert, zum Beispiel auf einem anderen Gerät.";
    }
    return "GitHub meldet einen Fehler (" + f.status + "): " + f.message;
  }

  function behandleFehler(f) {
    if (f instanceof GitHubFehler && f.status === -1) return; // nach dem Abmelden: nichts mehr melden
    if (f instanceof GitHubFehler && f.status === 401) {
      // Schlüssel abgelaufen: neu anmelden lassen, aber Eingaben im Editor behalten.
      const imEditor = aktuelleAnsicht === "editor" && editorStart !== null;
      zurueckNachLogin = imEditor ? "editor" : null;
      loescheToken();
      token = null;
      zeige("login");
      meldung(
        fehlerText(f) +
          (imEditor ? " Deine Eingaben bleiben erhalten. Nach dem Anmelden kannst du noch einmal speichern." : "")
      );
      return;
    }
    if (istKonflikt(f)) {
      meldung(
        fehlerText(f) +
          " Lade die aktuelle Fassung und speichere dann noch einmal. Was du gerade eingegeben hast, bleibt erhalten.",
        { aktionen: [["Aktuelle Fassung laden", () => neuLaden(), "knopf-voll"]] }
      );
      return;
    }
    if (f instanceof DateiFehler) {
      const ziel =
        "https://github.com/" + KONFIG.besitzer + "/" + KONFIG.repo + "/edit/" + KONFIG.branch + "/" + KONFIG.datei;
      meldung(
        fehlerText(f) + " Bitte korrigiere das direkt auf GitHub. Danach funktioniert auch die Admin-Seite wieder.",
        {
          aktionen: [
            ["Datei auf GitHub öffnen", () => window.open(ziel, "_blank", "noopener"), "knopf-voll", true],
            ["Noch einmal laden", starteMitToken],
          ],
        }
      );
      return;
    }
    meldung(fehlerText(f));
  }

  // ---------- Datei lesen und schreiben ----------

  // Liest wuensche.js, ohne sie als Programm auszuführen (die Admin-Seite erlaubt aus
  // Sicherheitsgründen kein eval). Versteht alles, was in dieser Datei üblich ist: Kommentare,
  // Objekte, Listen, Texte in "…", '…' und `…`, mit + verbundene Texte, Zahlen, true/false/null,
  // Feldnamen ohne Anführungszeichen und Kommas vor schließenden Klammern.
  function parseWunschliste(text) {
    let i = 0;
    const n = text.length;

    function fehler(was, stelle) {
      const zeile = text.slice(0, stelle === undefined ? i : stelle).split("\n").length;
      const e = new DateiFehler("In " + KONFIG.datei + " ist in Zeile " + zeile + " ein Tippfehler: " + was + ".");
      e.zeile = zeile;
      throw e;
    }

    function leer() {
      for (;;) {
        const c = text[i];
        if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "﻿" || c === " ") {
          i++;
        } else if (c === "/" && text[i + 1] === "/") {
          const ende = text.indexOf("\n", i);
          i = ende < 0 ? n : ende + 1;
        } else if (c === "/" && text[i + 1] === "*") {
          const ende = text.indexOf("*/", i + 2);
          if (ende < 0) fehler("ein Kommentar mit /* wird nirgends mit */ geschlossen");
          i = ende + 2;
        } else {
          return;
        }
      }
    }

    function einText() {
      const start = i;
      const q = text[i++];
      let s = "";
      for (;;) {
        if (i >= n) fehler("ein Text wird nicht mit " + q + " geschlossen", start);
        const c = text[i++];
        if (c === q) return s;
        if ((c === "\n" || c === "\r") && q !== "`") fehler("ein Text wird nicht mit " + q + " geschlossen", start);
        if (q === "`" && c === "$" && text[i] === "{") fehler("${…} ist in dieser Datei nicht möglich", i - 1);
        if (c !== "\\") {
          s += c;
          continue;
        }
        const e = text[i++];
        if (e === "n") s += "\n";
        else if (e === "t") s += "\t";
        else if (e === "r") s += "\r";
        else if (e === "b") s += "\b";
        else if (e === "f") s += "\f";
        else if (e === "v") s += "\v";
        else if (e === "0" && !/[0-9]/.test(text[i] || "")) s += "\0";
        else if (e === "u" || e === "x") {
          let hex;
          if (e === "u" && text[i] === "{") {
            const ende = text.indexOf("}", i);
            hex = ende < 0 ? "" : text.slice(i + 1, ende);
            i = ende + 1;
          } else {
            hex = text.slice(i, i + (e === "u" ? 4 : 2));
            i += hex.length;
          }
          if (!/^[0-9a-fA-F]+$/.test(hex) || (e === "x" && hex.length !== 2) || (e === "u" && hex.length < 1)) {
            fehler("ungültige Zeichenangabe \\" + e, i - 1);
          }
          s += String.fromCodePoint(parseInt(hex, 16));
        } else if (e === "\r") {
          if (text[i] === "\n") i++; // Zeilenfortsetzung
        } else if (e !== "\n") {
          s += e;
        }
      }
    }

    function texte() {
      let s = einText();
      for (;;) {
        const merk = i;
        leer();
        if (text[i] !== "+") {
          i = merk;
          return s;
        }
        i++;
        leer();
        if (text[i] !== '"' && text[i] !== "'" && text[i] !== "`") fehler("nach + muss ein Text in Anführungszeichen folgen");
        s += einText();
      }
    }

    function zahl() {
      const m = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?/.exec(text.slice(i, i + 40));
      if (!m) fehler("ungültige Zahl");
      i += m[0].length;
      return Number(m[0]);
    }

    function wort() {
      const m = /^[A-Za-z_$À-￿][\w$À-￿]*/.exec(text.slice(i, i + 200));
      if (!m) return "";
      i += m[0].length;
      return m[0];
    }

    function wert() {
      leer();
      const c = text[i];
      if (c === "{") return objekt();
      if (c === "[") return liste();
      if (c === '"' || c === "'" || c === "`") return texte();
      if (c === "-" || c === "+" || c === "." || (c >= "0" && c <= "9")) return zahl();
      const start = i;
      const w = wort();
      if (w === "true") return true;
      if (w === "false") return false;
      if (w === "null") return null;
      if (w === "undefined") return undefined;
      if (!w) fehler(i >= n ? "die Datei hört mitten in der Liste auf (Klammer vergessen?)" : "hier fehlt ein Wert");
      fehler("„" + w + "“ ist kein gültiger Wert (Anführungszeichen vergessen?)", start);
    }

    function objekt() {
      i++;
      const o = {};
      let zuletztZahl = false;
      for (;;) {
        leer();
        if (text[i] === "}") {
          i++;
          return o;
        }
        let name;
        const c = text[i];
        if (c >= "0" && c <= "9" && zuletztZahl) {
          fehler("bei Zahlen bitte einen Punkt statt eines Kommas verwenden, zum Beispiel 24.99");
        }
        if (c === '"' || c === "'") name = einText();
        else if (c >= "0" && c <= "9") name = String(zahl());
        else name = wort();
        if (!name) fehler(i >= n ? "eine geschweifte Klammer } fehlt" : "hier fehlt ein Feldname oder eine Klammer }");
        leer();
        if (text[i] !== ":") fehler("nach „" + name + "“ fehlt ein Doppelpunkt");
        i++;
        const v = wert();
        if (v !== undefined) o[name] = v;
        zuletztZahl = typeof v === "number";
        const vorKomma = i;
        leer();
        if (text[i] === ",") {
          i++;
        } else if (text[i] === "}") {
          i++;
          return o;
        } else {
          fehler("hinter diesem Eintrag fehlt ein Komma", vorKomma);
        }
      }
    }

    function liste() {
      i++;
      const a = [];
      for (;;) {
        leer();
        if (text[i] === "]") {
          i++;
          return a;
        }
        a.push(wert());
        const vorKomma = i;
        leer();
        if (text[i] === ",") {
          i++;
        } else if (text[i] === "]") {
          i++;
          return a;
        } else {
          fehler(i >= n ? "eine eckige Klammer ] fehlt" : "hinter diesem Eintrag fehlt ein Komma", vorKomma);
        }
      }
    }

    leer();
    if (i >= n) return null;
    const anfang = /^(window\s*\.\s*)?WUNSCHLISTE\s*=/.exec(text.slice(i, i + 100));
    if (!anfang) fehler("die Daten müssen mit „window.WUNSCHLISTE = {“ beginnen");
    i += anfang[0].length;
    const ergebnis = wert();
    leer();
    if (text[i] === ";") i++;
    leer();
    if (i < n) fehler("nach dem Ende der Liste steht noch etwas");
    return ergebnis;
  }

  function leseDatei(text) {
    const d = parseWunschliste(text);
    if (d === null) return { einstellungen: {}, wuensche: [] };
    if (!d || typeof d !== "object" || !Array.isArray(d.wuensche)) {
      throw new DateiFehler("In " + KONFIG.datei + " fehlt die Liste „wuensche“.");
    }
    return d;
  }

  function normalisiere(roh) {
    const einstellungen =
      roh.einstellungen && typeof roh.einstellungen === "object" ? Object.assign({}, roh.einstellungen) : {};
    const vergeben = new Set();
    const wuensche = [];
    // Einträge ohne Titel zeigt die Seite nicht an. Sie bleiben trotzdem in der Datei erhalten.
    const ohneTitel = [];
    for (const w of roh.wuensche) {
      if (!(w && w.titel)) {
        ohneTitel.push(w);
        continue;
      }
      // gleiche Regel wie in app.js (Zählung nur über Wünsche mit Titel)
      let id = kurzname(w.id || w.titel) || "wunsch-" + (wuensche.length + 1);
      const basis = id;
      for (let n = 2; vergeben.has(id); n++) id = basis + "-" + n;
      vergeben.add(id);
      wuensche.push(Object.assign({ id }, w, { id })); // id zuerst, wie bei neuen Wünschen
    }
    return { einstellungen, wuensche, ohneTitel };
  }

  function dateiText(d) {
    const e = d.einstellungen || {};
    const einstellungen = Object.assign(
      {
        titel: e.titel || "",
        einleitung: e.einleitung || "",
        amazonWunschliste: e.amazonWunschliste || "",
        groessen: e.groessen || {},
        fusszeile: e.fusszeile || "",
      },
      e
    );
    const inhalt = { einstellungen, wuensche: d.wuensche.concat(d.ohneTitel || []) };
    // Wie in der Anleitung: hinter jedem Eintrag ein Komma, damit man von Hand gefahrlos Zeilen
    // ergänzen oder Blöcke kopieren kann. (JSON enthält in Texten nie echte Zeilenumbrüche.)
    const json = JSON.stringify(inhalt, null, 2).replace(/([^,{[\s])(?=\n\s*[}\]])/g, "$1,");
    return (dateiKopf || DATEI_KOPF) + "window.WUNSCHLISTE = " + json + ";\n";
  }

  // Übernimmt den Kommentar-Kopf der vorhandenen Datei, solange er wirklich nur aus Kommentaren besteht.
  function kopfAus(text) {
    const stelle = text.search(/window\s*\.\s*WUNSCHLISTE\s*=/);
    if (stelle <= 0) return null;
    const kopf = text.slice(0, stelle);
    const ohneKommentare = kopf.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").trim();
    if (ohneKommentare) return null;
    return kopf.replace(/\s*$/, "\n\n");
  }

  function repoPfad() {
    return "/repos/" + encodeURIComponent(KONFIG.besitzer) + "/" + encodeURIComponent(KONFIG.repo);
  }

  async function ladeDaten() {
    const antwort = await gh(inhaltPfad(KONFIG.datei) + "?ref=" + encodeURIComponent(KONFIG.branch));
    if (!antwort || Array.isArray(antwort) || antwort.type !== "file") {
      throw new DateiFehler(KONFIG.datei + " ist keine Datei.");
    }
    let text;
    if (antwort.encoding === "base64") {
      text = base64ZuUtf8(antwort.content || "");
    } else {
      // Sehr große Dateien liefert die Inhalts-Schnittstelle nicht mit; dann über den Blob lesen.
      const blob = await gh(repoPfad() + "/git/blobs/" + antwort.sha);
      text = base64ZuUtf8(blob.content || "");
    }
    daten = normalisiere(leseDatei(text));
    dateiKopf = kopfAus(text);
    dateiSha = antwort.sha;
    zuletztGeschrieben = text;
  }

  async function existiert(pfad, ref) {
    try {
      await gh(inhaltPfad(pfad) + "?ref=" + encodeURIComponent(ref));
      return true;
    } catch (f) {
      return false;
    }
  }

  // Schreibt alle Dateien eines Speichervorgangs als EINEN Commit (Git-Data-API).
  // So gibt es pro Speichern nur einen Neubau der Seite, und Bild + Liste kommen gemeinsam an.
  // dateien: { pfad, text } | { pfad, base64 } | { pfad, loeschen: true }
  async function commitDateien(nachricht, dateien) {
    const repo = repoPfad();
    const branchRef = "heads/" + encodeURIComponent(KONFIG.branch);
    for (let versuch = 1; ; versuch++) {
      const ref = await gh(repo + "/git/ref/" + branchRef);
      const basis = ref.object.sha;
      const basisCommit = await gh(repo + "/git/commits/" + basis);

      // Wurde die Liste seit dem Laden woanders geändert? Dann nicht überschreiben.
      const aktuell = await gh(inhaltPfad(KONFIG.datei) + "?ref=" + basis);
      if (aktuell.sha !== dateiSha) {
        throw new GitHubFehler(409, KONFIG.datei + " wurde inzwischen geändert");
      }

      const eintraege = [];
      for (const d of dateien) {
        if (d.loeschen) {
          if (await existiert(d.pfad, basis)) eintraege.push({ path: d.pfad, mode: "100644", type: "blob", sha: null });
          continue;
        }
        if (!d.sha) {
          const blob = await gh(repo + "/git/blobs", {
            methode: "POST",
            body: d.text !== undefined ? { content: d.text, encoding: "utf-8" } : { content: d.base64, encoding: "base64" },
          });
          d.sha = blob.sha;
        }
        eintraege.push({ path: d.pfad, mode: "100644", type: "blob", sha: d.sha });
      }

      const baum = await gh(repo + "/git/trees", {
        methode: "POST",
        body: { base_tree: basisCommit.tree.sha, tree: eintraege },
      });
      const commit = await gh(repo + "/git/commits", {
        methode: "POST",
        body: { message: nachricht, tree: baum.sha, parents: [basis] },
      });
      try {
        await gh(repo + "/git/refs/" + branchRef, { methode: "PATCH", body: { sha: commit.sha } });
        return;
      } catch (f) {
        // Gleichzeitig kam ein anderer Commit dazu (z. B. ein Bild direkt auf GitHub hochgeladen):
        // auf dem neuen Stand noch einmal versuchen.
        if (f instanceof GitHubFehler && f.status === 422 && versuch < 3) continue;
        throw f;
      }
    }
  }

  async function schreibeDaten(nachricht, weitere) {
    const text = dateiText(daten);
    const zusatz = weitere || [];
    if (text === zuletztGeschrieben && !zusatz.length) return;
    const datei = { pfad: KONFIG.datei, text };
    await commitDateien(nachricht, [datei].concat(zusatz));
    dateiSha = datei.sha;
    zuletztGeschrieben = text;
  }

  // Schreibvorgänge nacheinander ausführen, nie gleichzeitig.
  function inWarteschlange(aufgabe) {
    offeneSchreibvorgaenge++;
    const lauf = warteschlange.then(aufgabe, aufgabe).finally(() => {
      offeneSchreibvorgaenge--;
    });
    warteschlange = lauf.catch(() => {});
    return lauf;
  }

  function hatUngespeichertes() {
    return (
      speichertGerade || offeneSchreibvorgaenge > 0 || reihenfolgeTimer !== null ||
      editorGeaendert() || einstellungenGeaendert()
    );
  }

  // Daten ändern und speichern. Schlägt das Speichern fehl, wird die Änderung zurückgenommen.
  // zusatz(datenNachher) liefert weitere Dateien für denselben Commit (neue oder zu löschende Bilder).
  function aendere(veraendern, nachricht, zusatz) {
    return inWarteschlange(async () => {
      const vorher = klon(daten);
      veraendern(daten);
      try {
        await schreibeDaten(nachricht, zusatz ? zusatz(daten) : []);
      } catch (f) {
        daten = vorher;
        throw f;
      }
    });
  }

  function neuerBildPfad(titel) {
    return KONFIG.bilderOrdner + "/" + (kurzname(titel) || "bild") + "-" + Date.now().toString(36) + ".jpg";
  }

  // Hochgeladene Bilder, die nach der Änderung kein Wunsch mehr benutzt, gleich mit entfernen.
  function unbenutzteBilder(pfade, d) {
    return pfade
      .filter((pfad) => typeof pfad === "string" && pfad.startsWith(KONFIG.bilderOrdner + "/"))
      .filter((pfad) => /\.(jpe?g|png|webp|gif)$/i.test(pfad))
      .filter((pfad) => !d.wuensche.some((w) => w.bild === pfad))
      .map((pfad) => ({ pfad, loeschen: true }));
  }

  // ---------- Bilder vorbereiten ----------

  function ladeAlsImg(datei) {
    return new Promise((ok, fehler) => {
      const url = URL.createObjectURL(datei);
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => {
        URL.revokeObjectURL(url);
        fehler(new Error("Bild nicht lesbar"));
      };
      img.src = url;
    });
  }

  // Verkleinert Fotos, damit die Seite schnell lädt, und speichert sie als JPG.
  async function verkleinereBild(datei) {
    let bild;
    try {
      bild = await createImageBitmap(datei);
    } catch (e) {
      bild = await ladeAlsImg(datei);
    }
    const breite = bild.width || bild.naturalWidth;
    const hoehe = bild.height || bild.naturalHeight;
    if (!breite || !hoehe) throw new Error("Bild nicht lesbar");
    const faktor = Math.min(1, MAX_BILD_KANTE / Math.max(breite, hoehe));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(breite * faktor));
    canvas.height = Math.max(1, Math.round(hoehe * faktor));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // durchsichtige Bereiche (PNG) weiß statt schwarz
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bild, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    if (!blob) throw new Error("Bild konnte nicht umgewandelt werden");
    return blob;
  }

  // Gibt die Vorschau eines ausgewählten, noch nicht hochgeladenen Bildes frei.
  function gibBildFrei() {
    if (editorBild && editorBild.art === "neu") URL.revokeObjectURL(editorBild.url);
  }

  function bildQuelle(pfad) {
    return frischeBilder.get(pfad) || pfad;
  }

  function istErlaubteBildAngabe(wert) {
    if (/^https?:\/\//i.test(wert)) return true;
    // relative Pfade wie bilder/jacke.jpg, aber keine anderen Schemata (javascript:, data: …)
    return !/^[a-z][a-z0-9+.-]*:/i.test(wert) && !wert.startsWith("//");
  }

  // ---------- Werte prüfen ----------

  function leseZahl(text) {
    if (typeof text === "number") return isFinite(text) ? Math.round(text * 100) / 100 : null;
    let t = String(text).replace(/€|eur/gi, "").replace(/\s/g, "");
    if (!t) return undefined;
    if (t.includes(",") && t.includes(".")) {
      // 1.299,99 (deutsch) oder 1,299.99 (englisch)
      t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      t = t.replace(/\./g, ""); // 1.299 = Tausenderpunkt
    } else {
      t = t.replace(",", ".");
    }
    if (!/^\d+(\.\d+)?$/.test(t)) return null;
    return Math.round(parseFloat(t) * 100) / 100;
  }

  function normalisiereUrl(text) {
    let t = String(text).trim();
    if (!t) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t)) return null;
    if (!/^https?:\/\//i.test(t)) t = "https://" + t.replace(/^\/+/, "");
    try {
      const u = new URL(t);
      if (!u.hostname.includes(".")) return null;
    } catch (e) {
      return null;
    }
    return t;
  }

  function linkName(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (/(^|\.)amazon\.|(^|\.)amzn\./.test(host)) return "Amazon";
      return host.charAt(0).toUpperCase() + host.slice(1);
    } catch (e) {
      return "Zum Shop";
    }
  }

  function neueId(titel) {
    const vergeben = new Set(daten.wuensche.map((w) => w.id));
    const basis = kurzname(titel) || "wunsch";
    let id = basis;
    for (let n = 2; vergeben.has(id); n++) id = basis + "-" + n;
    return id;
  }

  // ---------- Wiederholbare Zeilen (Details, Links, Größen) ----------

  function zeileHinzufuegen(container, werte, art) {
    const [a, b] = werte || ["", ""];
    const zeile = el("div", "zeile");
    const eingabeA = el("input");
    eingabeA.type = "text";
    eingabeA.value = a;
    eingabeA.placeholder = art.platzhalterA;
    eingabeA.setAttribute("aria-label", art.labelA);
    const eingabeB = el("input");
    eingabeB.type = art.typB || "text";
    if (art.typB === "url") eingabeB.inputMode = "url";
    eingabeB.value = b;
    eingabeB.placeholder = art.platzhalterB;
    eingabeB.setAttribute("aria-label", art.labelB);
    const weg = knopf("×", "zeile-entfernen", () => {
      zeile.remove();
    });
    weg.setAttribute("aria-label", art.labelA + " entfernen");
    weg.title = "Entfernen";
    zeile.append(eingabeA, eingabeB, weg);
    container.append(zeile);
    return eingabeA;
  }

  function leseZeilen(container) {
    return [...container.querySelectorAll(".zeile")]
      .map((zeile) => {
        const [a, b] = zeile.querySelectorAll("input");
        return [a.value.trim(), b.value.trim(), a, b];
      })
      .filter(([a, b]) => a || b);
  }

  const DETAIL = { platzhalterA: "z. B. Größe", platzhalterB: "z. B. M", labelA: "Detail-Bezeichnung", labelB: "Detail-Wert" };
  const LINK = { platzhalterA: "z. B. Amazon", platzhalterB: "https://…", labelA: "Name des Shops", labelB: "Adresse (URL)", typB: "url" };
  const GROESSE = { platzhalterA: "z. B. Schuhe", platzhalterB: "z. B. EU 43", labelA: "Kleidungsstück", labelB: "Größe" };

  // ---------- Übersicht ----------

  function miniBild(w) {
    const box = el("div", "mini-bild");
    const zeigeMonogramm = () => {
      box.classList.add("ohne-bild");
      box.replaceChildren(document.createTextNode(String(w.titel).trim().charAt(0).toUpperCase()));
    };
    if (w.bild && istErlaubteBildAngabe(w.bild)) {
      const img = el("img");
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", zeigeMonogramm);
      img.src = bildQuelle(w.bild);
      box.append(img);
    } else {
      zeigeMonogramm();
    }
    return box;
  }

  // fokusId: danach diesen Wunsch fokussieren (null = Knopf „Neuer Wunsch“, undefined = Fokus nicht ändern)
  function zeigeListe(fokusId) {
    const ul = $("admin-liste");
    const liste = daten.wuensche;
    ul.replaceChildren(
      ...liste.map((w, i) => {
        const li = el("li", "admin-wunsch" + (w.erfuellt ? " ist-erfuellt" : ""));
        li.dataset.id = w.id;

        const text = el("div", "admin-wunsch-text");
        text.append(knopf(w.titel, "admin-wunsch-titel", () => oeffneEditor(w.id)));
        const meta = el("div", "admin-wunsch-meta");
        const prio = [1, 2, 3].includes(Number(w.prioritaet)) ? Number(w.prioritaet) : 2;
        meta.append(el("span", "prio prio-" + prio, PRIORITAETEN[prio]));
        if (w.kategorie) meta.append(el("span", "", w.kategorie));
        const preis = leseZahl(w.preis === undefined || w.preis === null ? "" : w.preis);
        if (typeof preis === "number") meta.append(el("span", "", "ca. " + euro(preis)));
        if (ganzeAnzahl(w.anzahl) > 1) meta.append(el("span", "", ganzeAnzahl(w.anzahl) + "× gewünscht"));
        if (w.erfuellt === true) meta.append(el("span", "status-erfuellt", "✓ Erfüllt"));
        text.append(meta);

        const aktionen = el("div", "admin-wunsch-aktionen");
        const hoch = knopf("↑", "pfeil", () => verschiebe(w.id, -1));
        hoch.setAttribute("aria-label", "„" + w.titel + "“ nach oben");
        hoch.disabled = i === 0;
        const runter = knopf("↓", "pfeil", () => verschiebe(w.id, 1));
        runter.setAttribute("aria-label", "„" + w.titel + "“ nach unten");
        runter.disabled = i === liste.length - 1;
        const bearbeiten = knopf("Bearbeiten", "knopf knopf-rahmen knopf-klein", () => oeffneEditor(w.id));
        bearbeiten.setAttribute("aria-label", "„" + w.titel + "“ bearbeiten");
        aktionen.append(hoch, runter, bearbeiten);

        li.append(miniBild(w), text, aktionen);
        return li;
      })
    );

    const erfuellt = liste.filter((w) => w.erfuellt === true).length;
    $("liste-anzahl").textContent = liste.length
      ? "(" + (liste.length - erfuellt) + " offen" + (erfuellt ? ", " + erfuellt + " erfüllt" : "") + ")"
      : "";
    $("liste-leer").hidden = liste.length > 0;

    const kategorien = [...new Set(liste.map((w) => w.kategorie).filter(Boolean))];
    $("kategorien-liste").replaceChildren(
      ...kategorien.map((k) => {
        const o = el("option");
        o.value = k;
        return o;
      })
    );

    const ohne = (daten.ohneTitel || []).length;
    $("ohne-titel-hinweis").hidden = !ohne;
    $("ohne-titel-hinweis").textContent =
      "In " + KONFIG.datei + " " + (ohne === 1 ? "steht 1 Eintrag" : "stehen " + ohne + " Einträge") +
      " ohne Titel. Die Seite zeigt sie nicht an, sie bleiben aber in der Datei erhalten.";

    zeige("liste");
    if (fokusId !== undefined) {
      const ziel = fokusId && ul.querySelector('.admin-wunsch[data-id="' + CSS.escape(fokusId) + '"] .admin-wunsch-titel');
      (ziel || $("neu")).focus();
    }
  }

  function verschiebe(id, richtung) {
    const liste = daten.wuensche;
    const i = liste.findIndex((w) => w.id === id);
    const j = i + richtung;
    if (i < 0 || j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    zeigeListe();
    // Fokus bleibt beim verschobenen Wunsch, auch wenn er jetzt ganz oben oder unten steht.
    const zeile = document.querySelector('.admin-wunsch[data-id="' + CSS.escape(id) + '"]');
    const pfeile = zeile ? [...zeile.querySelectorAll(".pfeil")] : [];
    const gleicherPfeil = pfeile[richtung < 0 ? 0 : 1];
    const ziel = gleicherPfeil && !gleicherPfeil.disabled ? gleicherPfeil : pfeile.find((b) => !b.disabled);
    if (ziel) ziel.focus();
    planeReihenfolge();
  }

  // Mehrere Verschiebungen kurz hintereinander werden zusammen gespeichert.
  function planeReihenfolge() {
    clearTimeout(reihenfolgeTimer);
    toast("Reihenfolge wird gleich gespeichert …", 0);
    reihenfolgeTimer = setTimeout(() => {
      reihenfolgeTimer = null;
      inWarteschlange(() => schreibeDaten("Reihenfolge der Wünsche geändert"))
        .then(() => toast("Reihenfolge gespeichert."))
        .catch(async (f) => {
          $("hinweis-toast").hidden = true;
          behandleFehler(f);
          if (!istKonflikt(f) && token) await neuLaden();
        });
    }, 1200);
  }

  // ---------- Editor ----------

  function leseEditor() {
    const prio = document.querySelector('input[name="w-prio"]:checked');
    return {
      titel: $("w-titel").value,
      beschreibung: $("w-beschreibung").value,
      kategorie: $("w-kategorie").value,
      preis: $("w-preis").value,
      anzahl: $("w-anzahl").value,
      prioritaet: prio ? Number(prio.value) : 2,
      details: leseZeilen($("w-details")).map(([a, b]) => [a, b]),
      links: leseZeilen($("w-links")).map(([a, b]) => [a, b]),
      hinweis: $("w-hinweis").value,
      erfuellt: $("w-erfuellt").checked,
      bild: editorBild ? (editorBild.art === "neu" ? editorBild.url : editorBild.wert) : "",
    };
  }

  function editorGeaendert() {
    return aktuelleAnsicht === "editor" && editorStart !== null && JSON.stringify(leseEditor()) !== editorStart;
  }

  function zeigeBildVorschau() {
    const box = $("w-bild-vorschau");
    box.replaceChildren();
    box.classList.remove("ohne-bild");
    const quelle = editorBild
      ? editorBild.art === "neu"
        ? editorBild.url
        : istErlaubteBildAngabe(editorBild.wert)
          ? bildQuelle(editorBild.wert)
          : null
      : null;
    if (quelle) {
      const img = el("img");
      img.alt = "Vorschau";
      img.addEventListener("error", () => {
        box.classList.add("ohne-bild");
        box.replaceChildren(
          document.createTextNode("Vorschau nicht möglich. Das Bild ist eventuell noch nicht veröffentlicht.")
        );
      });
      img.src = quelle;
      box.append(img);
    } else {
      box.classList.add("ohne-bild");
      box.textContent = "Kein Bild. Auf der Seite erscheint dann der Anfangsbuchstabe.";
    }
    $("w-bild-entfernen").hidden = !editorBild;
    $("w-bild-url").value = editorBild && editorBild.art === "pfad" ? editorBild.wert : "";
  }

  const EDITOR_FELDER = [
    "titel", "beschreibung", "kategorie", "preis", "anzahl", "prioritaet", "details", "links", "hinweis", "erfuellt", "bild",
  ];

  // Füllt das Formular aus einem Wunsch. Mit „felder“ nur diese Felder (sonst alle).
  function fuelleEditor(quelle, felder) {
    const soll = (feld) => !felder || felder.includes(feld);
    if (soll("titel")) $("w-titel").value = quelle.titel || "";
    if (soll("beschreibung")) $("w-beschreibung").value = quelle.beschreibung || "";
    if (soll("kategorie")) $("w-kategorie").value = quelle.kategorie || "";
    if (soll("preis")) {
      const p = quelle.preis;
      $("w-preis").value =
        p === undefined || p === null || p === ""
          ? ""
          : // erst wie beim Speichern auf Cent runden, dann zwei Nachkommastellen zeigen
            (typeof p === "number" && !Number.isInteger(p) ? (Math.round(p * 100) / 100).toFixed(2) : String(p)).replace(".", ",");
    }
    if (soll("anzahl")) $("w-anzahl").value = String(ganzeAnzahl(quelle.anzahl));
    if (soll("prioritaet")) {
      const prio = [1, 2, 3].includes(Number(quelle.prioritaet)) ? Number(quelle.prioritaet) : 2;
      for (const r of document.querySelectorAll('input[name="w-prio"]')) r.checked = Number(r.value) === prio;
    }
    if (soll("hinweis")) $("w-hinweis").value = quelle.hinweis || "";
    if (soll("erfuellt")) $("w-erfuellt").checked = quelle.erfuellt === true;
    if (soll("details")) {
      $("w-details").replaceChildren();
      const details = quelle.details && typeof quelle.details === "object" ? Object.entries(quelle.details) : [];
      for (const [k, v] of details) zeileHinzufuegen($("w-details"), [k, String(v)], DETAIL);
    }
    if (soll("links")) {
      $("w-links").replaceChildren();
      const links = Array.isArray(quelle.links) ? quelle.links : [];
      for (const l of links) if (l) zeileHinzufuegen($("w-links"), [l.name || "", l.url || ""], LINK);
    }
    if (soll("bild")) {
      gibBildFrei();
      editorBild = quelle.bild ? { art: "pfad", wert: String(quelle.bild) } : null;
      zeigeBildVorschau();
    }
  }

  function oeffneEditor(id) {
    meldungWeg();
    const w = id ? daten.wuensche.find((x) => x.id === id) : null;
    bearbeiteId = w ? w.id : null;

    $("editor-titel").textContent = w ? "Wunsch bearbeiten" : "Neuer Wunsch";
    editorBild = null;
    fuelleEditor(w || { prioritaet: 2 });
    if (!w) zeileHinzufuegen($("w-links"), ["", ""], LINK);

    for (const e of $("editor-form").querySelectorAll("[aria-invalid]")) e.removeAttribute("aria-invalid");
    $("loeschen-bereich").hidden = !w;
    $("loeschen-frage").hidden = true;
    $("editor-loeschen").hidden = false;

    editorSitzung++;
    entferneFeldfehler($("editor-form"));
    zeige("editor");
    // Eigener Verlaufseintrag: Die Zurück-Geste auf dem Handy führt dann zur Liste statt von der Seite weg.
    if (!(history.state && history.state.editor)) history.pushState({ editor: true }, "");
    editorStart = JSON.stringify(leseEditor());
    $("w-titel").focus();
  }

  function verlasseEditorVerlauf() {
    if (history.state && history.state.editor) history.back();
  }

  // Nach dem Neuladen: Felder, die du nicht angefasst hast, auf den aktuellen Stand bringen.
  // Deine Änderungen bleiben, fremde Änderungen an anderen Feldern gehen nicht verloren.
  function aktualisiereEditorNachNeuladen() {
    if (aktuelleAnsicht !== "editor" || editorStart === null || !bearbeiteId) return true;
    const frisch = daten.wuensche.find((w) => w.id === bearbeiteId);
    if (!frisch) {
      bearbeiteId = null;
      $("loeschen-bereich").hidden = true;
      $("editor-titel").textContent = "Neuer Wunsch";
      return false;
    }
    const start = JSON.parse(editorStart);
    const jetzt = leseEditor();
    const unberuehrt = EDITOR_FELDER.filter((f) => JSON.stringify(start[f]) === JSON.stringify(jetzt[f]));
    fuelleEditor(frisch, unberuehrt);
    const nachher = leseEditor();
    for (const f of unberuehrt) start[f] = nachher[f];
    editorStart = JSON.stringify(start);
    return true;
  }

  function schliesseEditor(trotzdem, ausVerlauf) {
    if (!trotzdem && editorGeaendert()) {
      meldung("Du hast Änderungen, die noch nicht gespeichert sind.", {
        aktionen: [
          ["Änderungen verwerfen", () => schliesseEditor(true), "knopf-gefahr"],
          ["Weiter bearbeiten", () => $("w-titel").focus()],
        ],
      });
      return;
    }
    meldungWeg();
    editorStart = null;
    editorSitzung++;
    gibBildFrei();
    editorBild = null;
    zeigeListe(bearbeiteId);
    if (!ausVerlauf) verlasseEditorVerlauf();
  }

  // Baut aus dem Formular einen sauberen Wunsch. Gibt Fehler mit dem betroffenen Feld zurück.
  function baueWunsch(alt) {
    const fehler = [];
    const titel = $("w-titel").value.trim();
    if (!titel) fehler.push([$("w-titel"), "Bitte gib einen Titel ein."]);

    const preis = leseZahl($("w-preis").value);
    if (preis === null) fehler.push([$("w-preis"), "Der Preis muss eine Zahl sein, zum Beispiel 49,99."]);

    const anzahlText = $("w-anzahl").value.trim();
    // badInput: Buchstaben o. Ä. im Zahlenfeld (der Browser meldet dann einen leeren Wert)
    const anzahl = $("w-anzahl").validity.badInput ? NaN : anzahlText === "" ? 1 : Number(anzahlText);
    if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 999) {
      fehler.push([$("w-anzahl"), "Bitte eine ganze Zahl von 1 bis 999 eingeben."]);
    }

    const details = [];
    const detailNamen = new Set();
    for (const [k, v, eingabeK, eingabeV] of leseZeilen($("w-details"))) {
      if (!k || !v) {
        fehler.push([k ? eingabeV : eingabeK, "Bitte Bezeichnung und Wert ausfüllen."]);
      } else if (detailNamen.has(k.toLowerCase())) {
        fehler.push([eingabeK, "„" + k + "“ gibt es schon. Schreib beides in eine Zeile, z. B. „Schwarz oder Rot“."]);
      } else {
        detailNamen.add(k.toLowerCase());
        details.push([k, v]);
      }
    }

    const links = [];
    for (const [name, adresse, , eingabeUrl] of leseZeilen($("w-links"))) {
      if (!adresse) {
        fehler.push([eingabeUrl, "Beim Link „" + name + "“ fehlt die Adresse."]);
        continue;
      }
      const url = normalisiereUrl(adresse);
      if (!url) {
        fehler.push([eingabeUrl, "„" + adresse + "“ ist keine gültige Internetadresse."]);
        continue;
      }
      links.push({ name: name || linkName(url), url });
    }

    let bild = "";
    if (editorBild && editorBild.art === "pfad") {
      bild = editorBild.wert.trim();
      if (bild && !istErlaubteBildAngabe(bild)) {
        fehler.push([$("w-bild-url"), "Die Bild-Adresse muss mit https:// beginnen oder ein Pfad wie bilder/foto.jpg sein."]);
      }
    }

    const prio = document.querySelector('input[name="w-prio"]:checked');
    const wunsch = { id: alt ? alt.id : neueId(titel), titel };
    const beschreibung = $("w-beschreibung").value.trim();
    if (beschreibung) wunsch.beschreibung = beschreibung;
    const kategorie = $("w-kategorie").value.trim();
    if (kategorie) wunsch.kategorie = kategorie;
    wunsch.prioritaet = prio ? Number(prio.value) : 2;
    if (typeof preis === "number") wunsch.preis = preis;
    if (Number.isInteger(anzahl) && anzahl > 1) wunsch.anzahl = anzahl;
    if (details.length) wunsch.details = Object.fromEntries(details);
    if (bild) wunsch.bild = bild;
    if (links.length) wunsch.links = links;
    const hinweis = $("w-hinweis").value.trim();
    if (hinweis) wunsch.hinweis = hinweis;
    if ($("w-erfuellt").checked) wunsch.erfuellt = true;
    // Felder, die die Oberfläche nicht kennt, bleiben erhalten.
    if (alt) for (const [k, v] of Object.entries(alt)) if (!BEKANNTE_FELDER.has(k)) wunsch[k] = v;

    return { wunsch, fehler };
  }

  async function speichereEditor(e) {
    e.preventDefault();
    if (speichertGerade) return;
    if (bildVorbereitung) {
      // Erst fertig machen, sonst würde das gerade gewählte Foto fehlen.
      setzeBeschaeftigt(true, "Bild wird noch vorbereitet …");
      try {
        await bildVorbereitung;
      } finally {
        setzeBeschaeftigt(false);
        $("hinweis-toast").hidden = true;
      }
    }
    meldungWeg();
    entferneFeldfehler($("editor-form"));

    const alt = bearbeiteId ? daten.wuensche.find((w) => w.id === bearbeiteId) || null : null;
    const { wunsch, fehler } = baueWunsch(alt);
    if (fehler.length) {
      zeigeFeldfehler($("editor-form"), fehler);
      return;
    }

    setzeBeschaeftigt(true, "Speichere …");
    try {
      const neueBilder = [];
      const ausgewaehlt = editorBild && editorBild.art === "neu" ? editorBild : null;
      if (ausgewaehlt) {
        if (!ausgewaehlt.base64) ausgewaehlt.base64 = await blobZuBase64(ausgewaehlt.blob);
        wunsch.bild = neuerBildPfad(wunsch.titel);
        neueBilder.push({ pfad: wunsch.bild, base64: ausgewaehlt.base64 });
      }
      const altesBild = alt ? alt.bild : null;
      const istNeu = !alt;
      await aendere(
        (d) => {
          const i = istNeu ? -1 : d.wuensche.findIndex((w) => w.id === wunsch.id);
          if (i >= 0) d.wuensche[i] = wunsch;
          else d.wuensche.unshift(wunsch);
        },
        (istNeu ? "Wunsch „" : "Wunsch geändert: „") + wunsch.titel + (istNeu ? "“ hinzugefügt" : "“"),
        (d) => neueBilder.concat(unbenutzteBilder([altesBild], d))
      );
      if (ausgewaehlt) {
        // Bis GitHub Pages das Bild veröffentlicht hat, zeigt die Admin-Seite die lokale Vorschau.
        frischeBilder.set(wunsch.bild, ausgewaehlt.url);
        editorBild = { art: "pfad", wert: wunsch.bild };
      }
      editorStart = null;
      editorSitzung++;
      zeigeListe(wunsch.id);
      verlasseEditorVerlauf();
      toast("Gespeichert. In 1 bis 2 Minuten ist die Änderung auf der Seite sichtbar.", 6000);
    } catch (f) {
      $("hinweis-toast").hidden = true;
      behandleFehler(f);
    } finally {
      setzeBeschaeftigt(false);
    }
  }

  async function loescheAktuellenWunsch() {
    if (speichertGerade || !bearbeiteId) return;
    const alt = daten.wuensche.find((w) => w.id === bearbeiteId);
    if (!alt) return;
    setzeBeschaeftigt(true, "Lösche …");
    try {
      await aendere(
        (d) => {
          d.wuensche = d.wuensche.filter((w) => w.id !== alt.id);
        },
        "Wunsch „" + alt.titel + "“ gelöscht",
        (d) => unbenutzteBilder([alt.bild], d)
      );
      editorStart = null;
      editorSitzung++;
      zeigeListe(null);
      verlasseEditorVerlauf();
      toast("„" + alt.titel + "“ wurde gelöscht.", 5000);
    } catch (f) {
      $("hinweis-toast").hidden = true;
      behandleFehler(f);
    } finally {
      setzeBeschaeftigt(false);
    }
  }

  // ---------- Einstellungen ----------

  let einstellungenStart = null; // Formularstand nach dem Füllen

  function leseEinstellungenFormular() {
    return {
      titel: $("e-titel").value,
      einleitung: $("e-einleitung").value,
      amazonWunschliste: $("e-amazon").value,
      groessen: leseZeilen($("e-groessen")).map(([a, b]) => [a, b]),
      fusszeile: $("e-fusszeile").value,
    };
  }

  function einstellungenGeaendert() {
    return einstellungenStart !== null && JSON.stringify(leseEinstellungenFormular()) !== einstellungenStart;
  }

  function fuelleEinstellungen() {
    const e = daten.einstellungen;
    $("e-titel").value = e.titel || "";
    $("e-einleitung").value = e.einleitung || "";
    $("e-amazon").value = e.amazonWunschliste || "";
    $("e-fusszeile").value = e.fusszeile || "";
    $("e-groessen").replaceChildren();
    const groessen = e.groessen && typeof e.groessen === "object" ? Object.entries(e.groessen) : [];
    for (const [k, v] of groessen) zeileHinzufuegen($("e-groessen"), [k, String(v)], GROESSE);
    einstellungenStart = JSON.stringify(leseEinstellungenFormular());
  }

  async function speichereEinstellungen(ev) {
    ev.preventDefault();
    if (speichertGerade) return;
    meldungWeg();
    entferneFeldfehler($("einstellungen-form"));

    const fehler = [];
    let amazon = $("e-amazon").value.trim();
    if (amazon) {
      const url = normalisiereUrl(amazon);
      if (!url) fehler.push([$("e-amazon"), "Der Amazon-Link ist keine gültige Internetadresse."]);
      else amazon = url;
    }
    const groessen = [];
    const groessenNamen = new Set();
    for (const [k, v, eingabeK, eingabeV] of leseZeilen($("e-groessen"))) {
      if (!k || !v) {
        fehler.push([k ? eingabeV : eingabeK, "Bitte Kleidungsstück und Größe ausfüllen."]);
      } else if (groessenNamen.has(k.toLowerCase())) {
        fehler.push([eingabeK, "„" + k + "“ steht schon in der Liste."]);
      } else {
        groessenNamen.add(k.toLowerCase());
        groessen.push([k, v]);
      }
    }
    if (fehler.length) {
      zeigeFeldfehler($("einstellungen-form"), fehler);
      return;
    }

    const alle = {
      titel: $("e-titel").value.trim(),
      einleitung: $("e-einleitung").value.trim(),
      amazonWunschliste: amazon,
      groessen: Object.fromEntries(groessen),
      fusszeile: $("e-fusszeile").value.trim(),
    };
    // Nur Felder übernehmen, die du geändert hast. So überschreibt das Speichern keine Änderungen,
    // die inzwischen woanders gemacht wurden.
    const start = einstellungenStart ? JSON.parse(einstellungenStart) : {};
    const jetzt = leseEinstellungenFormular();
    const neu = {};
    for (const feld of Object.keys(alle)) {
      if (JSON.stringify(start[feld]) !== JSON.stringify(jetzt[feld])) neu[feld] = alle[feld];
    }
    if (!Object.keys(neu).length) {
      toast("Keine Änderungen zum Speichern.");
      return;
    }

    setzeBeschaeftigt(true, "Speichere …");
    try {
      await aendere((d) => {
        d.einstellungen = Object.assign({}, d.einstellungen, neu);
      }, "Einstellungen der Wunschliste geändert");
      fuelleEinstellungen();
      toast("Einstellungen gespeichert. In 1 bis 2 Minuten sind sie auf der Seite sichtbar.", 6000);
    } catch (f) {
      $("hinweis-toast").hidden = true;
      behandleFehler(f);
      // Falls die Liste inzwischen lokal umsortiert wurde, den gespeicherten Stand zeigen.
      if (daten && aktuelleAnsicht === "liste") zeigeListe();
    } finally {
      setzeBeschaeftigt(false);
    }
  }

  // ---------- Anmelden, Laden, Abmelden ----------

  async function neuLaden() {
    try {
      await inWarteschlange(ladeDaten);
      if (!einstellungenGeaendert()) fuelleEinstellungen();
      if (aktuelleAnsicht === "editor") {
        const nochDa = aktualisiereEditorNachNeuladen();
        meldung(
          nochDa
            ? "Die aktuelle Fassung ist geladen. Deine Eingaben sind noch da. Du kannst jetzt speichern."
            : "Dieser Wunsch wurde inzwischen woanders gelöscht. Beim Speichern wird er neu angelegt.",
          { art: "ok" }
        );
      } else {
        zeigeListe();
      }
    } catch (f) {
      behandleFehler(f);
    }
  }

  async function starteMitToken() {
    zeige("laden");
    try {
      await ladeDaten();
      fuelleEinstellungen();
      zeigeListe();
    } catch (f) {
      if (f instanceof DateiFehler) {
        zeige("keine");
        behandleFehler(f);
      } else if (f instanceof GitHubFehler && (f.status === 401 || f.status === 403 || f.status === 404)) {
        abmelden(false);
        meldung(fehlerText(f));
      } else {
        zeige("login");
        $("abmelden").hidden = false;
        meldung(fehlerText(f), { aktionen: [["Noch einmal versuchen", starteMitToken, "knopf-voll"]] });
      }
    }
  }

  async function anmelden(ev) {
    ev.preventDefault();
    meldungWeg();
    const wert = $("schluessel").value.trim();
    entferneFeldfehler($("login-form"));
    if (!wert) {
      zeigeFeldfehler($("login-form"), [[$("schluessel"), "Bitte füge deinen Admin-Schlüssel ein."]]);
      return;
    }
    if (/^(ghp|gho|ghu|ghs)_/.test(wert)) {
      zeigeFeldfehler($("login-form"), [[
        $("schluessel"),
        "Das ist ein klassischer Schlüssel mit Zugriff auf alle deine Repositories. Bitte erstelle über den Link oben einen „Fine-grained“-Schlüssel (beginnt mit „github_pat_“).",
      ]]);
      return;
    }
    if (!/^github_pat_[A-Za-z0-9_]+$/.test(wert)) {
      zeigeFeldfehler($("login-form"), [[
        $("schluessel"),
        "Das sieht nicht nach einem passenden Schlüssel aus. Er beginnt mit „github_pat_“ und enthält keine Leerzeichen.",
      ]]);
      return;
    }
    token = wert;
    $("login-knopf").disabled = true;
    zeige("laden");
    try {
      await ladeDaten();
      await pruefeSchreibrecht();
      speichereToken(wert, $("merken").checked);
      $("schluessel").value = "";
      if (!einstellungenGeaendert()) fuelleEinstellungen();
      if (zurueckNachLogin === "editor" && editorStart !== null) {
        zurueckNachLogin = null;
        zeige("editor");
        aktualisiereEditorNachNeuladen();
        meldung("Angemeldet. Deine Eingaben sind noch da. Tippe jetzt noch einmal auf „Speichern“.", { art: "ok" });
      } else {
        zurueckNachLogin = null;
        zeigeListe();
        toast("Angemeldet.");
      }
    } catch (f) {
      if (f instanceof DateiFehler) {
        // Der Schlüssel funktioniert, nur die Datei hat einen Tippfehler.
        speichereToken(wert, $("merken").checked);
        $("schluessel").value = "";
        zeige("keine");
        behandleFehler(f);
      } else {
        token = null;
        zeige("login");
        meldung(fehlerText(f));
      }
    } finally {
      $("login-knopf").disabled = false;
    }
  }

  // Einmal beim Anmelden prüfen, ob der Schlüssel schreiben darf (sonst fiele das erst beim ersten Speichern auf).
  // Legt dafür nur ein unbenutztes Git-Objekt an; im Repository ändert sich nichts.
  async function pruefeSchreibrecht() {
    try {
      await gh(repoPfad() + "/git/blobs", {
        methode: "POST",
        body: { content: "Wunschliste: Test der Schreibrechte\n", encoding: "utf-8" },
      });
    } catch (f) {
      if (f instanceof GitHubFehler && f.status === 404) throw new GitHubFehler(403, "Kein Schreibrecht");
      if (f instanceof GitHubFehler && f.status === 422) return; // Anfrage kam an, Schreibrecht ist da
      throw f;
    }
  }

  function abmelden(mitHinweis) {
    clearTimeout(reihenfolgeTimer);
    reihenfolgeTimer = null;
    loescheToken();
    token = null;
    daten = null;
    dateiSha = null;
    zuletztGeschrieben = null;
    editorStart = null;
    einstellungenStart = null;
    zurueckNachLogin = null;
    editorSitzung++;
    zeige("login");
    if (mitHinweis) toast("Abgemeldet. Der Schlüssel wurde von diesem Gerät entfernt.");
  }

  // ---------- Start ----------

  $("repo-name").textContent = KONFIG.repo;
  // GitHub kann das Formular für neue Schlüssel vorausfüllen (Name, Ablauf, Berechtigung).
  $("schluessel-link").href =
    "https://github.com/settings/personal-access-tokens/new?" +
    new URLSearchParams({
      name: "Wunschliste Admin",
      description: "Admin-Seite der Wunschliste (" + KONFIG.besitzer + "/" + KONFIG.repo + ")",
      target_name: KONFIG.besitzer,
      expires_in: "366",
      contents: "write",
    }).toString();
  $("login-form").addEventListener("submit", anmelden);
  $("abmelden").addEventListener("click", () => {
    if (hatUngespeichertes()) {
      meldung("Es gibt noch ungespeicherte Änderungen.", {
        aktionen: [["Trotzdem abmelden", () => abmelden(true), "knopf-gefahr"]],
      });
      return;
    }
    meldungWeg();
    abmelden(true);
  });

  $("neu").addEventListener("click", () => oeffneEditor(null));
  $("editor-form").addEventListener("submit", speichereEditor);
  $("editor-zurueck").addEventListener("click", () => schliesseEditor(false));
  $("editor-abbrechen").addEventListener("click", () => schliesseEditor(false));
  $("editor-loeschen").addEventListener("click", () => {
    $("editor-loeschen").hidden = true;
    $("loeschen-frage").hidden = false;
    $("loeschen-nein").focus();
  });
  $("loeschen-nein").addEventListener("click", () => {
    $("loeschen-frage").hidden = true;
    $("editor-loeschen").hidden = false;
    $("editor-loeschen").focus();
  });
  $("loeschen-ja").addEventListener("click", loescheAktuellenWunsch);

  $("w-detail-neu").addEventListener("click", () => zeileHinzufuegen($("w-details"), null, DETAIL).focus());
  $("w-link-neu").addEventListener("click", () => zeileHinzufuegen($("w-links"), null, LINK).focus());
  $("e-groesse-neu").addEventListener("click", () => zeileHinzufuegen($("e-groessen"), null, GROESSE).focus());
  $("einstellungen-form").addEventListener("submit", speichereEinstellungen);

  $("w-bild-datei").addEventListener("change", async (ev) => {
    const datei = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!datei) return;
    if (datei.type && !datei.type.startsWith("image/")) {
      meldung("Bitte wähle eine Bilddatei aus, zum Beispiel ein JPG- oder PNG-Bild.");
      return;
    }
    const sitzung = editorSitzung;
    const box = $("w-bild-vorschau");
    box.classList.add("ohne-bild");
    box.textContent = "Bild wird vorbereitet …";
    const vorbereitung = (async () => {
      try {
        const blob = await verkleinereBild(datei);
        if (sitzung !== editorSitzung) return; // Editor wurde inzwischen geschlossen oder gewechselt
        gibBildFrei();
        editorBild = { art: "neu", blob, url: URL.createObjectURL(blob) };
        meldungWeg();
      } catch (e) {
        if (sitzung === editorSitzung) {
          meldung("Dieses Bild konnte nicht gelesen werden. Versuche es mit einem JPG- oder PNG-Bild.");
        }
      } finally {
        if (sitzung === editorSitzung) zeigeBildVorschau();
      }
    })();
    bildVorbereitung = vorbereitung;
    await vorbereitung;
    if (bildVorbereitung === vorbereitung) bildVorbereitung = null;
  });

  $("w-bild-entfernen").addEventListener("click", () => {
    gibBildFrei();
    editorBild = null;
    zeigeBildVorschau();
  });

  $("w-bild-url").addEventListener("change", (ev) => {
    const wert = ev.target.value.trim();
    gibBildFrei();
    editorBild = wert ? { art: "pfad", wert } : null;
    zeigeBildVorschau();
    $("w-bild-url").closest("details").open = true;
  });

  window.addEventListener("popstate", () => {
    if (aktuelleAnsicht !== "editor") return;
    if (speichertGerade || editorGeaendert()) {
      history.pushState({ editor: true }, "");
      if (!speichertGerade) schliesseEditor(false);
      return;
    }
    schliesseEditor(true, true);
  });

  window.addEventListener("beforeunload", (ev) => {
    if (hatUngespeichertes()) {
      ev.preventDefault();
      ev.returnValue = "";
    }
  });

  token = ladeToken();
  if (token) {
    starteMitToken();
  } else {
    zeige("login");
  }
})();
