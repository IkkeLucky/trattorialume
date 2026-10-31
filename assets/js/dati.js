/* Trattoria Lume — dati e utilità condivise.
   Tutto è simulato nel browser: disponibilità, tavoli occupati e prenotazioni
   d'esempio sono generati in modo deterministico dalla data, così la demo
   mostra sempre gli stessi dati per lo stesso giorno. Il backend arriverà dopo. */
(function () {
  "use strict";

  // ---------- generatore pseudo-casuale con seme ----------
  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function rng(seed) {
    let a = hash(String(seed));
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- date ----------
  const fmtGiorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const fmtBreve = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const fmtMese = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
  const pad = (n) => String(n).padStart(2, "0");
  const chiave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daChiave = (k) => { const [y, m, g] = k.split("-").map(Number); return new Date(y, m - 1, g); };
  const oggi = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const chiuso = (d) => d.getDay() === 1; // lunedì
  const euro = (n) => "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const euroTondo = (n) => "€ " + n.toLocaleString("it-IT");

  // ---------- turni e orari ----------
  const ORARI = {
    pranzo: ["12:30", "13:00", "13:30", "14:00"],
    cena: ["19:30", "20:00", "20:30", "21:00", "21:30", "22:00"]
  };

  // ---------- sale e tavoli ----------
  // x, y: centro del tavolo in % della pianta. w, h: dimensioni in % (h relativo all'altezza).
  const AREE = {
    sala: {
      nome: "Sala Grande",
      elementi: [
        { tipo: "muro", x: 0, y: 0, w: 100, h: 1.2 },
        { tipo: "etichetta", testo: "finestre su via dei Serragli", x: 3, y: 4 },
        { tipo: "blocco", testo: "cucina", x: 90, y: 30, w: 10, h: 40 },
        { tipo: "etichetta", testo: "ingresso", x: 3, y: 92 },
        { tipo: "blocco", testo: "forno", x: 90, y: 78, w: 10, h: 22 }
      ],
      tavoli: [
        { id: "S1", posti: 2, forma: "tondo", x: 10, y: 28, w: 7 },
        { id: "S2", posti: 2, forma: "tondo", x: 10, y: 64, w: 7 },
        { id: "S3", posti: 4, forma: "quadro", x: 28, y: 28, w: 9, h: 14 },
        { id: "S4", posti: 4, forma: "quadro", x: 28, y: 64, w: 9, h: 14 },
        { id: "S5", posti: 6, forma: "quadro", x: 50, y: 46, w: 16, h: 14 },
        { id: "S6", posti: 4, forma: "tondo", x: 72, y: 26, w: 9.5 },
        { id: "S7", posti: 4, forma: "tondo", x: 72, y: 68, w: 9.5 },
        { id: "S8", posti: 2, forma: "tondo", x: 48, y: 84, w: 7 }
      ]
    },
    nonna: {
      nome: "Stanza della Nonna",
      elementi: [
        { tipo: "muro", x: 0, y: 0, w: 1.2, h: 100 },
        { tipo: "blocco", testo: "camino", x: 0, y: 66, w: 16, h: 34 },
        { tipo: "etichetta", testo: "l'orologio a cucù", x: 38, y: 4 },
        { tipo: "etichetta", testo: "finestre verdi", x: 78, y: 92 }
      ],
      tavoli: [
        { id: "N1", posti: 4, forma: "quadro", x: 34, y: 38, w: 11, h: 17 },
        { id: "N2", posti: 4, forma: "tondo", x: 68, y: 36, w: 11 },
        { id: "N3", posti: 2, forma: "tondo", x: 58, y: 74, w: 8 }
      ]
    },
    banco: {
      nome: "Banco dello Chef",
      elementi: [
        { tipo: "blocco", testo: "cucina a vista", x: 8, y: 6, w: 84, h: 38 },
        { tipo: "etichetta", testo: "la chef impiatta qui davanti", x: 30, y: 88 }
      ],
      tavoli: [
        { id: "B1", posti: 6, forma: "quadro", x: 50, y: 58, w: 70, h: 10, min: 1, max: 6, banco: true }
      ]
    },
    cantina: {
      nome: "Cantina Privata",
      elementi: [
        { tipo: "blocco", testo: "scaffale dei vini", x: 4, y: 4, w: 92, h: 12 },
        { tipo: "blocco", testo: "botti", x: 4, y: 76, w: 18, h: 20 },
        { tipo: "etichetta", testo: "porta riservata", x: 78, y: 92 }
      ],
      tavoli: [
        { id: "C1", posti: 16, forma: "quadro", x: 54, y: 50, w: 62, h: 18, min: 8, max: 16 }
      ]
    }
  };
  const TUTTI_TAVOLI = Object.entries(AREE).flatMap(([area, a]) => a.tavoli.map((t) => ({ ...t, area })));
  const minPosti = (t) => t.min ?? Math.max(1, t.posti - 2);
  const maxPosti = (t) => t.max ?? t.posti;
  const adatto = (t, coperti) => coperti >= minPosti(t) && coperti <= maxPosti(t);

  // ---------- disponibilità simulata ----------
  function occupato(dataK, ora, tavoloId) {
    // le prenotazioni fatte nella demo occupano davvero il tavolo
    if (prenotazioniUtente().some((p) => p.data === dataK && p.ora === ora && p.tavolo === tavoloId)) return true;
    const d = daChiave(dataK);
    const weekend = d.getDay() === 5 || d.getDay() === 6;
    const caldo = ["20:00", "20:30", "13:00"].includes(ora) ? 0.18 : 0;
    const r = rng(`${dataK}|${ora}|${tavoloId}`)();
    return r < 0.32 + (weekend ? 0.22 : 0) + caldo;
  }
  function tavoliLiberi(dataK, ora, coperti, area) {
    return TUTTI_TAVOLI.filter((t) => (!area || t.area === area) && adatto(t, coperti) && !occupato(dataK, ora, t.id));
  }
  function statoOrario(dataK, ora, coperti) {
    const n = tavoliLiberi(dataK, ora, coperti).length;
    return { liberi: n, stato: n === 0 ? "esaurito" : n <= 2 ? "pochi" : "libero" };
  }
  function statoGiorno(dataK, coperti) {
    const orari = [...ORARI.pranzo, ...ORARI.cena];
    const tot = orari.reduce((s, o) => s + tavoliLiberi(dataK, o, coperti).length, 0);
    return tot === 0 ? "pieno" : tot < 14 ? "pochi" : "libero";
  }

  // ---------- esperienze e caparre ----------
  const ESPERIENZE = {
    carta: { nome: "Alla carta", caparra: 10, durata: 120 },
    degustazione: { nome: "Degustazione «Lume»", caparra: 25, durata: 150 },
    chef: { nome: "Al Banco con la chef", caparra: 40, durata: 150 }
  };

  // ---------- archivio locale (solo in questo browser) ----------
  const CHIAVE = "lume.prenotazioni.v1";
  let memoria = [];
  function prenotazioniUtente() {
    try {
      const raw = window.localStorage.getItem(CHIAVE);
      if (raw) memoria = JSON.parse(raw);
    } catch (e) { /* storage non disponibile: resta in memoria */ }
    return memoria;
  }
  function salvaPrenotazione(p) {
    memoria = prenotazioniUtente().concat(p);
    try { window.localStorage.setItem(CHIAVE, JSON.stringify(memoria)); } catch (e) { /* ok */ }
    emetti("nuova", p);
  }
  function aggiornaPrenotazione(codice, campi) {
    memoria = prenotazioniUtente().map((p) => (p.codice === codice ? { ...p, ...campi } : p));
    try { window.localStorage.setItem(CHIAVE, JSON.stringify(memoria)); } catch (e) { /* ok */ }
    emetti("aggiornata", codice);
  }

  // ---------- prenotazioni d'esempio per il cruscotto ----------
  const NOMI = ["Rossi", "Bianchi", "Conti", "Bellini", "Moretti", "Galli", "Fontana", "Ricci", "Marino", "Greco", "Bruno", "Lombardi", "Barbieri", "Romano", "Colombo", "Mancini", "Esposito", "Costa", "Giordano", "Rinaldi", "Caruso", "Ferrara", "Testa", "Villa", "Pellegrini", "Martini", "Smith", "Müller", "Dubois", "Tanaka"];
  const NOTE = ["", "", "", "celiaco", "compleanno", "seggiolone", "senza lattosio", "anniversario", "", "tavolo vicino alla finestra", "vegetariana", ""];
  function esempiGiorno(dataK) {
    const r = rng("esempi|" + dataK);
    const out = [];
    const ore = ["19:30", "20:00", "20:30", "21:00", "21:30"];
    const adesso = new Date();
    const eOggi = dataK === chiave(oggi());
    TUTTI_TAVOLI.forEach((t) => {
      ore.forEach((ora) => {
        if (!occupato(dataK, ora, t.id)) return;
        // un tavolo occupato a un orario genera una prenotazione solo se non si sovrappone
        const minuti = toMin(ora);
        if (out.some((p) => p.tavolo === t.id && Math.abs(toMin(p.ora) - minuti) < 120)) return;
        const coperti = Math.max(minPosti(t), Math.min(maxPosti(t), Math.round(minPosti(t) + r() * (maxPosti(t) - minPosti(t)))));
        const esp = t.banco ? "chef" : r() < 0.18 ? "degustazione" : "carta";
        let stato;
        if (eOggi && toMin(ora) + 20 < adesso.getHours() * 60 + adesso.getMinutes()) stato = "arrivati";
        else stato = r() < 0.12 ? "attesa" : r() < 0.55 ? "promemoria" : "pagata";
        out.push({
          codice: "EX" + Math.floor(r() * 9000 + 1000),
          nome: NOMI[Math.floor(r() * NOMI.length)],
          coperti, data: dataK, ora, tavolo: t.id, area: t.area, esperienza: esp,
          note: NOTE[Math.floor(r() * NOTE.length)],
          caparra: stato === "attesa" ? 0 : ESPERIENZE[esp].caparra * coperti,
          stato, esempio: true
        });
      });
    });
    return out;
  }
  const toMin = (ora) => { const [h, m] = ora.split(":").map(Number); return h * 60 + m; };

  // ---------- eventi ----------
  const ascoltatori = {};
  function su(evento, fn) { (ascoltatori[evento] = ascoltatori[evento] || []).push(fn); }
  function emetti(evento, dato) { (ascoltatori[evento] || []).forEach((fn) => fn(dato)); }

  window.Lume = {
    rng, hash, chiave, daChiave, oggi, chiuso, euro, euroTondo, toMin, pad,
    fmtGiorno, fmtBreve, fmtMese,
    ORARI, AREE, TUTTI_TAVOLI, ESPERIENZE, adatto, minPosti, maxPosti,
    occupato, tavoliLiberi, statoOrario, statoGiorno,
    prenotazioniUtente, salvaPrenotazione, aggiornaPrenotazione, esempiGiorno,
    su, emetti,
    ridotto: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };
})();
