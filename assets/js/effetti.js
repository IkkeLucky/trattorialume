/* Trattoria Lume — effetti e movimento.
   Candela che segue il cursore nell'hero, lavagna scorrevole che accelera con lo scroll,
   piatti che girano mentre arrivano in tavola, foto delle sale che seguono il cursore,
   titolo del vino che si riempie come un calice. */
(function () {
  "use strict";
  const L = window.Lume;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const haGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const ridotto = L.ridotto;
  const puntatoreFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- grana pellicola (generata, nessuna immagine esterna) ----------
  (function grana() {
    const el = $(".grana");
    if (!el || ridotto) return;
    const c = document.createElement("canvas");
    c.width = c.height = 180;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    el.style.backgroundImage = `url(${c.toDataURL("image/png")})`;
  })();

  // ---------- testi del giorno ----------
  (function testiDelGiorno() {
    const d = L.oggi();
    const k = L.chiave(d);
    const data = $("#lavagnaData");
    if (data) data.textContent = "Fuori carta · " + L.fmtGiorno.format(d);
    const stato = $("#statoSeraTesto");
    if (!stato) return;
    if (L.chiuso(d)) {
      stato.textContent = "Oggi siamo chiusi · domani dalle 12:30";
      return;
    }
    const ore = L.ORARI.cena;
    const ora = ore.find((o) => L.tavoliLiberi(k, o, 2).length > 0);
    if (!ora) { stato.textContent = "Stasera al completo · prenota per domani"; return; }
    const n = L.tavoliLiberi(k, ora, 2).length;
    stato.textContent = `Stasera: ${n} ${n === 1 ? "tavolo libero" : "tavoli liberi"} dalle ${ora}`;
  })();

  // ---------- divisione dei titoli in righe animabili ----------
  $$("[data-split] .riga").forEach((r) => {
    const s = document.createElement("span");
    s.className = "riga__in";
    while (r.firstChild) s.appendChild(r.firstChild);
    r.appendChild(s);
  });

  // ---------- menu mobile ----------
  const burger = $("#burger");
  const menuM = $("#menuMobile");
  function chiudiMenu() {
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Apri il menu");
    menuM.hidden = true;
    document.body.classList.remove("bloccato");
    if (lenis) lenis.start();
  }
  burger.addEventListener("click", () => {
    const aperto = burger.getAttribute("aria-expanded") === "true";
    if (aperto) return chiudiMenu();
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Chiudi il menu");
    menuM.hidden = false;
    document.body.classList.add("bloccato");
    if (lenis) lenis.stop();
    if (haGsap && !ridotto) gsap.from($$("a", menuM), { yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.6, ease: "power3.out" });
  });

  // ---------- scroll morbido ----------
  let lenis = null;
  if (!ridotto && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
    if (haGsap) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  L.scrollA = function (target, offset = -80) {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: ridotto ? "auto" : "smooth" });
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    if (!menuM.hidden) chiudiMenu();
    if (a.dataset.esperienza) L.emetti("scegliEsperienza", a.dataset.esperienza);
    L.scrollA(el, id === "#top" ? 0 : -70);
  });

  // ---------- barra di navigazione ----------
  const nav = $("#nav");
  let ultimoY = 0;
  function suScroll() {
    const y = window.scrollY;
    nav.classList.toggle("nav--solida", y > 60);
    const giu = y > ultimoY;
    nav.classList.toggle("nav--nascosta", giu && y > 500 && menuM.hidden);
    ultimoY = y;
  }
  window.addEventListener("scroll", suScroll, { passive: true });
  suScroll();

  // ---------- la candela nell'hero ----------
  (function candela() {
    const buio = $("#heroBuio");
    const hero = $("#hero");
    if (!buio || ridotto) return;
    let tx = 62, ty = 42, x = 62, y = 42, visibile = true, mossoIl = 0;
    const base = () => Math.max(180, Math.min(window.innerWidth, 1400) * 0.22);
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      mossoIl = performance.now();
    });
    new IntersectionObserver(([en]) => { visibile = en.isIntersecting; }).observe(hero);
    function giro(t) {
      requestAnimationFrame(giro);
      if (!visibile) return;
      const s = t / 1000;
      if (!puntatoreFine || t - mossoIl > 4000) {
        // nessun cursore: la luce vaga piano sulla tavola
        tx = 58 + Math.sin(s * 0.31) * 16 + Math.sin(s * 0.13) * 6;
        ty = 44 + Math.cos(s * 0.27) * 12;
      }
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      // tremolio: somma di sinusoidi a frequenze sfasate + un pizzico di caso
      const tremolio = 1 + Math.sin(s * 7.3) * 0.025 + Math.sin(s * 13.1) * 0.018 + Math.sin(s * 2.1) * 0.04 + (Math.random() - 0.5) * 0.025;
      buio.style.setProperty("--x", x.toFixed(2) + "%");
      buio.style.setProperty("--y", y.toFixed(2) + "%");
      buio.style.setProperty("--r", (base() * tremolio).toFixed(1) + "px");
    }
    requestAnimationFrame(giro);
  })();

  // ---------- conteggi ----------
  function conta(el) {
    const fine = Number(el.dataset.conta);
    const inizio = fine > 1000 ? 1900 : 0;
    if (!haGsap || ridotto) { el.textContent = fine; return; }
    const o = { v: inizio };
    gsap.to(o, { v: fine, duration: 1.8, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(o.v); }, onComplete: () => { el.textContent = fine; } });
  }

  // ---------- senza GSAP: tutto resta statico e leggibile ----------
  if (!haGsap) {
    document.documentElement.classList.add("no-pin");
    $("#loader")?.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---------- loader + ingresso ----------
  const loader = $("#loader");
  const ingresso = gsap.timeline({ paused: true });
  ingresso
    .from(".hero__img", { scale: 1.32, duration: 2.6, ease: "power3.out" }, 0)
    .from(".hero__titolo .riga__in", { yPercent: 115, rotate: 3, duration: 1.2, stagger: 0.1, ease: "power4.out" }, 0.15)
    .from(".hero__eyebrow, .hero__testo, .hero__azioni > *, .stato-sera", { y: 24, opacity: 0, duration: 0.9, stagger: 0.07, ease: "power3.out" }, 0.55)
    .from(".nav", { yPercent: -100, duration: 0.9, ease: "power3.out" }, 0.4);

  if (loader && !ridotto) {
    if (lenis) lenis.stop();
    document.body.classList.add("bloccato");
    gsap.timeline()
      .add(() => loader.classList.add("acceso"), 0.25)
      .to(".loader__parola", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.5)
      .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "power4.inOut" }, 1.5)
      .add(() => ingresso.play(), 1.75)
      .add(() => {
        loader.remove();
        document.body.classList.remove("bloccato");
        if (lenis) lenis.start();
      }, 2.5);
    gsap.set(loader, { clipPath: "inset(0 0 0% 0)" });
    gsap.set(".loader__parola", { y: 10 });
  } else {
    loader?.remove();
  }

  // ---------- hero in parallasse ----------
  gsap.to(".hero__media", {
    yPercent: 18, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
  });
  gsap.to(".hero__inner", {
    yPercent: -12, opacity: 0.2, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
  });

  // ---------- titoli che salgono dalla riga ----------
  $$("[data-split]").forEach((t) => {
    if (t.classList.contains("hero__titolo")) return;
    gsap.from($$(".riga__in", t), {
      yPercent: 110, duration: 1.1, stagger: 0.09, ease: "power4.out",
      scrollTrigger: { trigger: t, start: "top 88%", once: true }
    });
  });
  $$(".eyebrow, .corpo, .numeri, .vantaggi li, .primi li, .degustazione, .lavagnetta, .info > div").forEach((el) => {
    if (el.closest(".hero")) return;
    gsap.from(el, {
      y: 26, opacity: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true }
    });
  });
  $$("[data-conta]").forEach((el) => ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => conta(el) }));

  // ---------- parallasse generica ----------
  $$("[data-velocita]").forEach((el) => {
    const v = Number(el.dataset.velocita);
    gsap.fromTo(el, { yPercent: -v * 60 }, {
      yPercent: v * 60, ease: "none",
      scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
    });
  });
  $$(".mercato__collage img, .storia__foto img").forEach((img) => {
    gsap.fromTo(img, { scale: 1.18 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  // ---------- la lavagna scorrevole ----------
  const righe = $$("[data-marquee]").map((riga) => {
    const traccia = $(".lavagna__traccia", riga);
    riga.appendChild(traccia.cloneNode(true)).setAttribute("aria-hidden", "true");
    const tracce = $$(".lavagna__traccia", riga);
    return { riga, tracce, dir: Number(riga.dataset.marquee), pos: 0, larg: traccia.offsetWidth };
  });
  window.addEventListener("resize", () => righe.forEach((r) => { r.larg = r.tracce[0].offsetWidth; }));
  let velocitaScroll = 0;
  if (lenis) lenis.on("scroll", (e) => { velocitaScroll = e.velocity; });
  if (!ridotto) {
    gsap.ticker.add((t, dt) => {
      const spinta = Math.min(Math.abs(velocitaScroll) * 0.35, 9);
      righe.forEach((r, i) => {
        const v = (0.045 + spinta * 0.02) * dt * (i === 0 ? 1 : 0.8);
        r.pos -= v * r.dir * (velocitaScroll < 0 ? -1 : 1);
        if (r.pos <= -r.larg) r.pos += r.larg;
        if (r.pos > 0) r.pos -= r.larg;
        const skew = i === 0 ? Math.max(-8, Math.min(8, velocitaScroll * -0.4)) : 0;
        r.tracce.forEach((tr) => { tr.style.transform = `translate3d(${r.pos}px,0,0) skewX(${skew}deg)`; });
      });
      velocitaScroll *= 0.92;
    });
  }

  // ---------- la carta: piatti in fila che girano ----------
  const pista = $("#cartaPista");
  const binario = $("#cartaBinario");
  const tondi = $$(".piatto__tondo", binario);
  const giraPiatti = (p) => tondi.forEach((t, i) => {
    const verso = i % 2 ? -1 : 1;
    t.style.transform = `rotate(${(p * 220 + i * 18) * verso}deg)`;
  });
  const mm = gsap.matchMedia();
  mm.add("(min-width: 721px) and (prefers-reduced-motion: no-preference)", () => {
    document.documentElement.classList.remove("no-pin");
    const distanza = () => binario.scrollWidth - window.innerWidth;
    const tw = gsap.to(binario, {
      x: () => -distanza(), ease: "none",
      scrollTrigger: {
        trigger: pista, start: "center center", end: () => "+=" + distanza(),
        pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (st) => giraPiatti(st.progress)
      }
    });
    // ogni piatto "arriva" in tavola quando entra nella vista
    $$(".piatto", binario).forEach((p) => {
      gsap.from($(".piatto__tondo", p), {
        scale: 0.7, opacity: 0.2, ease: "power2.out",
        scrollTrigger: { trigger: p, containerAnimation: tw, start: "left 100%", end: "left 60%", scrub: true }
      });
    });
    return () => { binario.style.transform = ""; };
  });
  mm.add("(max-width: 720px), (prefers-reduced-motion: reduce)", () => {
    document.documentElement.classList.add("no-pin");
    const suPista = () => giraPiatti(pista.scrollLeft / Math.max(1, pista.scrollWidth - pista.clientWidth));
    pista.addEventListener("scroll", suPista, { passive: true });
    return () => pista.removeEventListener("scroll", suPista);
  });

  // ---------- le sale: foto che segue il cursore ----------
  (function sale() {
    const lista = $("#saleLista");
    const seg = $("#saleSeguace");
    const img = $("img", seg);
    $$(".sala", lista).forEach((s) => {
      s.tabIndex = 0;
      s.setAttribute("role", "button");
      s.setAttribute("aria-label", `${$(".sala__nome", s).textContent}: prenota qui`);
      const scegli = () => { L.emetti("scegliArea", s.dataset.area); L.scrollA("#prenota", -70); };
      s.addEventListener("click", scegli);
      s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scegli(); } });
    });
    if (!puntatoreFine || ridotto) return;
    const qx = gsap.quickTo(seg, "x", { duration: 0.6, ease: "power3" });
    const qy = gsap.quickTo(seg, "y", { duration: 0.6, ease: "power3" });
    const qr = gsap.quickTo(seg, "rotate", { duration: 0.8, ease: "power3" });
    let ultimoX = 0;
    lista.addEventListener("pointermove", (e) => {
      qx(e.clientX + 36);
      qy(e.clientY - seg.offsetHeight / 2);
      qr(Math.max(-12, Math.min(12, (e.clientX - ultimoX) * 0.6)));
      ultimoX = e.clientX;
    });
    $$(".sala", lista).forEach((s) => s.addEventListener("pointerenter", () => {
      if (img.getAttribute("src") !== s.dataset.img) {
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 0.8, ease: "power3.out" });
        img.src = s.dataset.img;
      }
      gsap.to(seg, { opacity: 1, scale: 1, duration: 0.4 });
    }));
    lista.addEventListener("pointerleave", () => gsap.to(seg, { opacity: 0, scale: 0.85, duration: 0.4 }));
    gsap.set(seg, { scale: 0.85 });
  })();

  // ---------- il vino: il titolo si riempie ----------
  const vinoT = $("#vinoTitolo");
  if (vinoT && !ridotto) {
    vinoT.style.setProperty("--livello", "0%");
    gsap.to(vinoT, {
      "--livello": "104%", ease: "none",
      scrollTrigger: { trigger: "#vino", start: "top 70%", end: "center 45%", scrub: 0.5 }
    });
    gsap.fromTo(".vino__media", { yPercent: -8 }, {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: "#vino", start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  // ---------- espresso ----------
  gsap.fromTo(".chiusura__foto img", { scale: 1.2 }, {
    scale: 1, ease: "none",
    scrollTrigger: { trigger: ".chiusura", start: "top bottom", end: "bottom bottom", scrub: true }
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
