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

  /* ---------- Tabs: one section of content on screen at a time ---------- */
  function initViews() {
    const views = $$(".view"), tabs = $$("[data-tab]"), list = $("#tabs-list");
    const baseTitle = "Last Known Position";
    let current = "home";

    /* Reading progress for the tab on screen */
    const bar = $(".progress__bar");
    let ticking = false;
    const progress = function () {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 40 ? Math.min(1, window.scrollY / max) : 0) + ")";
      ticking = false;
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; window.requestAnimationFrame(progress); } }, { passive: true });

    const show = function (name) {
      const v = $('.view[data-view="' + name + '"]');
      if (!v) return false;
      const changed = name !== current;
      views.forEach(function (x) { x.classList.toggle("is-active", x === v); });
      current = name;
      document.body.dataset.view = name;
      tabs.forEach(function (t) {
        if (t.dataset.tab === name) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
      });
      const active = $('.tab[aria-current="page"]');
      if (active && list) list.scrollTo({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2 });
      document.title = name === "home" ? baseTitle + " · Abandoned but not Forgotten" : v.dataset.title + " · " + baseTitle;
      if (changed) {
        window.scrollTo({ top: 0, behavior: "instant" });
        v.classList.remove("is-entering");
        void v.offsetWidth; /* restart the entrance animation */
        v.classList.add("is-entering");
        LKP.speech.stop();
        LKP.bus.emit("view", name);
      }
      progress();
      return changed;
    };

    /* Go to whatever a #link points at: switch to its tab, then scroll to it. */
    const go = function (hash, push) {
      const id = String(hash || "").replace(/^#/, "");
      if (!id || id.indexOf("ghost=") === 0) return false;
      const el = document.getElementById(id), v = el && el.closest(".view");
      if (!v) return false;
      show(v.dataset.view);
      if (el === v || el === v.firstElementChild) window.scrollTo({ top: 0, behavior: "instant" });
      else window.requestAnimationFrame(function () { LKP.scrollToEl(el); });
      if (push) { try { history.pushState(null, "", "#" + id); } catch (e) { /* file:// or sandbox */ } }
      return true;
    };

    document.addEventListener("click", function (e) {
      const top = e.target.closest("[data-scroll-top]");
      if (top) { window.scrollTo({ top: 0, behavior: LKP.reduceMotion.matches ? "auto" : "smooth" }); return; }
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute("data-skip")) return;
      if (go(a.getAttribute("href"), true)) e.preventDefault();
    });
    window.addEventListener("popstate", function () { if (!go(location.hash)) show("home"); });

    /* Used by "See in 3D" and "Show on map": switch tab and keep the address bar in step. */
    LKP.showView = function (name) {
      if (!show(name)) return false;
      const v = $('.view[data-view="' + name + '"]'), first = v.firstElementChild;
      try { history.pushState(null, "", name === "home" ? location.pathname + location.search : "#" + (first.id || v.id)); } catch (e) { /* file:// or sandbox */ }
      return true;
    };
    LKP.go = go;
    if (!go(location.hash)) show("home");
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
    /* When a tab opens, show whatever is already on screen straight away (don't wait for the observer). */
    const sweep = function () {
      const h = window.innerHeight;
      items.forEach(function (el) {
        if (el.classList.contains("is-in") || el.offsetParent === null) return;
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.94 && r.bottom > 0) { el.classList.add("is-in"); io.unobserve(el); }
      });
    };
    LKP.bus.on("view", sweep);
    sweep();
  }

  /* ---------- Sky: layered stars that drift with the page, twinkle, and now and then a meteor ---------- */
  function initStarfield() {
    const canvas = $(".sky");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const TINT = ["#ffffff", "#ffffff", "#ffffff", "#dfe8ff", "#bcd0ff", "#ffe9c4", "#ffd2a1"];
    let w = 0, h = 0, stars = [], raf = 0, meteor = null, nextMeteor = 0, sy = 0;
    const still = function () { return LKP.reduceMotion.matches; };

    const build = function () {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(560, Math.round((w * h) / 2400));
      stars = [];
      for (let i = 0; i < n; i++) {
        const near = Math.random();           /* 0 = far and faint, 1 = near and bright */
        stars.push({
          x: Math.random() * w, y: Math.random() * (h + 80),
          r: 0.3 + near * near * 1.25, a: 0.25 + near * 0.6,
          depth: 0.015 + near * 0.11,         /* nearer stars slide more as the page scrolls */
          tw: 0.6 + Math.random() * 2.2, ph: Math.random() * 6.283,
          c: TINT[(Math.random() * TINT.length) | 0],
          flare: near > 0.985
        });
      }
    };

    const draw = function (t) {
      const day = root.dataset.theme === "day";
      ctx.clearRect(0, 0, w, h);
      const span = h + 80;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const y = (((s.y - sy * s.depth) % span) + span) % span - 40;
        const tw = still() ? 1 : 0.7 + 0.3 * Math.sin(s.ph + t * s.tw);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = day ? "#4a5270" : s.c;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, 6.2832);
        ctx.fill();
        if (s.flare && !day) {               /* a few bright stars get a soft halo and a cross */
          ctx.globalAlpha = 0.12 * tw;
          ctx.beginPath(); ctx.arc(s.x, y, s.r * 5, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = 0.32 * tw;
          ctx.fillRect(s.x - s.r * 4, y - 0.3, s.r * 8, 0.6);
          ctx.fillRect(s.x - 0.3, y - s.r * 4, 0.6, s.r * 8);
        }
      }
      if (meteor && !day) {
        const m = meteor, k = m.life / m.max, len = 130;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * len, m.y - m.vy * len);
        g.addColorStop(0, "rgba(255,255,255," + (0.9 * Math.sin(k * Math.PI)).toFixed(3) + ")");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * len, m.y - m.vy * len); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let last = 0;
    const loop = function (ts) {
      raf = still() ? 0 : window.requestAnimationFrame(loop);
      const t = ts / 1000, dt = Math.min(0.05, t - last || 0.016);
      last = t;
      if (!still()) {
        if (!meteor && t > nextMeteor) {
          const ang = 0.35 + Math.random() * 0.5;
          meteor = { x: Math.random() * w * 0.9, y: Math.random() * h * 0.45, vx: Math.cos(ang), vy: Math.sin(ang), life: 0, max: 0.9 };
          nextMeteor = t + 7 + Math.random() * 9;
        }
        if (meteor) {
          meteor.life += dt; meteor.x += meteor.vx * 620 * dt; meteor.y += meteor.vy * 620 * dt;
          if (meteor.life >= meteor.max) meteor = null;
        }
      }
      draw(t);
    };
    const start = function () { if (!raf && !still()) raf = window.requestAnimationFrame(loop); };

    build(); draw(0); nextMeteor = 4; start();

    let rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); draw(0); }, 150); });
    window.addEventListener("scroll", function () { sy = window.scrollY; if (still()) draw(0); }, { passive: true });
    LKP.bus.on("theme", function () { draw(0); });
    document.addEventListener("visibilitychange", start);
  }

  /* ---------- Telemetry ticker ---------- */
  function initTicker() {
    const el = $("#ticker-text");
    if (!el || !LKP.ticker.length) return;
    let i = 0;
    el.textContent = LKP.ticker[0];
    setInterval(function () {
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
          LKP.thumb(g, "ghost-card__img") +
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

    const im = LKP.img(g);

    /* Other machines that share this exact spot (so one pin can lead to each of them). */
    const mySites = (g.loc || []).map(function (l) { return l.site; });
    const sibs = LKP.ghosts.filter(function (x) {
      return x.world === g.world && (x.loc || []).some(function (l) { return mySites.indexOf(l.site) !== -1; });
    });
    const sibsHtml = sibs.length > 1 ? '<div class="sibs"><p class="sibs__label">' + sibs.length + ' machines at this spot</p><div class="sibs__row">' +
      sibs.map(function (x) {
        return '<button class="sib" type="button" data-open="' + x.id + '"' + (x === g ? ' aria-current="true"' : "") + ">" + LKP.thumb(x, "sib__img") + "<span>" + esc(x.name) + "</span></button>";
      }).join("") + "</div></div>" : "";

    /* How long it has been silent, or on the job. */
    const el = LKP.elapsed(LKP.parseDate(g.since).date, new Date());
    const sinceHtml = '<p class="since since--' + g.status + '">' + LKP.icon(LKP.STATUS[g.status].icon) +
      "<span><strong>" + esc(g.sinceLabel) + " " + LKP.fmtDate(g.since) + "</strong>" +
      "<small>" + LKP.fmtElapsed(el) + (g.status === "working" ? " and counting" : " ago") + "</small></span></p>";

    const moments = LKP.timeline.filter(function (t) { return t.ghost === g.id; });
    const momentsHtml = moments.length ? '<section class="d-section"><h3>Key moments</h3><ol class="d-moments">' +
      moments.map(function (t) {
        return '<li><time datetime="' + t.date + '">' + LKP.fmtDate(t.date) + "</time><strong>" + esc(t.title) + "</strong><span>" + esc(t.text) + "</span></li>";
      }).join("") + "</ol></section>" : "";

    $("#dossier-body").innerHTML =
      sibsHtml +
      (im ? '<figure class="dossier__photo"><img src="' + im.src + '" alt="' + esc(im.caption) + '" width="' + im.w + '" height="' + im.h + '" decoding="async">' +
        "<figcaption>" + esc(im.caption) + ' <span class="dossier__credit">Photo: ' + esc(im.credit) + " · public domain · " +
        '<a href="' + esc(im.page) + '" target="_blank" rel="noopener">source<span class="sr-only"> (opens in a new tab)</span></a></span></figcaption></figure>' : "") +
      '<p class="dossier__hook">' + esc(g.hook) + "</p>" +
      sinceHtml +
      '<dl class="facts">' + g.facts.map(function (f) {
        return '<div class="facts__item"><dt>' + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>";
      }).join("") + "</dl>" +
      '<section class="d-section"><h3>The story</h3>' + g.story.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</section>" +
      (g.voice && g.voice.length ? '<section class="d-section"><h3>In its own words</h3><ul class="voice">' +
        g.voice.map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("") +
        '</ul><p class="voice__note">Imagined log, written from real mission facts.</p></section>' : "") +
      '<section class="d-section"><h3>What we learned</h3><ul class="learned">' +
        g.learned.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul></section>" +
      momentsHtml +
      '<section class="d-section"><h3>Sources</h3><ol class="sources">' +
        g.sources.map(function (s) {
          return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + LKP.icon("i-external") + '<span class="sr-only"> (opens in a new tab)</span></a>' +
            (s.o ? ' <span class="src-badge" title="Listed by NASA on the challenge page">Challenge resource</span>' : "") + "</li>";
        }).join("") + "</ol></section>";
    $("#dossier-body").scrollTop = 0;

    const i = LKP.ghosts.indexOf(g);
    const prev = LKP.ghosts[(i - 1 + LKP.ghosts.length) % LKP.ghosts.length];
    const next = LKP.ghosts[(i + 1) % LKP.ghosts.length];
    $("#dossier-prev").setAttribute("aria-label", "Previous: " + prev.name);
    $("#dossier-next").setAttribute("aria-label", "Next: " + next.name);
    $("#dossier-map").hidden = !g.loc;
    $("#dossier-3d").hidden = !(LKP.sim && LKP.sim.available);
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

    $("#dossier-3d").addEventListener("click", function () {
      const id = dossier.current.id;
      closeDossier(false);
      if (LKP.sim) LKP.sim.focusGhost(id);
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

  /* ---------- Search: find a machine or a world by name, kind, place or status ---------- */
  function initSearch() {
    const dlg = $("#search"), input = $("#search-input"), list = $("#search-results"), hints = $("#search-hints"), empty = $("#search-empty");
    const openBtn = $("#search-open");
    if (!dlg) return;

    const index = LKP.ghosts.map(function (g) {
      return { g: g, name: g.name.toLowerCase(), text: [g.name, g.mission, g.place, g.kind, g.agency, LKP.WORLDS[g.world], LKP.STATUS[g.status].label, g.hook, g.year].join(" ").toLowerCase() };
    }).concat(LKP.bodies.map(function (b) {
      return { b: b, name: b.name.toLowerCase(), text: (b.name + " " + b.type + " world simulator 3d " + (b.home || []).join(" ")).toLowerCase() };
    }));
    const FEATURED = ["opportunity", "voyager1", "lrrr11", "surveyor3", "ingenuity", "lrv17"];
    const HINTS = ["rover", "Apollo", "still working", "Mars", "asteroid", "telescope", "lost", "Voyager"];

    hints.innerHTML = '<span class="search__hint-label">Try</span>' + HINTS.map(function (h) {
      return '<button class="search__hint" type="button" data-hint="' + h + '">' + h + "</button>";
    }).join("");

    const row = function (e) {
      if (e.b) {
        return '<li><button class="result" type="button" data-sim-focus="' + e.b.id + '"><span class="result__world" style="--c:' + e.b.color + '"></span>' +
          '<span class="result__text"><strong>' + esc(e.b.name) + "</strong><small>" + esc(e.b.type) + " · fly there in the simulator</small></span>" +
          LKP.icon("i-orbit") + "</button></li>";
      }
      const g = e.g;
      return '<li><button class="result" type="button" data-result="' + g.id + '">' + LKP.thumb(g, "result__img") +
        '<span class="result__text"><strong>' + esc(g.name) + "</strong><small>" + esc(g.mission.split(" · ")[0]) + " · " + esc(LKP.WORLDS[g.world]) + " · " + g.year + "</small></span>" +
        LKP.chip(g.status) + "</button></li>";
    };

    const render = function () {
      const terms = input.value.toLowerCase().trim().split(" ").filter(Boolean);
      let found;
      if (!terms.length) {
        found = FEATURED.map(function (id) { return index.find(function (e) { return e.g && e.g.id === id; }); });
      } else {
        found = index.filter(function (e) { return terms.every(function (t) { return e.text.indexOf(t) !== -1; }); });
        /* Worlds first when their name matches, then names that start with the word, then the rest. */
        const score = function (e) { return e.b && e.name.indexOf(terms[0]) !== -1 ? -1 : e.name.indexOf(terms[0]) === 0 ? 0 : e.name.indexOf(terms[0]) !== -1 ? 1 : 2; };
        found.sort(function (a, b) { return score(a) - score(b); });
      }
      list.innerHTML = found.slice(0, 14).map(row).join("");
      empty.hidden = found.length > 0;
    };

    let opener = null;
    const open = function () {
      if (!dlg.hidden) return;
      opener = document.activeElement;
      dlg.hidden = false;
      document.body.classList.add("is-locked");
      window.requestAnimationFrame(function () { dlg.classList.add("is-open"); });
      input.value = "";
      render();
      input.focus();
    };
    const close = function (restore) {
      if (dlg.hidden) return;
      dlg.classList.remove("is-open");
      dlg.hidden = true;
      document.body.classList.remove("is-locked");
      if (restore !== false && opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };

    openBtn.addEventListener("click", open);
    $("#search-close").addEventListener("click", function () { close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    input.addEventListener("input", render);
    hints.addEventListener("click", function (e) {
      const h = e.target.closest("[data-hint]");
      if (h) { input.value = h.dataset.hint; render(); input.focus(); }
    });
    list.addEventListener("click", function (e) {
      const r = e.target.closest("[data-result]"), w = e.target.closest("[data-sim-focus]");
      if (r) { e.stopPropagation(); close(false); openDossier(r.dataset.result, openBtn); }
      else if (w) { close(false); } /* the global data-sim-focus handler flies there */
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      const items = $$(".result", list);
      if (e.key === "Enter" && document.activeElement === input && items.length) { e.preventDefault(); items[0].click(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const i = items.indexOf(document.activeElement);
        const next = e.key === "ArrowDown" ? (i < items.length - 1 ? items[i + 1] : input) : (i > 0 ? items[i - 1] : i === 0 ? input : items[items.length - 1]);
        if (next) next.focus();
      }
      if (e.key === "Tab") {
        const f = $$("input, button:not([disabled])", dlg).filter(function (n) { return n.offsetParent !== null; });
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener("keydown", function (e) {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ((e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        if (!$("#dossier").hidden) return;
        e.preventDefault();
        open();
      }
    });
  }

  /* ---------- Buttons that fly the simulator somewhere ---------- */
  /* ---------- About tab: the official challenge resources and the machines that cite each ---------- */
  function initResources() {
    const list = $("#resources-list");
    if (!list || !LKP.resources) return;
    list.innerHTML = LKP.resources.map(function (r) {
      return '<li class="resource"><p class="resource__group">' + esc(r.group) + '</p>' +
        '<a class="resource__link" href="' + esc(r.src.u) + '" target="_blank" rel="noopener">' + esc(r.name) + LKP.icon("i-external") + '<span class="sr-only"> (opens in a new tab)</span></a>' +
        '<div class="resource__uses">' + r.ghosts.map(function (id) {
          const g = LKP.byId[id];
          return '<button class="sim-visitor" type="button" data-open="' + id + '">' + LKP.thumb(g, "sim-visitor__img") + "<span>" + esc(g.name) + "</span></button>";
        }).join("") + "</div></li>";
    }).join("");
  }

  function initSimLinks() {
    document.addEventListener("click", function (e) {
      const t = e.target.closest("[data-sim-focus]");
      if (!t) return;
      if (LKP.sim && LKP.sim.available) LKP.sim.focus(t.dataset.simFocus);
      else LKP.go("#simulator");
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
    initViews();
    initReveal();
    initStarfield();
    initTicker();
    initGhostLists();
    initDossier();
    initListen();
    initSearch();
    initSimLinks();
    initResources();
    LKP.atlas.init();
    LKP.features.init();
    initDeepLinks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
