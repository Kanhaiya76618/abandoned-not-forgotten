/* ==========================================================================
   Last Known Position: core helpers shared by every module
   ========================================================================== */
(function () {
  "use strict";

  const LKP = window.LKP;

  LKP.STATUS = {
    working: { label: "Still working", icon: "i-signal", order: 0 },
    silent: { label: "Silent", icon: "i-silent", order: 1 },
    lost: { label: "Lost", icon: "i-lost", order: 2 },
    impact: { label: "Impact", icon: "i-impact", order: 3 }
  };

  LKP.WORLDS = { moon: "The Moon", mars: "Mars", deep: "Deep space" };

  LKP.KINDS = {
    lander: "i-lander", rover: "i-rover", helicopter: "i-helicopter", probe: "i-probe",
    reflector: "i-reflector", seismometer: "i-seismometer", impact: "i-impact", orbiter: "i-orbiter", telescope: "i-telescope"
  };

  LKP.byId = {};
  LKP.ghosts.forEach(function (g) { LKP.byId[g.id] = g; });

  /* ---------- DOM ---------- */
  LKP.$ = function (sel, root) { return (root || document).querySelector(sel); };
  LKP.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  LKP.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };

  LKP.icon = function (name, cls) {
    return '<svg class="icon' + (cls ? " " + cls : "") + '" aria-hidden="true" focusable="false"><use href="#' + name + '"/></svg>';
  };
  LKP.kindIcon = function (g) { return LKP.icon(LKP.KINDS[g.kind] || "i-probe"); };
  LKP.chip = function (status) {
    const s = LKP.STATUS[status];
    return '<span class="chip chip--' + status + '">' + LKP.icon(s.icon) + s.label + "</span>";
  };

  LKP.reduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  LKP.scrollToEl = function (el, block) {
    if (!el) return;
    el.scrollIntoView({ behavior: LKP.reduceMotion.matches ? "auto" : "smooth", block: block || "start" });
  };

  /* ---------- Dates ---------- */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /** Parse "YYYY", "YYYY-MM" or "YYYY-MM-DD" as a UTC date. */
  LKP.parseDate = function (s) {
    if (!s) return null;
    const p = String(s).split("-").map(Number);
    return {
      date: new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1)),
      precision: p.length === 3 ? "day" : p.length === 2 ? "month" : "year"
    };
  };

  LKP.fmtDate = function (s) {
    const d = LKP.parseDate(s);
    if (!d) return "";
    const y = d.date.getUTCFullYear(), m = MONTHS[d.date.getUTCMonth()], day = d.date.getUTCDate();
    if (d.precision === "day") return day + " " + m + " " + y;
    if (d.precision === "month") return m + " " + y;
    return String(y);
  };

  /** Whole calendar years + remaining days between two dates (UTC). */
  LKP.elapsed = function (from, now) {
    now = now || new Date();
    let years = now.getUTCFullYear() - from.getUTCFullYear();
    const anniversary = function (y) { return new Date(Date.UTC(from.getUTCFullYear() + y, from.getUTCMonth(), from.getUTCDate())); };
    let a = anniversary(years);
    if (a > now) { years -= 1; a = anniversary(years); }
    return {
      years: Math.max(0, years),
      days: Math.max(0, Math.floor((now - a) / 86400000)),
      seconds: Math.max(0, Math.floor((now - from) / 1000))
    };
  };

  LKP.plural = function (n, one, many) { return n + " " + (n === 1 ? one : many); };

  LKP.fmtElapsed = function (e) {
    return LKP.plural(e.years, "yr", "yrs") + " " + LKP.plural(e.days, "day", "days");
  };

  LKP.fmtInt = function (n) { return Math.round(n).toLocaleString("en-US"); };

  /** 384400 -> "384,400 km", 2.04e8 -> "204 million km", 2.59e10 -> "25.9 billion km" */
  LKP.fmtKm = function (km) {
    if (km >= 1e9) return (km / 1e9).toFixed(1).replace(/\.0$/, "") + " billion km";
    if (km >= 1e6) return Math.round(km / 1e6) + " million km";
    return LKP.fmtInt(km) + " km";
  };

  /** Seconds -> friendly duration. */
  LKP.fmtDuration = function (sec) {
    if (sec < 60) return sec.toFixed(sec < 10 ? 2 : 1) + " seconds";
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
    if (sec < 3600) return m + " min " + s + " s";
    return h + " h " + m + " min";
  };

  /* ---------- Tiny event bus ---------- */
  const handlers = {};
  LKP.bus = {
    on: function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
    emit: function (evt, data) { (handlers[evt] || []).forEach(function (fn) { fn(data); }); }
  };

  /* ---------- Read-aloud (Web Speech API) ---------- */
  const synth = window.speechSynthesis;
  let activeBtn = null;

  function setBtn(btn, on) {
    if (!btn) return;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const label = btn.querySelector("span");
    const use = btn.querySelector("use");
    if (label) label.textContent = on ? "Stop" : "Listen";
    if (use) use.setAttribute("href", on ? "#i-stop" : "#i-play");
  }

  function pickVoice() {
    const voices = synth.getVoices();
    return voices.find(function (v) { return /en-(US|GB)/i.test(v.lang) && /natural|neural|google|samantha|daniel/i.test(v.name); }) ||
      voices.find(function (v) { return /^en/i.test(v.lang); }) || null;
  }

  LKP.speech = {
    supported: !!(synth && window.SpeechSynthesisUtterance),
    toggle: function (text, btn) {
      if (!this.supported) return;
      if (activeBtn === btn && (synth.speaking || synth.pending)) { this.stop(); return; }
      this.stop();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || "en-US";
      u.rate = 0.96;
      u.onend = u.onerror = function () { if (activeBtn === btn) { setBtn(btn, false); activeBtn = null; } };
      activeBtn = btn;
      setBtn(btn, true);
      synth.speak(u);
    },
    stop: function () {
      if (!this.supported) return;
      synth.cancel();
      setBtn(activeBtn, false);
      activeBtn = null;
    }
  };
})();

