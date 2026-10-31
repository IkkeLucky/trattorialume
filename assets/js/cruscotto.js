/* Trattoria Lume — il cruscotto della sala (vista del ristoratore).
   Mostra le prenotazioni d'esempio del giorno più quelle fatte nella demo,
   con stato della caparra, promemoria e occupazione dei tavoli. */
(function () {
  "use strict";
  const L = window.Lume;
  const $ = (s, c = document) => c.querySelector(s);
  const haGsap = typeof window.gsap !== "undefined";

  let giorno = L.oggi();
  if (L.chiuso(giorno)) giorno.setDate(giorno.getDate() + 1);
  let ultimaSync = Date.now();
  let evidenzia = null;

  const ETICHETTE = {
    pagata: "Caparra pagata",
    promemoria: "Promemoria inviato",
    attesa: "Attende caparra",
    arrivati: "Al tavolo",
    confermata: "Confermata",
    disdetta: "Disdetta"
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function prenotazioniDel(k) {
    const mie = L.prenotazioniUtente().filter((p) => p.data === k);
    return L.esempiGiorno(k).concat(mie).sort((a, b) => L.toMin(a.ora) - L.toMin(b.ora));
  }

  function disegna() {
    const k = L.chiave(giorno);
    $("#cDataNome").textContent = L.fmtGiorno.format(giorno);
    $("#cDataPrima").disabled = giorno <= L.oggi();
    const tutte = prenotazioniDel(k);
    const attive = tutte.filter((p) => p.stato !== "disdetta");

    // indicatori
    const coperti = attive.reduce((s, p) => s + p.coperti, 0);
    $("#kCoperti").textContent = coperti;
    $("#kCopertiMax").textContent = "/ 96 su due giri";
    $("#kCopertiBarra").style.width = Math.min(100, (coperti / 96) * 100) + "%";
    const incassate = attive.filter((p) => p.stato !== "attesa").reduce((s, p) => s + (p.caparra || 0), 0);
    $("#kCaparre").textContent = L.euroTondo(incassate);

    // elenco
    const ul = $("#elencoPrenotazioni");
    if (L.chiuso(giorno)) {
      ul.innerHTML = '<li class="voce"><span class="voce__ora">—</span><span class="voce__nome">Lunedì chiuso</span><span class="voce__det">Nessuna prenotazione possibile</span></li>';
    } else {
      ul.innerHTML = tutte.map((p) => {
        const nuova = !p.esempio;
        const det = [`${p.coperti} pers.`, p.tavolo === "B1" ? "banco" : p.tavolo, p.note].filter(Boolean).join(" · ");
        return `<li class="voce${nuova && p.codice === evidenzia ? " voce--nuova" : ""}" data-codice="${p.codice}">
          <span class="voce__ora">${p.ora}</span>
          <span class="voce__nome">${esc(p.nome)}${nuova ? '<span class="tag-nuova">DEMO</span>' : ""}</span>
          <span class="voce__det">${esc(det)}</span>
          <span class="stato stato--${p.stato}">${ETICHETTE[p.stato] || p.stato}</span>
        </li>`;
      }).join("");
      const nuovo = ul.querySelector(".voce--nuova");
      if (nuovo) ul.scrollTop = nuovo.offsetTop - ul.offsetTop - 60;
    }

    // linea del tempo dei tavoli
    const mie = tutte.filter((p) => !p.esempio);
    const pranzo = mie.length && L.toMin(mie[mie.length - 1].ora) < 17 * 60 && mie.every((p) => L.toMin(p.ora) < 17 * 60);
    const inizio = pranzo ? 12 * 60 : 19 * 60;
    const span = 270; // 4 ore e mezza
    const colonne = span / 30;
    $("#tlTurno").textContent = pranzo ? "pranzo" : "cena";
    const tl = $("#timeline");
    tl.style.setProperty("--colonne", colonne);
    let html = "<span></span>";
    for (let i = 0; i < colonne; i++) {
      const m = inizio + i * 30;
      html += `<span class="tl__ora">${L.pad(Math.floor(m / 60))}:${L.pad(m % 60)}</span>`;
    }
    L.TUTTI_TAVOLI.forEach((t) => {
      html += `<span class="tl__tavolo">${t.banco ? "Banco" : t.id}</span><div class="tl__corsia">`;
      tutte.filter((p) => p.tavolo === t.id && p.stato !== "disdetta").forEach((p) => {
        const da = L.toMin(p.ora) - inizio;
        const durata = L.ESPERIENZE[p.esperienza].durata;
        if (da + durata <= 0 || da >= span) return;
        const left = Math.max(0, (da / span) * 100);
        const width = Math.min(100 - left, (durata / span) * 100);
        const cls = !p.esempio ? "nuova" : p.stato;
        html += `<span class="tl__blocco tl__blocco--${cls}" style="left:${left}%;width:${width}%" title="${esc(p.nome)} · ${p.coperti} pers. · ${p.ora}">${esc(p.nome)} · ${p.coperti}</span>`;
      });
      html += "</div>";
    });
    tl.innerHTML = html;
  }

  function aggiornaSync() {
    const s = Math.round((Date.now() - ultimaSync) / 1000);
    $("#syncFa").textContent = s < 50 ? "ora" : `${Math.round(s / 60)} min fa`;
  }
  setInterval(aggiornaSync, 15000);

  $("#cDataPrima").addEventListener("click", () => { giorno.setDate(giorno.getDate() - 1); disegna(); });
  $("#cDataDopo").addEventListener("click", () => { giorno.setDate(giorno.getDate() + 1); disegna(); });

  L.su("nuova", (p) => {
    giorno = L.daChiave(p.data);
    evidenzia = p.codice;
    ultimaSync = Date.now();
    aggiornaSync();
    disegna();
  });
  L.su("aggiornata", (codice) => {
    evidenzia = codice;
    ultimaSync = Date.now();
    aggiornaSync();
    disegna();
    const v = document.querySelector(`.voce[data-codice="${codice}"] .stato`);
    if (v && haGsap && !L.ridotto) gsap.fromTo(v, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: "back.out(3)" });
  });

  disegna();
})();
