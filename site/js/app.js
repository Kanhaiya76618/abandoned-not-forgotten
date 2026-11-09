/* ==========================================================================
   Last Known Position: page shell
   Theme, navigation, progress, reveal, starfield, ticker, ghost lists,
   dossier dialog, read-aloud and deep links. Runs after the other modules.
   ========================================================================== */
(function () {
  "use strict";

  const LKP = window.LKP;
  const $ = LKP.$, $$ = LKP.$$, esc = LKP.esc;
  const root = document.documentElement;

  /* ---------- Theme ---------- */
  function initTheme() {
    const btn = $("#theme-toggle");
    const label = function () {
      btn.setAttribute("aria-label", root.dataset.theme === "day" ? "Switch to night mode" : "Switch to day mode (good for projectors)");
    };
    label();
    btn.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "day" ? "night" : "day";
      try { localStorage.setItem("lkp-theme", root.dataset.theme); } catch (e) { /* storage unavailable */ }
      label();
      LKP.bus.emit("theme", root.dataset.theme);
    });
  }

  /* ---------- Navigation: mobile menu, active chapter, progress ---------- */
  function initNav() {
    const toggle = $("#nav-toggle"), list = $("#nav-list");
    const setOpen = function (open) {
      list.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close chapter menu" : "Open chapter menu");
    };
    toggle.addEventListener("click", function () { setOpen(!list.classList.contains("is-open")); });
    list.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && list.classList.contains("is-open")) { setOpen(false); toggle.focus(); } });
    document.addEventListener("click", function (e) { if (!e.target.closest(".site-header")) setOpen(false); });

    /* Active chapter highlighting */
    const links = $$(".nav__link");
    const byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.removeAttribute("aria-current"); });
          if (byId[en.target.id]) byId[en.target.id].setAttribute("aria-current", "true");
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $$("main > section[id]").forEach(function (s) { io.observe(s); });
    }

    /* Reading progress */
    const bar = $(".progress__bar");
    let ticking = false;
    const update = function () {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
      ticking = false;
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window) || LKP.reduceMotion.matches) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });
  }

  /* ---------- Starfield ---------- */
  function initStarfield() {
    const canvas = $(".hero__stars");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, stars = [], raf = 0, visible = true;

    const build = function () {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(420, Math.round((w * h) / 3400));
      stars = [];
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.2 + 0.25, a: Math.random() * 0.65 + 0.2,
          tw: Math.random() * 0.025 + 0.004, ph: Math.random() * Math.PI * 2,
          v: Math.random() * 0.05 + 0.008
        });
      }
    };

    const draw = function (t) {
      const still = LKP.reduceMotion.matches;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = root.dataset.theme === "day" ? "#3b4357" : "#ffffff";
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        ctx.globalAlpha = s.a * (still ? 1 : 0.62 + 0.38 * Math.sin(s.ph + t * s.tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
        if (!still) { s.x -= s.v; if (s.x < -2) s.x = w + 2; }
      }
      ctx.globalAlpha = 1;
    };

    const loop = function (ts) {
      draw(ts / 16);
      raf = visible && !LKP.reduceMotion.matches ? window.requestAnimationFrame(loop) : 0;
    };
    const start = function () { if (!raf) raf = window.requestAnimationFrame(loop); };

    build(); draw(0);
    if (!LKP.reduceMotion.matches) start();

    let rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); draw(0); }, 150); });
    LKP.bus.on("theme", function () { draw(0); });
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; if (visible && !LKP.reduceMotion.matches) start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !LKP.reduceMotion.matches) start();
      }).observe(canvas);
    }
  }

  /* ---------- Telemetry ticker ---------- */
  function initTicker() {
    const el = $("#ticker-text");
    if (!el || !LKP.ticker.length) return;
    let i = 0;
    el.textContent = LKP.ticker[0];
    setInterval(function () {
      if (document.hidden) return;
      el.classList.add("is-fading");
      setTimeout(function () {
        i = (i + 1) % LKP.ticker.length;
        el.textContent = LKP.ticker[i];
        el.classList.remove("is-fading");
      }, LKP.reduceMotion.matches ? 0 : 420);
    }, 3800);
  }

  /* ---------- Ghost lists ---------- */
  function initGhostLists() {
    $$("[data-ghost-list]").forEach(function (list) {
      const world = list.dataset.ghostList;
      list.innerHTML = LKP.ghosts.filter(function (g) { return g.world === world; }).map(function (g) {
        return '<li><button class="ghost-card" type="button" data-open="' + g.id + '" data-ghost="' + g.id + '">' +
          '<span class="ghost-card__icon">' + LKP.kindIcon(g) + "</span>" +
          '<span class="ghost-card__text"><span class="ghost-card__mission">' + esc(g.mission.split(" · ")[0]) + " · " + g.year + "</span>" +
          '<span class="ghost-card__name">' + esc(g.name) + "</span>" +
          '<span class="ghost-card__hook">' + esc(g.hook) + "</span></span>" +
          LKP.chip(g.status) + "</button></li>";
      }).join("");
    });

    /* list ↔ map highlighting */
    document.addEventListener("pointerover", function (e) {
      const card = e.target.closest(".ghost-card");
      if (card && !card.contains(e.relatedTarget)) LKP.bus.emit("hot", { id: card.dataset.ghost, on: true, from: "list" });
    });
    document.addEventListener("pointerout", function (e) {
      const card = e.target.closest(".ghost-card");
      if (card && !card.contains(e.relatedTarget)) LKP.bus.emit("hot", { id: card.dataset.ghost, on: false, from: "list" });
    });
    document.addEventListener("focusin", function (e) {
      const card = e.target.closest(".ghost-card");
      if (card) LKP.bus.emit("hot", { id: card.dataset.ghost, on: true, from: "list" });
    });
    document.addEventListener("focusout", function (e) {
      const card = e.target.closest(".ghost-card");
      if (card) LKP.bus.emit("hot", { id: card.dataset.ghost, on: false, from: "list" });
    });
    LKP.bus.on("hot", function (d) {
      if (d.from !== "map") return;
      $$('.ghost-card[data-ghost="' + d.id + '"]').forEach(function (c) { c.classList.toggle("is-hot", d.on); });
    });
  }

  /* ---------- Dossier dialog ---------- */
  const dossier = { el: null, scrim: null, current: null, opener: null, closeTimer: 0, baseHash: "" };

  function renderDossier(g) {
    const d = dossier.el;
    d.dataset.world = g.world;
    $("#dossier-icon").innerHTML = LKP.kindIcon(g);
    $("#dossier-mission").textContent = g.mission + " · " + g.place;
    $("#dossier-title").textContent = g.name;
    $("#dossier-status").innerHTML = LKP.chip(g.status) + '<span class="dossier__agency">' + esc(g.agency) + "</span>" +
      '<span class="dossier__agency">' + esc(LKP.WORLDS[g.world]) + "</span>";

    $("#dossier-body").innerHTML =
      '<p class="dossier__hook">' + esc(g.hook) + "</p>" +
      '<dl class="facts">' + g.facts.map(function (f) {
        return '<div class="facts__item"><dt>' + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>";
      }).join("") + "</dl>" +
      '<section class="d-section"><h3>The story</h3>' + g.story.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</section>" +
      (g.voice && g.voice.length ? '<section class="d-section"><h3>In its own words</h3><ul class="voice">' +
        g.voice.map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("") +
        '</ul><p class="voice__note">Imagined log, written from real mission facts.</p></section>' : "") +
      '<section class="d-section"><h3>What we learned</h3><ul class="learned">' +
        g.learned.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul></section>" +
      '<section class="d-section"><h3>Sources</h3><ol class="sources">' +
        g.sources.map(function (s) {
          return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + LKP.icon("i-external") + '<span class="sr-only"> (opens in a new tab)</span></a></li>';
        }).join("") + "</ol></section>";
    $("#dossier-body").scrollTop = 0;

    const i = LKP.ghosts.indexOf(g);
    const prev = LKP.ghosts[(i - 1 + LKP.ghosts.length) % LKP.ghosts.length];
    const next = LKP.ghosts[(i + 1) % LKP.ghosts.length];
    $("#dossier-prev").setAttribute("aria-label", "Previous: " + prev.name);
    $("#dossier-next").setAttribute("aria-label", "Next: " + next.name);
    $("#dossier-map").hidden = !g.loc;
  }

  function openDossier(id, opener) {
    const g = LKP.byId[id];
    if (!g) return;
    clearTimeout(dossier.closeTimer);
    LKP.speech.stop();
    const wasOpen = !dossier.el.hidden && dossier.el.classList.contains("is-open");
    dossier.current = g;
    if (!wasOpen) {
      dossier.opener = opener || document.activeElement;
      dossier.baseHash = location.hash.indexOf("#ghost=") === 0 ? "" : location.hash;
    }
    renderDossier(g);
    dossier.el.hidden = false;
    dossier.scrim.hidden = false;
    document.body.classList.add("is-locked");
    window.requestAnimationFrame(function () {
      dossier.el.classList.add("is-open");
      dossier.scrim.classList.add("is-open");
    });
    $("#dossier-title").focus({ preventScroll: true });
    try { history.replaceState(null, "", "#ghost=" + g.id); } catch (e) { /* file:// or sandbox */ }
  }

  function closeDossier(restoreFocus) {
    if (dossier.el.hidden) return;
    LKP.speech.stop();
    dossier.el.classList.remove("is-open");
    dossier.scrim.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    dossier.closeTimer = setTimeout(function () { dossier.el.hidden = true; dossier.scrim.hidden = true; }, LKP.reduceMotion.matches ? 0 : 430);
    try { history.replaceState(null, "", location.pathname + location.search + dossier.baseHash); } catch (e) { /* ignore */ }
    if (restoreFocus !== false && dossier.opener && document.contains(dossier.opener)) dossier.opener.focus({ preventScroll: true });
  }

  function initDossier() {
    dossier.el = $("#dossier");
    dossier.scrim = $("#scrim");

    /* Anything with data-open opens a dossier (cards, moments, timeline, map popups, quiz). */
    document.addEventListener("click", function (e) {
      const t = e.target.closest("[data-open]");
      if (!t) return;
      e.preventDefault();
      openDossier(t.dataset.open, t);
    });

    $("#dossier-close").addEventListener("click", function () { closeDossier(); });
    dossier.scrim.addEventListener("click", function () { closeDossier(); });

    const step = function (dir) {
      const i = LKP.ghosts.indexOf(dossier.current);
      openDossier(LKP.ghosts[(i + dir + LKP.ghosts.length) % LKP.ghosts.length].id);
    };
    $("#dossier-prev").addEventListener("click", function () { step(-1); });
    $("#dossier-next").addEventListener("click", function () { step(1); });

    $("#dossier-map").addEventListener("click", function () {
      const id = dossier.current.id;
      closeDossier(false);
      LKP.atlas.focus(id);
    });

    const listen = $("#dossier-listen");
    if (LKP.speech.supported) {
      listen.hidden = false;
      listen.addEventListener("click", function () {
        const g = dossier.current;
        const text = g.name + ". " + g.hook + " " + g.story.join(" ") +
          (g.voice && g.voice.length ? " In its own words, imagined from real facts: " + g.voice.join(" ") : "");
        LKP.speech.toggle(text, listen);
      });
    }

    /* Keyboard: Escape closes, Tab is trapped, arrows browse. */
    dossier.el.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeDossier(); return; }
      if (e.key === "Tab") {
        const f = $$('a[href], button:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])', dossier.el)
          .filter(function (n) { return n.offsetParent !== null; });
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === $("#dossier-title"))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        step(e.key === "ArrowRight" ? 1 : -1);
      }
    });
  }

  /* ---------- Read-aloud buttons on chapter text ---------- */
  function initListen() {
    if (!LKP.speech.supported) return;
    $$("[data-listen]").forEach(function (btn) {
      btn.hidden = false;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        const src = $(btn.dataset.listen);
        if (src) LKP.speech.toggle(src.innerText.replace(/\s*(Listen|Stop)\s*$/, ""), btn);
      });
    });
  }

  /* ---------- Deep links: #ghost=<id> ---------- */
  function initDeepLinks() {
    const fromHash = function () {
      const m = location.hash.match(/^#ghost=([a-z0-9-]+)/i);
      if (m && LKP.byId[m[1]]) openDossier(m[1]);
    };
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }

  /* ---------- Boot ---------- */
  function boot() {
    LKP.openDossier = openDossier;
    LKP.closeDossier = closeDossier;
    initTheme();
    initNav();
    initReveal();
    initStarfield();
    initTicker();
    initGhostLists();
    initDossier();
    initListen();
    LKP.atlas.init();
    LKP.features.init();
    initDeepLinks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