/* ==========================================================================
   Shared science helpers: photos, map sites, orbits and spacecraft positions
   ========================================================================== */
(function () {
  "use strict";

  const LKP = window.LKP;
  const DEG = Math.PI / 180;
  const AU_KM = 149597870.7;
  const C_KM_S = 299792.458;

  LKP.AU_KM = AU_KM;
  LKP.C_KM_S = C_KM_S;

  /* ---------- Photos ---------- */
  LKP.img = function (g) { return (LKP.images && LKP.images[g.id]) || null; };

  /** Small photo of a machine, or its icon when no photo exists. */
  LKP.thumb = function (g, cls) {
    const im = LKP.img(g);
    cls = cls || "thumb";
    if (!im) return '<span class="' + cls + " " + cls + '--icon">' + LKP.kindIcon(g) + "</span>";
    return '<img class="' + cls + '" src="' + im.thumb + '" alt="" width="400" height="300" loading="lazy" decoding="async">';
  };

  /* ---------- Map sites: machines that share a place share one marker ---------- */
  LKP.sitesFor = function (world) {
    const sites = new Map();
    LKP.ghosts.forEach(function (g) {
      if (g.world !== world || !g.loc) return;
      g.loc.forEach(function (l) {
        if (!sites.has(l.site)) sites.set(l.site, { id: l.site, name: l.siteName, lat: l.lat, lon: l.lon, ghosts: [] });
        const s = sites.get(l.site);
        if (s.ghosts.indexOf(g) === -1) s.ghosts.push(g);
      });
    });
    return Array.from(sites.values());
  };

  /** A site shows the "liveliest" status among its machines. */
  LKP.siteStatus = function (site) {
    return site.ghosts.map(function (g) { return g.status; })
      .sort(function (a, b) { return LKP.STATUS[a].order - LKP.STATUS[b].order; })[0];
  };

  /* ---------- Orbits ---------------------------------------------------------
     Keplerian elements and rates from JPL "Approximate Positions of the Planets",
     Table 1 (valid 1800–2050). Pluto uses the elements JPL published for the same
     period. Checked against JPL Horizons for 10 Nov 2026: every body is within
     0.13% of its true distance and 0.07° of its true direction.
     Order: a (au), e, I (deg), L (deg), long. of perihelion (deg), long. of node (deg);
     each as [value at J2000, change per century].
     ------------------------------------------------------------------------ */
  const ELEMENTS = {
    mercury: [[0.38709927, 0.00000037], [0.20563593, 0.00001906], [7.00497902, -0.00594749], [252.2503235, 149472.67411175], [77.45779628, 0.16047689], [48.33076593, -0.12534081]],
    venus: [[0.72333566, 0.0000039], [0.00677672, -0.00004107], [3.39467605, -0.0007889], [181.9790995, 58517.81538729], [131.60246718, 0.00268329], [76.67984255, -0.27769418]],
    earth: [[1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668], [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]],
    mars: [[1.52371034, 0.00001847], [0.0933941, 0.00007882], [1.84969142, -0.00813131], [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]],
    jupiter: [[5.202887, -0.00011607], [0.04838624, -0.00013253], [1.30439695, -0.00183714], [34.39644051, 3034.74612775], [14.72847983, 0.21252668], [100.47390909, 0.20469106]],
    saturn: [[9.53667594, -0.0012506], [0.05386179, -0.00050991], [2.48599187, 0.00193609], [49.95424423, 1222.49362201], [92.59887831, -0.41897216], [113.66242448, -0.28867794]],
    uranus: [[19.18916464, -0.00196176], [0.04725744, -0.00004397], [0.77263783, -0.00242939], [313.23810451, 428.48202785], [170.9542763, 0.40805281], [74.01692503, 0.04240589]],
    neptune: [[30.06992276, 0.00026291], [0.00859048, 0.00005105], [1.77004347, 0.00035372], [-55.12002969, 218.45945325], [44.96476227, -0.32241464], [131.78422574, -0.00508664]],
    pluto: [[39.48211675, -0.00031596], [0.2488273, 0.0000517], [17.14001206, 0.00004818], [238.92903833, 145.20780515], [224.06891629, -0.04062942], [110.30393684, -0.01183482]]
  };

  function julianDay(date) { return date.getTime() / 86400000 + 2440587.5; }

  /* Small worlds and craft on closed orbits: fixed JPL Horizons elements (LKP.smallOrbits), two-body motion. */
  const SMALL = LKP.smallOrbits || {};

  function elementsAt(id, date) {
    const f = SMALL[id];
    if (f) {
      const M = f.M + f.n * (julianDay(date) - SMALL.epochJD);
      return { a: f.a, e: f.e, I: f.i * DEG, M: ((M % 360 + 540) % 360 - 180) * DEG, om: f.peri * DEG, Om: f.node * DEG };
    }
    const k = ELEMENTS[id];
    const T = (julianDay(date) - 2451545.0) / 36525;
    const v = function (x) { return x[0] + x[1] * T; };
    const L = v(k[3]), w = v(k[4]), O = v(k[5]);
    return { a: v(k[0]), e: v(k[1]), I: v(k[2]) * DEG, M: (((L - w) % 360 + 540) % 360 - 180) * DEG, om: (w - O) * DEG, Om: O * DEG };
  }

  /* Position on the orbit for eccentric anomaly E: heliocentric ecliptic [x, y, z] in au. */
  function onOrbit(el, E) {
    const xp = el.a * (Math.cos(E) - el.e), yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    const co = Math.cos(el.om), so = Math.sin(el.om), cO = Math.cos(el.Om), sO = Math.sin(el.Om), cI = Math.cos(el.I), sI = Math.sin(el.I);
    return [
      (co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp,
      (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp,
      so * sI * xp + co * sI * yp
    ];
  }

  function helio(id, date) {
    const el = elementsAt(id, date);
    let E = el.M + el.e * Math.sin(el.M);
    for (let i = 0; i < 15; i++) E -= (E - el.e * Math.sin(E) - el.M) / (1 - el.e * Math.cos(E));
    return onOrbit(el, E);
  }

  /* The whole orbit as n + 1 points (for drawing). */
  function path(id, date, n) {
    const el = elementsAt(id, date), pts = [];
    for (let i = 0; i <= n; i++) pts.push(onOrbit(el, (i / n) * 2 * Math.PI));
    return pts;
  }

  /* The Moon seen from Earth (low-precision series, good to about 1.5°): unit direction and distance. */
  function moon(date) {
    const d = julianDay(date) - 2451545.0;
    const M = (134.963 + 13.064993 * d) * DEG;
    const lon = (218.316 + 13.176396 * d) * DEG + 6.289 * DEG * Math.sin(M);
    const lat = 5.128 * DEG * Math.sin((93.272 + 13.22935 * d) * DEG);
    return { dir: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)], km: 385001 - 20905 * Math.cos(M) };
  }

  /* A spacecraft: on a closed orbit, or (far away) straight-line motion from its JPL Horizons position and velocity. */
  function probe(id, date) {
    const p = LKP.probes && LKP.probes[id];
    if (!p || date < LKP.parseDate(p.validFrom).date) return null;
    if (p.orbit) return helio(id, date);
    const dt = julianDay(date) - LKP.probeEpochJD;
    return [p.p[0] + p.v[0] * dt, p.p[1] + p.v[1] * dt, p.p[2] + p.v[2] * dt];
  }

  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

  LKP.orbit = {
    ids: Object.keys(ELEMENTS).concat((LKP.bodies || []).filter(function (b) { return SMALL[b.id]; }).map(function (b) { return b.id; })),
    helio: helio,
    path: path,
    moon: moon,
    probe: probe,
    dist: dist,
    /** Distance from Earth, in km, of a heliocentric position (au). */
    fromEarthKm: function (vec, date) { return dist(vec, helio("earth", date)) * AU_KM; },
    probeSpeedKmS: function (id, date) {
      const p = LKP.probes[id];
      if (p.orbit) { const d = date || new Date(); return dist(helio(id, d), helio(id, new Date(d.getTime() + 3600000))) * AU_KM / 3600; }
      return Math.hypot(p.v[0], p.v[1], p.v[2]) * AU_KM / 86400;
    }
  };
})();
