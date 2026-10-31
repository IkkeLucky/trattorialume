/* Trattoria Lume — la prenotazione.
   Comanda in 5 passi → SMS con link alla caparra sul telefono del cliente → pagamento
   simulato → scontrino, Google Calendar e promemoria automatici. Nessun dato lascia il browser. */
(function () {
  "use strict";
  const L = window.Lume;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const haGsap = typeof window.gsap !== "undefined";
  const anima = (fn) => { if (haGsap && !L.ridotto) fn(); };

  const PASSI = 5;
  const OGGI = L.oggi();

  // ---------- stato ----------
  function prossimoVenerdi() {
    const d = new Date(OGGI);
    do { d.setDate(d.getDate() + 1); } while (d.getDay() !== 5);
    return d;
  }
  function statoIniziale() {
    const d = prossimoVenerdi();
    const k = L.chiave(d);
    const preferiti = ["20:30", "21:00", "20:00", "21:30", "19:30", "22:00"];
    const ora = preferiti.find((o) => L.statoOrario(k, o, 2).stato !== "esaurito") || null;
    return {
      passo: 0, massimo: 0,
      coperti: 2, data: k, turno: "cena", ora,
      area: "sala", tavolo: null,
      esperienza: "carta",
      mese: new Date(d.getFullYear(), d.getMonth(), 1)
    };
  }
  let S = statoIniziale();
  let prenotazione = null; // l'ultima inviata

  // ---------- elementi ----------
  const form = $("#formPrenota");
  const passi = $$(".passo", form);
  const tabs = $$(".passo-tab");
  const btnAvanti = $("#avanti");
  const btnIndietro = $("#indietro");
  const sommario = $("#sommario");
  const calice = $("#caliceVino");
  const piantaMsg = $("#piantaMsg");

  // ---------- coperti ----------
  function setCoperti(n) {
    S.coperti = Math.max(1, Math.min(16, n));
    $("#coperti").textContent = S.coperti;
    if (S.tavolo) {
      const t = L.TUTTI_TAVOLI.find((x) => x.id === S.tavolo);
      if (!L.adatto(t, S.coperti)) { S.tavolo = null; piantaMsg.textContent = ""; }
    }
    disegnaCalendario();
    disegnaOrari();
    aggiorna();
  }
  $("#copertiMeno").addEventListener("click", () => setCoperti(S.coperti - 1));
  $("#copertiPiu").addEventListener("click", () => setCoperti(S.coperti + 1));

  // ---------- calendario ----------
  const meseMin = new Date(OGGI.getFullYear(), OGGI.getMonth(), 1);
  const meseMax = new Date(OGGI.getFullYear(), OGGI.getMonth() + 2, 1);
  function disegnaCalendario() {
    const griglia = $("#calendario");
    const m = S.mese;
    $("#meseNome").textContent = L.fmtMese.format(m);
    $("#mesePrima").disabled = m <= meseMin;
    $("#meseDopo").disabled = m >= meseMax;
    const vuoti = (m.getDay() + 6) % 7;
    const giorni = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    let html = "";
    for (let i = 0; i < vuoti; i++) html += "<span></span>";
    for (let g = 1; g <= giorni; g++) {
      const d = new Date(m.getFullYear(), m.getMonth(), g);
      const k = L.chiave(d);
      const passato = d < OGGI;
      const chiuso = L.chiuso(d);
      const disp = passato || chiuso ? "" : L.statoGiorno(k, S.coperti);
      const disabilitato = passato || chiuso || disp === "pieno";
      const cls = ["giorno",
        chiuso ? "giorno--chiuso" : "",
        +d === +OGGI ? "giorno--oggi" : "",
        disp === "pochi" ? "giorno--pochi" : disp === "libero" ? "giorno--libero" : "",
        k === S.data ? "giorno--scelto" : ""].join(" ");
      const lbl = `${L.fmtGiorno.format(d)}${chiuso ? ", chiuso" : disp === "pieno" ? ", al completo" : disp === "pochi" ? ", pochi posti" : ""}`;
      html += `<button type="button" class="${cls}" data-k="${k}" ${disabilitato ? "disabled" : ""} aria-pressed="${k === S.data}" aria-label="${lbl}">${g}</button>`;
    }
    griglia.innerHTML = html;
  }
  $("#calendario").addEventListener("click", (e) => {
    const b = e.target.closest(".giorno");
    if (!b || b.disabled) return;
    S.data = b.dataset.k;
    S.tavolo = null;
    piantaMsg.textContent = "";
    disegnaCalendario();
    disegnaOrari();
    aggiorna();
  });
  $("#mesePrima").addEventListener("click", () => { S.mese = new Date(S.mese.getFullYear(), S.mese.getMonth() - 1, 1); disegnaCalendario(); });
  $("#meseDopo").addEventListener("click", () => { S.mese = new Date(S.mese.getFullYear(), S.mese.getMonth() + 1, 1); disegnaCalendario(); });

  // ---------- turni e orari ----------
  $$(".turno").forEach((b) => b.addEventListener("click", () => {
    S.turno = b.dataset.turno;
    $$(".turno").forEach((x) => { x.classList.toggle("attivo", x === b); x.setAttribute("aria-selected", x === b); });
    if (S.ora && !L.ORARI[S.turno].includes(S.ora)) S.ora = null;
    disegnaOrari();
    aggiorna();
  }));
  function disegnaOrari() {
    const box = $("#orari");
    const oraPassata = (o) => S.data === L.chiave(OGGI) && L.toMin(o) <= new Date().getHours() * 60 + new Date().getMinutes() + 30;
    box.innerHTML = L.ORARI[S.turno].map((o) => {
      const st = L.statoOrario(S.data, o, S.coperti);
      const off = st.stato === "esaurito" || oraPassata(o);
      const nota = off ? "<small>esaurito</small>" : st.stato === "pochi" ? `<small>${st.liberi === 1 ? "ultimo tavolo" : "ultimi " + st.liberi}</small>` : "";
      return `<button type="button" class="orario${o === S.ora ? " attivo" : ""}" data-ora="${o}" ${off ? "disabled" : ""} aria-pressed="${o === S.ora}">${o}${nota}</button>`;
    }).join("");
    const scelto = box.querySelector(".orario.attivo");
    if (S.ora && (!scelto || scelto.disabled)) S.ora = null;
  }
  $("#orari").addEventListener("click", (e) => {
    const b = e.target.closest(".orario");
    if (!b || b.disabled) return;
    S.ora = b.dataset.ora;
    S.tavolo = null;
    piantaMsg.textContent = "";
    $$(".orario").forEach((x) => { x.classList.toggle("attivo", x === b); x.setAttribute("aria-pressed", x === b); });
    anima(() => gsap.fromTo(b, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: "back.out(3)" }));
    aggiorna();
  });

  // ---------- pianta della sala ----------
  $$(".area").forEach((b) => b.addEventListener("click", () => scegliArea(b.dataset.area)));
  function scegliArea(area) {
    S.area = area;
    $$(".area").forEach((x) => x.classList.toggle("attivo", x.dataset.area === area));
    disegnaPianta();
    aggiornaEsperienze();
  }
  function posizioniSedie(t) {
    const out = [];
    if (t.forma === "tondo") {
      for (let i = 0; i < t.posti; i++) {
        const a = (i / t.posti) * Math.PI * 2 - Math.PI / 2;
        out.push([50 + Math.cos(a) * 66, 50 + Math.sin(a) * 66]);
      }
    } else if (t.banco) {
      for (let i = 0; i < t.posti; i++) out.push([((i + 0.5) / t.posti) * 100, 150]);
    } else {
      const sopra = Math.ceil(t.posti / 2), sotto = t.posti - sopra;
      for (let i = 0; i < sopra; i++) out.push([((i + 0.5) / sopra) * 100, -22]);
      for (let i = 0; i < sotto; i++) out.push([((i + 0.5) / sotto) * 100, 122]);
    }
    return out;
  }
  function disegnaPianta() {
    const p = $("#pianta");
    const a = L.AREE[S.area];
    let html = a.elementi.map((el) => {
      if (el.tipo === "muro") return `<div class="pianta__muro" style="left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%"></div>`;
      if (el.tipo === "blocco") return `<div class="pianta__blocco" style="left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%"><span class="pianta__etichetta" style="position:static">${el.testo}</span></div>`;
      return `<span class="pianta__etichetta" style="left:${el.x}%;top:${el.y}%">${el.testo}</span>`;
    }).join("");
    html += a.tavoli.map((t) => {
      const occ = S.ora ? L.occupato(S.data, S.ora, t.id) : false;
      const ok = L.adatto({ ...t }, S.coperti);
      const off = occ || !ok;
      const motivo = occ ? `occupato alle ${S.ora}` : !ok ? (S.coperti > L.maxPosti(t) ? `troppo piccolo per ${S.coperti}` : `troppo grande per ${S.coperti}`) : "libero";
      const dim = t.forma === "tondo" ? `width:${t.w}%;aspect-ratio:1` : `width:${t.w}%;height:${t.h}%`;
      const sedie = posizioniSedie(t).map(([x, y]) => `<span class="sedia" style="left:calc(${x}% - 4.5px);top:calc(${y}% - 4.5px)"></span>`).join("");
      const etichetta = t.banco ? `Banco · ${t.posti} sgabelli` : t.id;
      return `<button type="button" class="tavolo tavolo--${t.forma}${t.id === S.tavolo ? " attivo" : ""}" data-id="${t.id}" style="left:${t.x}%;top:${t.y}%;${dim}" ${off ? "disabled" : ""} aria-pressed="${t.id === S.tavolo}" aria-label="Tavolo ${t.id}, ${t.posti} posti, ${motivo}" title="${t.id} · ${t.posti} posti · ${motivo}">${sedie}<span>${etichetta}</span></button>`;
    }).join("");
    p.innerHTML = html;
    const liberi = a.tavoli.filter((t) => !(S.ora && L.occupato(S.data, S.ora, t.id)) && L.adatto(t, S.coperti));
    if (!S.tavolo && liberi.length === 0) {
      piantaMsg.textContent = `In ${a.nome} non c'è posto per ${S.coperti} alle ${S.ora}. Prova un'altra sala.`;
    } else if (!S.tavolo) {
      piantaMsg.textContent = "";
    }
    anima(() => gsap.from($$(".tavolo", p), { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.04, ease: "back.out(2)", clearProps: "opacity,scale" }));
  }
  $("#pianta").addEventListener("click", (e) => {
    const b = e.target.closest(".tavolo");
    if (!b || b.disabled) return;
    scegliTavolo(b.dataset.id, false);
  });
  function scegliTavolo(id, daNoi) {
    const t = L.TUTTI_TAVOLI.find((x) => x.id === id);
    S.tavolo = id;
    if (t.area !== S.area) scegliArea(t.area);
    else $$(".tavolo").forEach((x) => { x.classList.toggle("attivo", x.dataset.id === id); x.setAttribute("aria-pressed", x.dataset.id === id); });
    const area = L.AREE[t.area].nome;
    piantaMsg.textContent = t.banco
      ? `Segnati ${S.coperti} ${S.coperti === 1 ? "sgabello" : "sgabelli"} al banco, davanti alla chef.`
      : daNoi ? `Vi teniamo il tavolo ${id} in ${area}, ${t.posti} posti.` : `Tavolo ${id}, ${t.posti} posti. Segnato!`;
    if (t.banco && S.esperienza === "carta") { /* il banco resta alla carta se preferite */ }
    aggiornaEsperienze();
    aggiorna();
  }
  $("#sceglieteVoi").addEventListener("click", () => {
    const qui = L.tavoliLiberi(S.data, S.ora, S.coperti, S.area);
    const ovunque = L.tavoliLiberi(S.data, S.ora, S.coperti);
    const pool = qui.length ? qui : ovunque.filter((t) => !t.banco);
    if (!pool.length) { piantaMsg.textContent = `Alle ${S.ora} non ci sono tavoli per ${S.coperti}. Torna indietro e prova un altro orario.`; return; }
    pool.sort((a, b) => (a.posti - S.coperti) - (b.posti - S.coperti));
    scegliTavolo(pool[0].id, true);
  });

  // ---------- esperienza ----------
  function aggiornaEsperienze() {
    const chef = $('input[name="esperienza"][value="chef"]');
    const alBanco = S.tavolo ? L.TUTTI_TAVOLI.find((t) => t.id === S.tavolo).banco : S.area === "banco";
    chef.disabled = !alBanco;
    if (!alBanco && S.esperienza === "chef") {
      S.esperienza = "carta";
      $('input[name="esperienza"][value="carta"]').checked = true;
    }
  }
  $("#esperienze").addEventListener("change", (e) => { S.esperienza = e.target.value; aggiorna(); });

  // ---------- validazione dati ----------
  const soloCifre = (s) => s.replace(/\D/g, "");
  function valida(mostra) {
    const nome = $("#nome").value.trim();
    const tel = soloCifre($("#tel").value);
    const email = $("#email").value.trim();
    const errori = {
      nome: nome.length < 2,
      tel: !/^3\d{8,9}$/.test(tel),
      email: email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    };
    if (mostra) Object.entries(errori).forEach(([k, v]) => {
      const campo = $(`#${k}`).closest(".campo");
      campo.classList.toggle("non-valido", v);
      $(`#${k}`).setAttribute("aria-invalid", v);
    });
    return !Object.values(errori).some(Boolean);
  }
  ["nome", "tel", "email"].forEach((id) => $("#" + id).addEventListener("input", () => {
    const campo = $("#" + id).closest(".campo");
    if (campo.classList.contains("non-valido")) valida(true);
    aggiorna();
  }));

  // ---------- testi di riepilogo ----------
  const dataLunga = () => L.fmtGiorno.format(L.daChiave(S.data));
  const caparraTot = () => L.ESPERIENZE[S.esperienza].caparra * S.coperti;
  function occasioni() { return $$("#occasioni input:checked").map((i) => i.value); }
  function descrTavolo() {
    if (!S.tavolo) return "—";
    const t = L.TUTTI_TAVOLI.find((x) => x.id === S.tavolo);
    return t.banco ? "Banco dello Chef" : `Tavolo ${t.id} · ${L.AREE[t.area].nome}`;
  }
  function riepilogo() {
    const righe = [
      ["Quando", `${dataLunga()}, ${S.ora}`],
      ["Coperti", S.coperti],
      ["Dove", descrTavolo()],
      ["Menu", L.ESPERIENZE[S.esperienza].nome],
      ["Occasione", occasioni().join(", ") || "—"],
      ["Allergie", $("#allergie").value.trim() || "nessuna"],
      ["Nome", $("#nome").value.trim()],
      ["Cellulare", "+39 " + $("#tel").value.trim()]
    ];
    $("#riepilogo").innerHTML = righe.map(([a, b]) => `<dt>${a}</dt><dd>${esc(String(b))}</dd>`).join("");
    const euro = L.euro(caparraTot());
    $("#caparraTot").textContent = `${euro} (${S.coperti} × ${L.euro(L.ESPERIENZE[S.esperienza].caparra)})`;
  }
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- navigazione tra i passi ----------
  function passoValido(i) {
    if (i === 0) return !!S.ora;
    if (i === 1) return !!S.tavolo;
    if (i === 3) return valida(false);
    return true;
  }
  function suggerimento() {
    if (S.passo === 0) return S.ora ? `${S.coperti} coperti · ${L.fmtBreve.format(L.daChiave(S.data))} · ${S.ora}` : "Scegli un orario libero";
    if (S.passo === 1) return S.tavolo ? `${descrTavolo()}` : "Tocca un tavolo libero, o lascia scegliere a noi";
    if (S.passo === 2) return `Caparra ${L.euro(caparraTot())}, scalata dal conto`;
    if (S.passo === 3) return passoValido(3) ? "Ti mandiamo l'SMS a questo numero" : "Mancano nome o cellulare";
    return "Controlla e invia";
  }
  function aggiorna() {
    passi.forEach((p, i) => p.classList.toggle("attivo", i === S.passo));
    tabs.forEach((t, i) => {
      t.classList.toggle("attivo", i === S.passo);
      t.classList.toggle("fatto", i < S.passo || (i <= S.massimo && i !== S.passo));
      t.setAttribute("aria-current", i === S.passo ? "step" : "false");
    });
    btnIndietro.hidden = S.passo === 0;
    btnAvanti.textContent = S.passo === PASSI - 1 ? "Invia e ricevi l'SMS" : "Avanti";
    btnAvanti.disabled = S.passo !== 3 && !passoValido(S.passo);
    sommario.textContent = suggerimento();
    calice.style.setProperty("--pieno", `${12 + (S.passo / (PASSI - 1)) * 62}%`);
    if (S.passo === PASSI - 1) riepilogo();
  }
  function vai(i) {
    if (i === S.passo) return;
    const avanti = i > S.passo;
    S.passo = i;
    S.massimo = Math.max(S.massimo, i);
    if (i === 1) disegnaPianta();
    if (i === 2) aggiornaEsperienze();
    aggiorna();
    anima(() => gsap.from(passi[i], { x: avanti ? 30 : -30, opacity: 0, duration: 0.5, ease: "power3.out", clearProps: "all" }));
    const c = $("#comanda");
    if (c.getBoundingClientRect().top < 0) L.scrollA && L.scrollA(c, -90);
  }
  tabs.forEach((t, i) => t.addEventListener("click", () => { if (i <= S.massimo && i !== S.passo) vai(i); }));
  btnIndietro.addEventListener("click", () => vai(S.passo - 1));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (S.passo === 3 && !valida(true)) {
      const primo = $(".campo.non-valido input", form);
      if (primo) primo.focus();
      aggiorna();
      return;
    }
    if (!passoValido(S.passo)) return;
    if (S.passo < PASSI - 1) vai(S.passo + 1);
    else invia();
  });

  // ---------- invio: parte l'SMS ----------
  const ALFABETO = "ACDEFHJKMNPQRTUVWXY3479";
  function nuovoCodice() {
    let c = "";
    for (let i = 0; i < 4; i++) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    return c;
  }
  function invia() {
    const t = L.TUTTI_TAVOLI.find((x) => x.id === S.tavolo);
    prenotazione = {
      codice: nuovoCodice(),
      nome: $("#nome").value.trim(),
      tel: $("#tel").value.trim(),
      email: $("#email").value.trim(),
      coperti: S.coperti, data: S.data, ora: S.ora,
      tavolo: S.tavolo, area: t.area,
      esperienza: S.esperienza,
      occasioni: occasioni(),
      note: [occasioni().join(", "), $("#allergie").value.trim(), $("#note").value.trim()].filter(Boolean).join(" · "),
      caparra: caparraTot(),
      sms: $("#consensoSms").checked,
      calendario: $("#consensoCal").checked,
      stato: "attesa",
      creata: Date.now()
    };
    L.salvaPrenotazione(prenotazione);
    btnAvanti.disabled = true;
    btnAvanti.textContent = "Inviata";
    sommario.textContent = "SMS in arrivo sul telefono…";
    calice.style.setProperty("--pieno", "80%");
    $("#telHint").textContent = "SMS appena arrivato. Toccalo, poi tocca il link per pagare la caparra.";
    Tel.notifica({
      tipo: "sms", titolo: "Trattoria Lume", ora: "adesso",
      testo: `Ciao ${primoNome()}! Il tavolo per ${S.coperti} è riservato. Conferma con la caparra…`,
      apri: "sms"
    });
    Tel.sms(`Ciao ${esc(primoNome())}! Il tavolo per ${S.coperti} è riservato per ${dataLunga()} alle ${S.ora} (${esc(descrTavolo())}). Per confermarlo versa la caparra di ${L.euro(prenotazione.caparra)} entro 30 minuti: <button type="button" class="bolla__link" data-apri="paga">lume.to/c/${prenotazione.codice}</button><br>Rimborsabile fino a 24 ore prima.`, 900);
    avvisaMobile();
    setTimeout(() => Tel.apri("sms"), 2200);
  }
  const primoNome = () => (prenotazione?.nome || $("#nome").value).trim().split(/\s+/)[0] || "";

  // ---------- il telefono ----------
  const Tel = (function () {
    const tel = $("#telefono");
    const thread = $("#smsThread");
    const notifiche = $("#notifiche");
    const risposte = $("#smsRisposte");
    function apri(nome) {
      $$(".schermata", tel).forEach((s) => s.classList.toggle("attiva", s.dataset.schermata === nome));
      if (nome === "paga") preparaPagamento();
    }
    function notifica({ tipo, titolo, testo, ora, apri: dove }) {
      $("#notificheVuoto")?.remove();
      const n = document.createElement("button");
      n.type = "button";
      n.className = "notifica";
      const icona = tipo === "sms" ? '<span class="notifica__icona notifica__icona--sms">SMS</span>'
        : tipo === "cal" ? `<span class="notifica__icona notifica__icona--cal">${L.daChiave(prenotazione.data).getDate()}</span>`
        : '<span class="notifica__icona notifica__icona--lume">L</span>';
      n.innerHTML = `${icona}<span class="notifica__titolo">${esc(titolo)}</span><span class="notifica__ora">${ora}</span><span class="notifica__testo">${esc(testo)}</span>`;
      if (dove) n.addEventListener("click", () => apri(dove));
      notifiche.prepend(n);
      apri("blocco");
      anima(() => gsap.from(n, { y: -60, opacity: 0, scale: 0.9, duration: 0.7, ease: "back.out(1.6)" }));
      tel.animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px) rotate(-.4deg)" }, { transform: "translateX(3px) rotate(.4deg)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], { duration: 380, iterations: 2 });
    }
    function sms(html, attesa = 600, verso = "in") {
      if (verso === "out") {
        aggiungiBolla(html, "out");
        return Promise.resolve();
      }
      const dig = document.createElement("div");
      dig.className = "bolla bolla--in digita";
      dig.innerHTML = "<span></span><span></span><span></span>";
      thread.appendChild(dig);
      thread.scrollTop = thread.scrollHeight;
      return new Promise((ok) => setTimeout(() => { dig.remove(); aggiungiBolla(html, "in"); ok(); }, attesa));
    }
    function aggiungiBolla(html, verso) {
      if (!thread.children.length || thread.dataset.ultimaOra !== orologio()) {
        const o = document.createElement("p");
        o.className = "bolla__ora";
        o.textContent = "Oggi " + orologio();
        thread.appendChild(o);
        thread.dataset.ultimaOra = orologio();
      }
      const b = document.createElement("div");
      b.className = `bolla bolla--${verso}`;
      b.innerHTML = html;
      thread.appendChild(b);
      thread.scrollTop = thread.scrollHeight;
      anima(() => gsap.from(b, { y: 12, opacity: 0, scale: 0.94, transformOrigin: verso === "in" ? "0 100%" : "100% 100%", duration: 0.4, ease: "back.out(2)" }));
    }
    function risposteRapide(opzioni) {
      risposte.innerHTML = opzioni.map((o, i) => `<button type="button" data-i="${i}">${esc(o.testo)}</button>`).join("");
      $$("button", risposte).forEach((b) => b.addEventListener("click", () => { risposte.innerHTML = ""; opzioni[b.dataset.i].fai(); }));
    }
    function svuota() {
      thread.innerHTML = "";
      risposte.innerHTML = "";
      notifiche.innerHTML = '<p class="notifiche__vuoto" id="notificheVuoto">Qui compare quello che riceve il cliente: SMS, caparra, calendario e promemoria.</p>';
      apri("blocco");
    }
    tel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-apri]");
      if (b) apri(b.dataset.apri);
    });
    return { apri, notifica, sms, risposteRapide, svuota };
  })();

  function orologio() {
    const d = new Date();
    return `${L.pad(d.getHours())}:${L.pad(d.getMinutes())}`;
  }
  function tick() {
    $("#oraTel").textContent = orologio();
    $("#bloccoOra").textContent = orologio();
    $("#bloccoData").textContent = L.fmtGiorno.format(new Date());
  }
  tick();
  setInterval(tick, 20000);

  // ---------- pagamento simulato ----------
  function preparaPagamento() {
    if (!prenotazione) return;
    const d = L.fmtBreve.format(L.daChiave(prenotazione.data));
    $("#pagaCodice").textContent = prenotazione.codice;
    $("#pagaCosa").textContent = `Caparra · ${prenotazione.coperti} coperti · ${d}, ${prenotazione.ora}`;
    $("#pagaImporto").textContent = L.euro(prenotazione.caparra);
    const btn = $("#pagaBtn");
    btn.textContent = `Paga ${L.euro(prenotazione.caparra)}`;
    btn.disabled = prenotazione.stato !== "attesa";
    $("#pagaEsito").hidden = prenotazione.stato === "attesa";
    $("#telHint").textContent = "Scegli il metodo e paga: è una simulazione, nessun addebito.";
  }
  $("#pagaBtn").addEventListener("click", () => {
    const btn = $("#pagaBtn");
    if (!prenotazione || prenotazione.stato !== "attesa") return;
    btn.classList.add("carica");
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove("carica");
      $("#pagaEsito").hidden = false;
      prenotazione.stato = "pagata";
      prenotazione.metodo = $('input[name="metodo"]:checked').closest(".metodo").textContent.trim();
      L.aggiornaPrenotazione(prenotazione.codice, { stato: "pagata", metodo: prenotazione.metodo });
      setTimeout(dopoPagamento, 1300);
    }, 1500);
  });

  function dopoPagamento() {
    const p = prenotazione;
    const giorno = L.fmtBreve.format(L.daChiave(p.data));
    Tel.apri("blocco");
    Tel.notifica({ tipo: "lume", titolo: "Trattoria Lume", ora: "adesso", testo: `Caparra di ${L.euro(p.caparra)} ricevuta. Tavolo confermato, a ${giorno.split(" ")[0]}!`, apri: "sms" });
    if (p.calendario) setTimeout(() => Tel.notifica({ tipo: "cal", titolo: "Google Calendar", ora: "adesso", testo: `Cena da Trattoria Lume · ${giorno}, ${p.ora}–${fineOra(p)}` }), 1100);
    Tel.sms(`Caparra ricevuta, grazie ${esc(primoNome())}! Il tavolo è confermato. ${p.sms ? "Ti scriviamo il giorno prima." : ""}`, 700);
    $("#telHint").textContent = "Fatto. Prova il promemoria automatico dal pulsante sotto lo scontrino.";
    $("#avvisoSms").hidden = true;
    stampaScontrino();
  }
  const fineOra = (p) => { const m = L.toMin(p.ora) + L.ESPERIENZE[p.esperienza].durata; return `${L.pad(Math.floor(m / 60) % 24)}:${L.pad(m % 60)}`; };

  // ---------- scontrino, calendario e promemoria ----------
  function stampaScontrino() {
    const p = prenotazione;
    const d = L.daChiave(p.data);
    const unit = L.ESPERIENZE[p.esperienza].caparra;
    const ora = new Date();
    const riga = (a, b, cls = "") => `<div class="scontrino__riga ${cls}"><span>${a}</span><span>${b}</span></div>`;
    $("#scontrinoRighe").innerHTML =
      riga("Data", L.fmtBreve.format(d)) +
      riga("Ora", p.ora) +
      riga("Coperti", p.coperti) +
      riga("Tavolo", p.tavolo === "B1" ? "Banco" : p.tavolo) +
      riga(L.ESPERIENZE[p.esperienza].nome.replace(/[«»]/g, ""), "") +
      riga(`Caparra ${p.coperti} × ${unit.toFixed(2).replace(".", ",")}`, (p.caparra).toFixed(2).replace(".", ",")) +
      riga("Totale versato", L.euro(p.caparra), "scontrino__riga--tot") +
      riga("Metodo", esc(p.metodo || "Carta")) +
      riga("Codice", "LUME-" + p.codice) +
      riga(`${L.pad(ora.getDate())}/${L.pad(ora.getMonth() + 1)}/${ora.getFullYear()}`, orologio());
    // codice a barre generato dal codice prenotazione
    const r = L.rng(p.codice);
    let x = 0, stops = [];
    while (x < 100) {
      const w = 0.6 + r() * 1.8, g = 0.5 + r() * 1.4;
      stops.push(`var(--inchiostro) ${x.toFixed(2)}% ${(x + w).toFixed(2)}%`, `transparent ${(x + w).toFixed(2)}% ${(x + w + g).toFixed(2)}%`);
      x += w + g;
    }
    $("#scontrinoCodice").style.background = `linear-gradient(90deg, ${stops.join(",")})`;

    // google calendar: link reale, si apre in una nuova scheda
    const gc = (dd, hhmm) => `${dd.getFullYear()}${L.pad(dd.getMonth() + 1)}${L.pad(dd.getDate())}T${hhmm.replace(":", "")}00`;
    const fine = fineOra(p);
    const dettagli = `Prenotazione LUME-${p.codice}\n${p.coperti} coperti · ${descrTavolo()}\nMenu: ${L.ESPERIENZE[p.esperienza].nome}\nCaparra versata: ${L.euro(p.caparra)}\n(Demo di prenotazione: ristorante immaginario)`;
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent("Cena da Trattoria Lume")
      + "&dates=" + gc(d, p.ora) + "/" + gc(d, fine)
      + "&ctz=Europe/Rome"
      + "&details=" + encodeURIComponent(dettagli)
      + "&location=" + encodeURIComponent("Via dei Serragli 41r, 50124 Firenze");
    $("#gcalLink").href = url;
    $("#syncGiorno").textContent = d.getDate();
    $("#syncMese").textContent = new Intl.DateTimeFormat("it-IT", { month: "short" }).format(d).toUpperCase().replace(".", "");
    $("#syncTitolo").textContent = p.calendario ? "Google Calendar sincronizzato" : "Nel calendario della sala";
    $("#syncTesto").textContent = p.calendario
      ? `Evento creato alle ${orologio()} nel calendario della sala e nel tuo.`
      : `Evento creato nel calendario della sala. Puoi aggiungerlo anche al tuo.`;

    // promemoria programmati
    const ieri = new Date(d); ieri.setDate(d.getDate() - 1);
    const dopo = new Date(d); dopo.setDate(d.getDate() + 1);
    const tre = L.toMin(p.ora) - 180;
    const canale = p.sms ? "SMS" : "Email";
    const voci = [
      { quando: "Adesso", cosa: "SMS di conferma e caparra ricevuta", fatto: true },
      { quando: `${L.fmtGiorno.format(ieri)}, ${p.ora}`, cosa: `${canale} promemoria: rispondi 1 per confermare, 2 per disdire`, id: "pm24" },
      { quando: `${L.fmtGiorno.format(d)}, ${L.pad(Math.floor(tre / 60))}:${L.pad(tre % 60)}`, cosa: `${canale} «Vi aspettiamo» con le indicazioni per arrivare` },
      { quando: `${L.fmtGiorno.format(dopo)}, 11:00`, cosa: "Grazie e richiesta di recensione" }
    ];
    $("#promemoria").innerHTML = voci.map((v) => `<li class="${v.fatto ? "fatto" : ""}" ${v.id ? `id="${v.id}"` : ""}><b>${v.quando}</b><span>${v.cosa}</span></li>`).join("");

    form.hidden = true;
    $("#passi").hidden = true;
    const area = $("#scontrinoArea");
    area.hidden = false;
    calice.style.setProperty("--pieno", "100%");
    $("#comandaN").textContent = String(Number($("#comandaN").textContent) + 1).padStart(4, "0");
    $("#simulaPromemoria").disabled = false;
    anima(() => {
      gsap.fromTo("#scontrino", { clipPath: "inset(0 0 100% 0)", y: -16 }, { clipPath: "inset(0 0 0% 0)", y: 0, duration: 1.8, ease: "steps(18)" });
      gsap.from(".dopo > *", { y: 20, opacity: 0, stagger: 0.12, duration: 0.7, delay: 0.9, ease: "power3.out" });
      gsap.from(".promemoria li", { x: -12, opacity: 0, stagger: 0.12, duration: 0.5, delay: 1.3 });
    });
  }

  // ---------- il promemoria del giorno prima (simulato) ----------
  $("#simulaPromemoria").addEventListener("click", () => {
    if (!prenotazione) return;
    const p = prenotazione;
    $("#simulaPromemoria").disabled = true;
    Tel.notifica({ tipo: "sms", titolo: "Trattoria Lume", ora: "domani, " + p.ora, testo: `Domani alle ${p.ora} vi aspettiamo. Rispondi 1 per confermare, 2 per disdire.`, apri: "sms" });
    L.aggiornaPrenotazione(p.codice, { stato: "promemoria" });
    $("#pm24")?.classList.add("fatto");
    $("#telHint").textContent = "Promemoria arrivato: rispondi dal telefono.";
    setTimeout(() => Tel.apri("sms"), 1200);
    Tel.sms(`Ciao ${esc(primoNome())}, domani alle ${p.ora} vi aspettiamo in via dei Serragli: ${p.coperti} coperti, ${esc(descrTavolo())}.<br>Rispondi <b>1</b> per confermare o <b>2</b> per disdire.`, 1400).then(() => {
      Tel.risposteRapide([
        { testo: "1 · Confermo", fai: () => { Tel.sms("1", 0, "out"); Tel.sms("Perfetto, a domani! La caparra sarà scalata dal conto.", 900); L.aggiornaPrenotazione(p.codice, { stato: "confermata" }); $("#telHint").textContent = "Confermato. Lo stato si aggiorna anche lato ristorante."; } },
        { testo: "2 · Disdico", fai: () => { Tel.sms("2", 0, "out"); Tel.sms(`Peccato! Abbiamo liberato il tavolo. La caparra di ${L.euro(p.caparra)} torna sul tuo metodo di pagamento entro 3 giorni.`, 900); L.aggiornaPrenotazione(p.codice, { stato: "disdetta" }); $("#telHint").textContent = "Disdetta: il tavolo torna libero e la caparra viene rimborsata."; } }
      ]);
    });
  });

  // ---------- nuova prenotazione ----------
  $("#nuovaPrenotazione").addEventListener("click", () => {
    prenotazione = null;
    S = statoIniziale();
    form.hidden = false;
    form.reset();
    $("#passi").hidden = false;
    $("#scontrinoArea").hidden = true;
    $("#coperti").textContent = S.coperti;
    $$(".turno").forEach((x) => { const on = x.dataset.turno === S.turno; x.classList.toggle("attivo", on); x.setAttribute("aria-selected", on); });
    $$(".campo.non-valido").forEach((c) => c.classList.remove("non-valido"));
    piantaMsg.textContent = "";
    scegliArea("sala");
    Tel.svuota();
    $("#telHint").textContent = "Completa la comanda: l'SMS arriva qui.";
    disegnaCalendario();
    disegnaOrari();
    aggiorna();
    L.scrollA && L.scrollA("#comanda", -90);
  });

  // ---------- avviso su mobile quando arriva l'SMS ----------
  function avvisaMobile() {
    if (window.innerWidth > 920) return;
    const r = $("#telefono").getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    $("#avvisoSms").hidden = false;
    anima(() => gsap.from("#avvisoSms", { y: 80, opacity: 0, duration: 0.6, ease: "back.out(1.5)" }));
  }
  $("#avvisoVai").addEventListener("click", () => { $("#avvisoSms").hidden = true; L.scrollA && L.scrollA("#telefono", -60); });

  // ---------- scelte che arrivano da altre sezioni ----------
  L.su("scegliArea", (area) => {
    if (area === "cantina" && S.coperti < 8) setCoperti(8);
    if (area !== "cantina" && S.coperti > 6 && area !== "sala") setCoperti(4);
    scegliArea(area);
    S.tavolo = null;
    sommario.textContent = `Sala scelta: ${L.AREE[area].nome}. Prima scegli giorno e ora.`;
  });
  L.su("scegliEsperienza", (esp) => {
    S.esperienza = esp;
    const r = $(`input[name="esperienza"][value="${esp}"]`);
    if (r && !r.disabled) r.checked = true;
  });

  // ---------- avvio ----------
  disegnaCalendario();
  disegnaOrari();
  aggiorna();
})();
