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
    reflector: "i-reflector", seismometer: "i-seismometer", impact: "i-impact", orbiter: "i-orbiter"
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
