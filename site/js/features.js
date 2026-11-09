/* ==========================================================================
   Last Known Position: interactive features
   Light Clock (+ live Earth–Mars distance), silence board, timeline, quiz
   ========================================================================== */
(function () {
  "use strict";

  const LKP = window.LKP;
  const $ = LKP.$, $$ = LKP.$$, esc = LKP.esc;
  const C_KM_S = 299792.458;
  const AU_KM = 149597870.7;

  /* ------------------------------------------------------------------------
     Live Earth–Mars distance
     Keplerian elements from JPL "Approximate Positions of the Planets",
     Table 1 (valid 1800–2050). Checked against real close approaches:
     2003-08-27 → 55.8 M km, 2018-07-31 → 57.6 M km, 2025-01-12 → 96.1 M km.
     ------------------------------------------------------------------------ */
  const ELEMENTS = {
    earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] },
    mars: { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], w: [-23.94362959, 0.44441088], O: [49.55953891, -0.29257343] }
  };
  const DEG = Math.PI / 180;

  function helio(planet, T) {
    const k = ELEMENTS[planet];
    const v = function (x) { return x[0] + x[1] * T; };
    const a = v(k.a), e = v(k.e), I = v(k.I) * DEG, L = v(k.L), w = v(k.w), O = v(k.O);
    const M = (((L - w) % 360 + 540) % 360 - 180) * DEG;
    const om = (w - O) * DEG, Om = O * DEG;
    let E = M + e * Math.sin(M);
    for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const co = Math.cos(om), so = Math.sin(om), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
    return [
      (co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp,
      (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp,
      (so * sI) * xp + (co * sI) * yp
    ];
  }

  function marsKm(date) {
    const T = (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
    const e = helio("earth", T), m = helio("mars", T);
    return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]) * AU_KM;
  }
  LKP.marsKm = marsKm;

  /* ------------------------------------------------------------------------
     Light Clock
     ------------------------------------------------------------------------ */
  const LOG_MIN = 5.3, LOG_MAX = 10.6; // ~200,000 km … ~40 billion km
  const pos = function (km) { return (Math.log10(km) - LOG_MIN) / (LOG_MAX - LOG_MIN); };

  function initLightClock() {
    const form = $("#lc-form");
    if (!form) return;

    const now = new Date();
    const dests = LKP.destinations.map(function (d) {
      return Object.assign({}, d, { km: d.live === "mars" ? marsKm(now) : d.km });
    });
    dests.forEach(function (d) { d.sec = d.km / C_KM_S; });

    /* Mars distance in the chapter kicker */
    const mars = dests.find(function (d) { return d.live === "mars"; });
    $$("[data-mars-distance]").forEach(function (el) { el.textContent = Math.round(mars.km / 1e6) + " million km away today"; });

    /* Gauge: ticks and marks */
    const gauge = $(".gauge");
    const ticks = [[1e6, "1 million km"], [1e7, "10 million"], [1e8, "100 million"], [1e9, "1 billion"], [1e10, "10 billion"]];
    $(".gauge__ticks").innerHTML = ticks.map(function (t) {
      return '<li class="gauge__tick" style="top:' + (pos(t[0]) * 100).toFixed(2) + '%">' + t[1] + "</li>";
    }).join("");

    const r = LKP.marsRange;
    const marsBand = (pos(r.farKm) - pos(r.nearKm)) * 100;
    $(".gauge__marks").innerHTML = dests.map(function (d) {
      const isMars = d.live === "mars";
      const top = isMars ? pos(r.nearKm) * 100 : pos(d.km) * 100;
      /* New Horizons and Voyager 1 sit close on a log scale: push their labels apart. */
      const nudge = d.id === "newhorizons" ? " gauge__mark--up" : d.id === "voyager1" ? " gauge__mark--down" : "";
      return '<li class="gauge__mark' + (isMars ? " gauge__mark--range" : "") + nudge + '" data-dest="' + d.id + '" style="top:' + top.toFixed(2) + "%;" +
        (isMars ? "--h:calc(" + marsBand.toFixed(2) + "% * 3.8);transform:none" : "") + '">' +
        '<span class="gauge__mark-text"><span class="gauge__mark-name">' + esc(d.name.replace(", today", "")) + "</span>" +
        '<span class="gauge__mark-time">' + (isMars ? "3–22 min" : LKP.fmtDuration(d.sec)) + "</span></span></li>";
    }).join("");
    // The Mars band height must be relative to the gauge, not the mark: size it in px.
    const sizeBand = function () {
      const h = gauge.clientHeight;
      const m = $('.gauge__mark--range', gauge);
      if (m) m.style.setProperty("--h", Math.max(14, (marsBand / 100) * h).toFixed(1) + "px");
    };
    sizeBand();
    window.addEventListener("resize", sizeBand);

    /* Destination radio cards */
    $("#lc-options").innerHTML = dests.map(function (d, i) {
      return '<label class="dest"><input type="radio" name="dest" value="' + d.id + '"' + (i === dests.length - 1 ? " checked" : "") + ">" +
        '<span class="dest__box"><span class="dest__name">' + esc(d.name) + "</span>" +
        '<span class="dest__time">' + LKP.fmtDuration(d.sec) + "</span></span></label>";
    }).join("");

    const pulse = $(".gauge__pulse");
    const result = $("#lc-result");
    const timeFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const msg = ($("#lc-message").value || "").trim() || "Hello from Earth!";
      const d = dests.find(function (x) { return x.id === form.dest.value; }) || dests[dests.length - 1];
      const sent = new Date();
      const arrive = new Date(sent.getTime() + d.sec * 1000);
      const reply = new Date(sent.getTime() + 2 * d.sec * 1000);
      const targetMark = $('.gauge__mark[data-dest="' + d.id + '"]');

      $$(".gauge__mark").forEach(function (m) { m.classList.toggle("is-target", m === targetMark); });

      const show = function () {
        const extra = d.live === "mars"
          ? " Mars’s distance changes as both planets orbit the Sun, so this varies between about 3 and 22 minutes."
          : d.id === "moon" ? " That’s why Apollo conversations had short pauses." : "";
        result.innerHTML =
          '<p class="lc-result__msg">“' + esc(msg) + "” → " + esc(d.name) + "</p>" +
          '<p class="lc-result__big">' + LKP.fmtDuration(d.sec) + "</p>" +
          '<p class="lc-result__line">Sent now, it arrives <strong>' + timeFmt.format(arrive) + "</strong> your time." + extra + "</p>" +
          '<p class="lc-result__line">The fastest possible reply would reach you <strong>' + timeFmt.format(reply) + "</strong>.</p>" +
          '<p class="lc-result__src">Distance ≈ ' + LKP.fmtKm(d.km) + " · " + esc(d.note) +
          ' · <a href="' + d.source.u + '" target="_blank" rel="noopener">source</a></p>';
      };

      if (LKP.reduceMotion.matches || !targetMark) { show(); return; }
      const y = pos(d.live === "mars" ? d.km : d.km) * gauge.clientHeight;
      pulse.classList.remove("is-flying");
      pulse.style.transform = "translateY(0)";
      void pulse.offsetWidth; // restart the transition
      pulse.classList.add("is-flying");
      pulse.style.transform = "translateY(" + y.toFixed(1) + "px)";
      result.innerHTML = '<p class="lc-result__msg">Transmitting… (the real trip takes ' + LKP.fmtDuration(d.sec) + ")</p>";
      setTimeout(function () { show(); pulse.style.opacity = "0"; setTimeout(function () { pulse.classList.remove("is-flying"); pulse.style.opacity = ""; pulse.style.transform = "translateY(0)"; }, 300); }, 1650);
    });
  }

  /* ------------------------------------------------------------------------
     Silence board
     ------------------------------------------------------------------------ */
  const COUNT_WORD = { working: "on the job", silent: "of silence", lost: "since contact was lost", impact: "since impact" };

  function initBoard() {
    const list = $("#board-list");
    if (!list) return;

    const rows = LKP.ghosts.slice().sort(function (a, b) {
      if ((a.status === "working") !== (b.status === "working")) return a.status === "working" ? -1 : 1;
      return LKP.parseDate(a.since).date - LKP.parseDate(b.since).date;
    });

    list.innerHTML = rows.map(function (g) {
      const where = LKP.WORLDS[g.world] + " · " + g.mission.split(" · ")[0];
      return '<li class="board-row" data-world="' + g.world + '" data-status="' + g.status + '" style="--world:var(--' + g.world + ')">' +
        '<button class="board-row__who" type="button" data-open="' + g.id + '">' +
        '<span class="board-row__icon">' + LKP.kindIcon(g) + "</span>" +
        '<span><span class="board-row__name">' + esc(g.name) + '</span><span class="board-row__where">' + esc(where) + "</span></span></button>" +
        "<span>" + LKP.chip(g.status) + "</span>" +
        '<p class="board-row__since">' + esc(g.sinceLabel) + " <strong>" + LKP.fmtDate(g.since) + "</strong></p>" +
        '<p class="board-row__count"><span class="board-row__big" data-count="' + g.id + '"></span>' +
        '<span class="board-row__secs" data-secs="' + g.id + '"></span></p></li>';
    }).join("");

    const cells = rows.map(function (g) {
      return { g: g, from: LKP.parseDate(g.since).date, big: $('[data-count="' + g.id + '"]', list), secs: $('[data-secs="' + g.id + '"]', list) };
    });

    const tick = function () {
      const now = new Date();
      cells.forEach(function (c) {
        const e = LKP.elapsed(c.from, now);
        c.big.textContent = LKP.fmtElapsed(e);
        c.secs.textContent = LKP.fmtInt(e.seconds) + " seconds " + COUNT_WORD[c.g.status];
      });
    };
    tick();

    let timer = null;
    const start = function () { if (!timer) timer = setInterval(tick, 1000); };
    const stop = function () { clearInterval(timer); timer = null; };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(list);
    } else { start(); }

    /* Filters */
    const filters = $$(".filter");
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filters.forEach(function (b) { const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
        const f = btn.dataset.filter;
        $$(".board-row", list).forEach(function (row) {
          const show = f === "all" || row.dataset.world === f || (f === "working" && row.dataset.status === "working");
          row.hidden = !show;
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Timeline
     ------------------------------------------------------------------------ */
  function initTimeline() {
    const track = $("#timeline-track");
    if (!track) return;

    track.innerHTML = LKP.timeline.map(function (t) {
      const g = LKP.byId[t.ghost];
      return '<li class="tl-item" data-world="' + (g ? g.world : "deep") + '">' +
        '<time class="tl-item__date" datetime="' + t.date + '">' + LKP.fmtDate(t.date) + "</time>" +
        '<h3 class="tl-item__title">' + esc(t.title) + "</h3>" +
        '<p class="tl-item__text">' + esc(t.text) + "</p>" +
        (g ? '<button class="text-btn" type="button" data-open="' + g.id + '">' + esc(g.name) + " " + LKP.icon("i-arrow-right") + "</button>" : "") +
        "</li>";
    }).join("");

    const prev = $('[data-tl="prev"]'), next = $('[data-tl="next"]');
    const step = function () {
      const item = $(".tl-item", track);
      return item ? (item.getBoundingClientRect().width + 16) * 2 : 600;
    };
    const go = function (dir) { track.scrollBy({ left: dir * step(), behavior: LKP.reduceMotion.matches ? "auto" : "smooth" }); };
    const update = function () {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
    track.addEventListener("keydown", function (e) {
      if (e.target !== track) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    window.addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------------------------------
     Quiz
     ------------------------------------------------------------------------ */
  const RANKS = [
    [8, "Mission Archivist"], [6, "Flight Controller"], [3, "Navigator"], [0, "Cadet"]
  ];

  function initQuiz() {
    const card = $("#quiz-card");
    if (!card) return;
    const Q = LKP.quiz;
    let idx = 0, score = 0;
    let results = [];

    const dots = function () {
      return '<span class="quiz__dots" aria-hidden="true">' + Q.map(function (_, i) {
        const cls = results[i] === true ? " is-right" : results[i] === false ? " is-wrong" : i === idx ? " is-now" : "";
        return '<span class="quiz__dot' + cls + '"></span>';
      }).join("") + "</span>";
    };

    const renderQuestion = function (focus) {
      const q = Q[idx];
      card.innerHTML =
        '<div class="quiz__top"><span class="quiz__count">Question ' + (idx + 1) + " of " + Q.length + "</span>" + dots() + "</div>" +
        '<fieldset><legend class="quiz__q" tabindex="-1">' + esc(q.q) + "</legend>" +
        '<div class="quiz__options">' + q.options.map(function (o, i) {
          return '<label class="option"><input type="radio" name="quiz" value="' + i + '">' +
            '<span class="option__box"><span class="option__mark">' + "ABCD"[i] + "</span><span>" + esc(o) + "</span></span></label>";
        }).join("") + "</div></fieldset>" +
        '<div class="quiz__slot"></div>';
      if (focus) $(".quiz__q", card).focus({ preventScroll: true });

      $$('input[name="quiz"]', card).forEach(function (input) {
        input.addEventListener("change", function () { answer(Number(input.value)); });
      });
    };

    const answer = function (choice) {
      const q = Q[idx];
      const right = choice === q.answer;
      if (right) score += 1;
      results[idx] = right;

      $$(".option", card).forEach(function (label, i) {
        const input = $("input", label);
        input.disabled = true;
        if (i === q.answer) { label.classList.add("is-right"); $(".option__mark", label).innerHTML = LKP.icon("i-check"); }
        else if (i === choice) { label.classList.add("is-wrong"); $(".option__mark", label).innerHTML = LKP.icon("i-x"); }
      });
      $(".quiz__dots", card).outerHTML = dots();

      const last = idx === Q.length - 1;
      $(".quiz__slot", card).innerHTML =
        '<div class="quiz__feedback"><p class="quiz__verdict">' + (right ? "Correct!" : "Not quite. The answer is " + esc(q.options[q.answer]) + ".") + "</p>" +
        '<p class="quiz__explain">' + esc(q.explain) + "</p></div>" +
        '<div class="quiz__actions"><button class="btn btn--primary" type="button" data-quiz="next">' + (last ? "See my rank" : "Next question") + " " + LKP.icon("i-arrow-right") + "</button>" +
        '<button class="text-btn" type="button" data-open="' + q.ghost + '">Read the dossier ' + LKP.icon("i-arrow-right") + "</button></div>";
      $('[data-quiz="next"]', card).addEventListener("click", function () {
        if (last) { renderResult(); } else { idx += 1; renderQuestion(true); }
      });
    };

    const renderResult = function () {
      const rank = RANKS.find(function (r) { return score >= r[0]; })[1];
      card.innerHTML =
        '<div class="quiz__result"><p class="quiz__count">Your result</p>' + dots() +
        '<p class="quiz__score" tabindex="-1">' + score + " / " + Q.length + "</p>" +
        '<p class="quiz__rank">Rank: ' + rank + "</p>" +
        '<p class="quiz__explain">' + (score === Q.length ? "Perfect. The ghosts are in good hands." : "Every dossier has the full story. Explore a few and try again.") + "</p>" +
        '<div class="quiz__actions"><button class="btn" type="button" data-quiz="again">Try again</button></div></div>';
      $(".quiz__score", card).focus({ preventScroll: true });
      $('[data-quiz="again"]', card).addEventListener("click", function () { idx = 0; score = 0; results = []; renderQuestion(true); });
    };

    renderQuestion(false);
  }

  LKP.features = {
    init: function () {
      initLightClock();
      initBoard();
      initTimeline();
      initQuiz();
    }
  };
})();
