/* ==========================================================================
   Last Known Position: the solar system simulator (ES module, Three.js)
   --------------------------------------------------------------------------
   What is real: where every planet, the Moon and each spacecraft is on the
   chosen date (JPL orbital elements and JPL Horizons trajectories), and where
   each machine sits on the Moon and Mars (measured coordinates).
   What is adjusted so you can see it: the sizes of the worlds, the Moon's
   distance from Earth, and (in "Easy view") the spacing between orbits.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "../vendor/three-0.170.0/OrbitControls.js";

const LKP = window.LKP;
const $ = LKP.$, $$ = LKP.$$, esc = LKP.esc;
const orbit = LKP.orbit;

const TEX = "assets/textures/";
const DEG = Math.PI / 180;
const UNIT = 40;          // scene units per au in "True distances"
const MOON_D = 3.4;       // the Moon's drawn distance from Earth (enlarged)
const MIN_DATE = Date.UTC(1960, 0, 1), MAX_DATE = Date.UTC(2050, 0, 1);
/* Local calendar date as YYYY-MM-DD (the reader's own "today", not UTC). */
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* How each world is drawn. r = drawn radius in scene units (not to scale). */
const VIS = {
  sun: { r: 5.5, tex: "sun.jpg" },
  mercury: { r: 0.9, tex: "mercury.jpg" },
  venus: { r: 1.4, tex: "venus.jpg", tilt: 2.6 },
  earth: { r: 1.5, tex: "earth.jpg", tilt: 23.44 },
  moon: { r: 0.62, tex: "moon_4k.jpg", bump: "moon_bump.jpg", detail: true },
  mars: { r: 1.2, tex: "mars_4k.jpg?v=2", tilt: 25.19, detail: true },
  jupiter: { r: 4.4, tex: "jupiter.jpg", tilt: 3.13 },
  saturn: { r: 3.7, tex: "saturn.jpg", tilt: 26.73, ring: true },
  uranus: { r: 2.5, tex: "uranus.jpg", tilt: 97.77 },
  neptune: { r: 2.4, tex: "neptune.jpg", tilt: 28.32 },
  pluto: { r: 0.7 }
};
const STRIP_ORDER = ["sun", "mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const PROBE_ORDER = ["newhorizons", "pioneer11", "pioneer10", "voyager2", "voyager1"];
const VIEWS = { inner: 1.75, planets: 31, deep: 205 }; // au that each overview should fit
const LABEL_PRIORITY = ["earth", "mars", "moon", "sun", "jupiter", "saturn", "voyager1", "voyager2", "newhorizons", "pioneer10", "pioneer11", "venus", "mercury", "uranus", "neptune", "pluto"];

const root = document.getElementById("sim");
const S = {
  ready: false, failed: false, visible: false,
  date: new Date(), playing: false, speed: 1,
  scale: 0, scaleTarget: 0, scaleAnim: null,
  focus: null, view: "inner", fly: null,
  dirty: true, orbitDate: 0, cardSite: null, hotSite: null, zoomArmed: false
};
const O = {};            // every selectable object by id
const hitList = [];      // meshes used for click detection
let renderer, scene, camera, controls, sky, sunLight, headlight, earthLine, raf = 0, last = 0, lastInfo = 0;
let els = {};
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), lastFocusPos = new THREE.Vector3();
const reduce = () => LKP.reduceMotion.matches;

if (root) boot();

/* -------------------------------------------------------------------------- */
function boot() {
  els = {
    stage: $(".sim__stage", root), canvas: $(".sim__canvas", root), labels: $(".sim__labels", root), pins: $(".sim__pins", root),
    card: $(".sim-card", root), strip: $(".sim-strip", root), info: $("#sim-info"), status: $("#sim-status"),
    date: $("#sim-date"), dateInput: $("#sim-date-input"), play: $("#sim-play"), badge: $("#sim-badge"), hint: $(".sim__hint", root),
    loading: $(".sim__loading", root)
  };
  buildStrip();
  bindControls();
  root.dataset.state = "idle";

  LKP.sim = {
    focus: (id) => { if (start()) { focus(id); reveal(); } },
    focusGhost: (id) => { if (start()) { focusGhost(id); reveal(); } },
    available: true,
    /* For testing: run the simulator forward by a number of seconds without waiting for the screen. */
    step: (seconds) => { if (!start()) return; for (let t = 0; t < seconds; t += 1 / 30) tick(1 / 30, performance.now()); },
    state: () => ({ focus: S.focus, view: S.view, playing: S.playing, scale: S.scale, date: S.date.toISOString(), flying: !!S.fly })
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => {
      S.visible = en[0].isIntersecting;
      if (S.visible) { start(); loop(); }
    }, { rootMargin: "250px 0px" }).observe(els.stage);
  } else { S.visible = true; start(); loop(); }
  document.addEventListener("visibilitychange", loop);
}

function reveal() { LKP.scrollToEl(root, "center"); }

/* Create the 3D scene the first time it is needed. Returns false if WebGL is unavailable. */
function start() {
  if (S.ready) return true;
  if (S.failed) return false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: "high-performance" });
  } catch (e) {
    S.failed = true;
    root.dataset.state = "failed";
    LKP.sim.available = false;
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x03050b, 1);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.02, 400000);
  scene.add(camera);

  controls = new OrbitControls(camera, els.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 12;
  controls.maxDistance = 60000;
  /* Don't hijack page scrolling: the mouse wheel zooms only after a click on the scene. */
  S.zoomArmed = window.matchMedia && window.matchMedia("(hover: none)").matches;
  controls.enableZoom = S.zoomArmed;

  const manager = new THREE.LoadingManager();
  const done = () => { root.dataset.state = "ready"; };
  manager.onLoad = done;
  setTimeout(done, 15000);
  const loader = new THREE.TextureLoader(manager);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (file, color) => {
    const t = loader.load(TEX + file);
    if (color !== false) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };

  /* Lights: the Sun, a whisper of fill, and a "torch" on the camera for close-up exploring. */
  sunLight = new THREE.PointLight(0xffffff, 1.9, 0, 0);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.07));
  headlight = new THREE.DirectionalLight(0xffffff, 0);
  headlight.position.set(1.7, 1.1, 0.3); // off to one side, so craters and hills cast soft shading
  headlight.target.position.set(0, 0, -1.5);
  camera.add(headlight, headlight.target);

  /* Sky */
  sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 24),
    new THREE.MeshBasicMaterial({ map: tex("stars.jpg"), side: THREE.BackSide, color: 0xffffff, depthWrite: false, depthTest: false, fog: false })
  );
  sky.renderOrder = -10;
  sky.rotation.x = 60 * DEG; // the Milky Way is tilted against the plane of the planets
  scene.add(sky);

  /* Worlds */
  const glow = glowTexture();
  LKP.bodies.forEach((def) => {
    const vis = VIS[def.id];
    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = (vis.tilt || 0) * DEG;
    group.add(tilt);
    const seg = vis.detail ? 128 : 64;
    const geo = new THREE.SphereGeometry(vis.r, seg, seg / 2);
    let mat;
    if (def.id === "sun") {
      mat = new THREE.MeshBasicMaterial({ map: tex(vis.tex) });
    } else {
      mat = new THREE.MeshStandardMaterial({ map: vis.tex ? tex(vis.tex) : null, color: vis.tex ? 0xffffff : new THREE.Color(def.color), roughness: 1, metalness: 0 });
      if (vis.bump) { mat.bumpMap = tex(vis.bump, false); mat.bumpScale = 2.2; }
    }
    const mesh = new THREE.Mesh(geo, mat);
    tilt.add(mesh);

    if (def.id === "sun") {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb347, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
      halo.scale.set(34, 34, 1);
      group.add(halo);
    }
    if (vis.ring) tilt.add(saturnRing(vis.r, tex("saturn_ring.png")));

    const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(vis.r * 1.5, 1.7), 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.userData.id = def.id;
    group.add(hit);
    hitList.push(hit);
    scene.add(group);

    O[def.id] = { id: def.id, kind: "body", def, group, mesh, r: vis.r, au: [0, 0, 0], name: def.name, color: def.color, sites: def.world ? LKP.sitesFor(def.world) : null };
  });

  /* Orbit paths */
  orbit.ids.forEach((id) => {
    const N = 240;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 1) * 3), 3)),
      new THREE.LineBasicMaterial({ color: id === "earth" ? 0x6fb6ff : 0xc4d2eb, transparent: true, opacity: id === "earth" ? 0.5 : 0.24, depthWrite: false })
    );
    line.frustumCulled = false;
    scene.add(line);
    O[id].orbitLine = line;
    O[id].orbitN = N;
  });
  const ringPts = [];
  for (let i = 0; i <= 96; i++) ringPts.push(new THREE.Vector3(Math.cos((i / 96) * 2 * Math.PI) * MOON_D, 0, Math.sin((i / 96) * 2 * Math.PI) * MOON_D));
  O.earth.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0xc4d2eb, transparent: true, opacity: 0.2, depthWrite: false })));

  /* Spacecraft */
  Object.keys(LKP.probes).forEach((id) => {
    const g = LKP.byId[id];
    const group = new THREE.Group();
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: g.status === "working" ? 0x7df0d4 : 0xc9d3e3, sizeAttenuation: false, depthTest: false, transparent: true }));
    dot.scale.set(0.03, 0.03, 1);
    dot.userData.id = id;
    group.add(dot);
    hitList.push(dot);
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(25 * 3), 3)),
      new THREE.LineBasicMaterial({ color: 0x9fb7ff, transparent: true, opacity: 0.45, depthWrite: false })
    );
    trail.frustumCulled = false;
    scene.add(group, trail);
    O[id] = { id, kind: "probe", ghost: g, group, trail, r: 1, au: [0, 0, 0], name: g.name, color: g.status === "working" ? "#7df0d4" : "#c9d3e3" };
  });

  /* Dashed line from Earth to whatever is selected */
  earthLine = new THREE.Line(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3)),
    new THREE.LineDashedMaterial({ color: 0xf5c45a, transparent: true, opacity: 0.85, dashSize: 1, gapSize: 0.7, depthWrite: false })
  );
  earthLine.frustumCulled = false;
  earthLine.visible = false;
  scene.add(earthLine);

  buildLabels();
  bindStage();
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(els.stage);
  else window.addEventListener("resize", resize);

  S.ready = true;
  root.dataset.state = "loading";
  updatePositions();
  view("inner", true);
  renderInfo();
  syncHud();
  return true;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.22, "rgba(255,255,255,0.75)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.16)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function saturnRing(r, map) {
  const inner = r * 1.24, outer = r * 2.27;
  const geo = new THREE.RingGeometry(inner, outer, 128, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    v1.fromBufferAttribute(pos, i);
    uv.setXY(i, (v1.length() - inner) / (outer - inner), 0.5); // the texture is a strip that runs outward
  }
  const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.92 }));
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

/* ---------- Distances -------------------------------------------------------- */
/* "Easy view" squeezes the outer solar system (square-root spacing). "True distances" is linear. */
function dispR(rAu, blend) {
  const easy = UNIT * Math.sqrt(rAu), real = UNIT * rAu;
  return easy + (real - easy) * blend;
}
function toScene(au, out, blend) {
  const r = Math.hypot(au[0], au[1], au[2]);
  if (r < 1e-9) return out.set(0, 0, 0);
  const k = dispR(r, blend === undefined ? S.scale : blend) / r;
  return out.set(au[0] * k, au[2] * k, -au[1] * k); // ecliptic x, y, z -> scene x, -z, y
}

function updatePositions() {
  const d = S.date;
  orbit.ids.forEach((id) => { O[id].au = orbit.helio(id, d); toScene(O[id].au, O[id].group.position); });

  /* The Moon: real direction from Earth, enlarged distance, same face always toward Earth. */
  const m = orbit.moon(d), e = O.earth.au, k = m.km / LKP.AU_KM;
  O.moon.au = [e[0] + m.dir[0] * k, e[1] + m.dir[1] * k, e[2] + m.dir[2] * k];
  O.moon.km = m.km;
  v1.set(m.dir[0], m.dir[2], -m.dir[1]);
  O.moon.group.position.copy(O.earth.group.position).addScaledVector(v1, MOON_D);
  O.moon.mesh.rotation.y = Math.atan2(v1.z, -v1.x);

  /* Spacecraft and the path each has flown over the last 24 years */
  Object.keys(LKP.probes).forEach((id) => {
    const o = O[id], au = orbit.probe(id, d);
    o.group.visible = o.trail.visible = !!au;
    if (!au) return;
    o.au = au;
    toScene(au, o.group.position);
    const arr = o.trail.geometry.attributes.position.array;
    const from = LKP.parseDate(LKP.probes[id].validFrom).date.getTime();
    for (let i = 0; i < 25; i++) {
      const t = Math.max(from, d.getTime() - i * 365.25 * 86400000);
      toScene(orbit.probe(id, new Date(t)), v2);
      arr[i * 3] = v2.x; arr[i * 3 + 1] = v2.y; arr[i * 3 + 2] = v2.z;
    }
    o.trail.geometry.attributes.position.needsUpdate = true;
  });

  /* Orbit paths only need redrawing when the scale changes or the date moves a long way. */
  if (S.scaleAnim || Math.abs(d.getTime() - S.orbitDate) > 400 * 86400000 || S.orbitScale !== S.scale) {
    orbit.ids.forEach((id) => {
      const o = O[id], pts = orbit.path(id, d, o.orbitN), arr = o.orbitLine.geometry.attributes.position.array;
      for (let i = 0; i < pts.length; i++) { toScene(pts[i], v2); arr[i * 3] = v2.x; arr[i * 3 + 1] = v2.y; arr[i * 3 + 2] = v2.z; }
      o.orbitLine.geometry.attributes.position.needsUpdate = true;
    });
    S.orbitDate = d.getTime();
    S.orbitScale = S.scale;
  }

  /* Earth -> selection */
  const f = O[S.focus];
  earthLine.visible = !!f && S.focus !== "earth" && S.focus !== "sun" && f.group.visible;
  if (earthLine.visible) {
    const arr = earthLine.geometry.attributes.position.array, a = O.earth.group.position, b = f.group.position;
    arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
    earthLine.geometry.attributes.position.needsUpdate = true;
    earthLine.computeLineDistances();
    const len = a.distanceTo(b);
    earthLine.material.dashSize = len / 70;
    earthLine.material.gapSize = len / 110;
  }
}

/* ---------- Camera ----------------------------------------------------------- */
function aspectFit() { return camera.aspect < 1 ? Math.min(2.4, 1 / camera.aspect) * 0.9 : 1; }

function flyTo(target, position, followId, instant) {
  const follow = followId ? O[followId].group.position : null;
  S.fly = {
    t: 0, dur: instant || reduce() ? 0 : 1.5,
    p0: camera.position.clone(), t0: controls.target.clone(),
    p1: position.clone().sub(follow || v3.set(0, 0, 0)), t1: target.clone().sub(follow || v3.set(0, 0, 0)), follow
  };
  controls.enabled = false;
}

/* Whole-system views. */
function view(name, instant) {
  S.focus = null;
  S.view = name;
  hideCard(true);
  const R = dispR(VIEWS[name], S.scaleTarget) * aspectFit();
  controls.minDistance = 12;
  flyTo(new THREE.Vector3(0, 0, 0), new THREE.Vector3(R * 0.25, R * 0.85, R * 1.9), null, instant);
  buildPins();
  renderInfo();
  syncHud();
  S.dirty = true;
}

function focus(id, opts) {
  const o = O[id];
  if (!o) return;
  if (o.kind === "probe" && !o.group.visible) { setDate(new Date()); }
  S.focus = id;
  S.view = null;
  hideCard(true);
  if (o.sites) setPlaying(false); // hold the world still so its pins can be tapped
  updatePositions();

  const pos = o.group.position;
  const fit = aspectFit();
  let dist, dir = new THREE.Vector3();
  if (opts && opts.dir) { dir.copy(opts.dir); dist = o.r * 3.1 * fit; }
  else if (o.kind === "probe") { dir.copy(pos).normalize().multiplyScalar(1).add(v1.set(0, 0.32, 0)); dist = 15; }
  else if (id === "sun") { dir.set(0.2, 0.45, 1); dist = o.r * 5 * fit; }
  else if (id === "moon") { dir.copy(O.earth.group.position).sub(pos).normalize().add(v1.set(0, 0.14, 0)); dist = o.r * 3.4 * fit; }
  else {
    const sunward = v1.copy(pos).normalize().negate();
    const side = v2.crossVectors(sunward, v3.set(0, 1, 0)).normalize();
    dir.copy(sunward).multiplyScalar(0.8).addScaledVector(side, 0.5).add(v3.set(0, 0.28, 0));
    dist = o.r * (o.sites ? 3.4 : 4.4) * fit;
  }
  dir.normalize();
  controls.minDistance = o.kind === "probe" ? 4 : o.r * 1.22;
  flyTo(pos.clone(), pos.clone().addScaledVector(dir, dist), id);
  lastFocusPos.copy(pos);
  buildPins();
  renderInfo();
  syncHud();
  if (els.status) els.status.textContent = "Now viewing " + o.name + ".";
  S.dirty = true;
}

/* Fly to the exact spot on the Moon or Mars where a machine sits, or to a spacecraft. */
function focusGhost(ghostId) {
  const g = LKP.byId[ghostId];
  if (!g) return;
  if (O[ghostId] && O[ghostId].kind === "probe") { focus(ghostId); return; }
  const body = O[g.world];
  if (!body) return;
  if (!g.loc) { focus(g.world); return; }
  updatePositions();
  body.group.updateWorldMatrix(true, true);
  const l = g.loc[0];
  const dir = latLon(l.lat, l.lon, 1).applyMatrix4(body.mesh.matrixWorld).sub(body.group.position).normalize();
  S.hotSite = l.site;
  focus(g.world, { dir });
  setTimeout(() => { S.hotSite = null; $$(".sim-pin.is-hot", els.pins).forEach((p) => p.classList.remove("is-hot")); }, 6000);
}

/* Latitude / east longitude on a world -> a point in that world's own frame.
   Matches a map texture that runs from 180° W (left edge) to 180° E (right edge). */
function latLon(lat, lon, r) {
  const la = lat * DEG, lo = lon * DEG;
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

function zoomBy(f) {
  if (S.fly) return;
  v1.copy(camera.position).sub(controls.target);
  const len = THREE.MathUtils.clamp(v1.length() * f, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).addScaledVector(v1.normalize(), len);
}

/* ---------- Time and scale --------------------------------------------------- */
function setPlaying(on) {
  S.playing = on;
  if (!els.play) return;
  els.play.setAttribute("aria-pressed", on ? "true" : "false");
  els.play.setAttribute("aria-label", on ? "Pause time" : "Play time");
  $("use", els.play).setAttribute("href", on ? "#i-pause" : "#i-playtri");
  $("span", els.play).textContent = on ? "Pause" : "Play";
}
function setDate(d) {
  S.date = new Date(THREE.MathUtils.clamp(d.getTime(), MIN_DATE, MAX_DATE));
  S.dirty = true;
  syncHud();
}
function setScale(target) {
  if (S.scaleTarget === target) return;
  S.scaleTarget = target;
  S.scaleAnim = { from: S.scale, t: 0 };
  if (!S.focus) view(S.view || "inner");
  syncHud();
}

/* ---------- Heads-up display ------------------------------------------------- */
function buildStrip() {
  const chip = (id, name, color, n) =>
    '<button class="sim-chip" type="button" data-focus="' + id + '" aria-pressed="false"><i style="--c:' + color + '"></i>' + esc(name) +
    (n ? '<b class="sim-chip__n" title="' + n + ' machines here">' + n + "</b>" : "") + "</button>";
  const count = (w) => LKP.ghosts.filter((g) => g.world === w).length;
  els.strip.innerHTML =
    STRIP_ORDER.map((id) => { const b = LKP.bodies.find((x) => x.id === id); return chip(id, b.name.replace("The ", ""), b.color, b.world ? count(b.world) : 0); }).join("") +
    '<span class="sim-strip__gap" aria-hidden="true"></span>' +
    PROBE_ORDER.map((id) => chip(id, LKP.byId[id].name, LKP.byId[id].status === "working" ? "#7df0d4" : "#c9d3e3")).join("");
}

function buildLabels() {
  els.labels.innerHTML = Object.keys(O).map((id) =>
    '<button class="sim-label" type="button" tabindex="-1" data-focus="' + id + '"><i style="--c:' + O[id].color + '"></i>' + esc(O[id].name.replace("The ", "")) + "</button>").join("");
  $$(".sim-label", els.labels).forEach((el) => { O[el.dataset.focus].label = el; });
}

function buildPins() {
  const o = O[S.focus];
  els.pins.innerHTML = "";
  if (!o || !o.sites) { o && (o.pinList = null); return; }
  o.pinList = o.sites.map((site) => {
    const el = document.createElement("button");
    const n = site.ghosts.length;
    el.type = "button";
    el.className = "sim-pin sim-pin--" + LKP.siteStatus(site) + (S.hotSite === site.id ? " is-hot" : "");
    el.setAttribute("aria-label", (n === 1 ? site.ghosts[0].name : site.name + ", " + n + " machines") + ". Open.");
    el.innerHTML = '<span class="sim-pin__dot"></span>' + (n > 1 ? '<span class="sim-pin__n">' + n + "</span>" : "");
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (n === 1) LKP.openDossier(site.ghosts[0].id, el);
      else showCard(site, el, true);
    });
    el.addEventListener("pointerenter", () => { if (!S.cardSite) showCard(site, el, false); });
    el.addEventListener("pointerleave", () => { if (!S.cardSite) hideCard(); });
    el.addEventListener("focus", () => { if (!S.cardSite) showCard(site, el, false); });
    el.addEventListener("blur", () => { if (!S.cardSite) hideCard(); });
    els.pins.appendChild(el);
    return { el, site, local: latLon(site.lat, site.lon, o.r * 1.004), x: 0, y: 0, shown: true };
  });
}

/* Preview card for a pin: a photo first, so a place is never "just a dot". */
function showCard(site, pinEl, sticky) {
  const gs = site.ghosts;
  if (sticky) {
    S.cardSite = site.id;
    els.card.innerHTML = '<p class="sim-card__site">' + esc(site.name) + "</p><ul class=\"sim-card__list\" role=\"list\">" + gs.map((g) =>
      '<li><button class="sim-card__item" type="button" data-open="' + g.id + '">' + LKP.thumb(g, "sim-card__thumb") +
      "<span><strong>" + esc(g.name) + "</strong><small>" + esc(LKP.STATUS[g.status].label) + "</small></span></button></li>").join("") + "</ul>";
    els.card.classList.add("is-sticky");
  } else {
    const g = gs[0], im = LKP.img(g);
    els.card.innerHTML = (im ? '<img class="sim-card__img" src="' + im.thumb + '" alt="" width="400" height="300">' : "") +
      '<div class="sim-card__body"><p class="sim-card__site">' + esc(gs.length > 1 ? site.name : g.mission.split(" · ")[0] + " · " + g.year) + "</p>" +
      "<strong>" + esc(gs.length > 1 ? gs.length + " machines are here" : g.name) + "</strong>" +
      "<small>" + (gs.length > 1 ? "Click to choose one" : esc(LKP.STATUS[g.status].label) + " · click to open") + "</small></div>";
    els.card.classList.remove("is-sticky");
  }
  els.card.hidden = false;
  els.card._pin = pinEl;
  placeCard();
  if (sticky) { const first = $(".sim-card__item", els.card); if (first) first.focus({ preventScroll: true }); }
}
function hideCard(force) {
  if (S.cardSite && !force) return;
  S.cardSite = null;
  if (els.card) { els.card.hidden = true; els.card._pin = null; }
}
function placeCard() {
  const pin = els.card._pin && O[S.focus] && O[S.focus].pinList && O[S.focus].pinList.find((p) => p.el === els.card._pin);
  if (!pin) return;
  const W = els.stage.clientWidth, H = els.stage.clientHeight, cw = els.card.offsetWidth, ch = els.card.offsetHeight;
  let x = pin.x + 20, y = pin.y - ch / 2;
  if (x + cw > W - 10) x = pin.x - cw - 20;
  x = Math.max(10, Math.min(x, W - cw - 10));
  y = Math.max(10, Math.min(y, H - ch - 64));
  els.card.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
}

const fmtAu = (au) => (au < 10 ? au.toFixed(2) : au < 100 ? au.toFixed(1) : Math.round(au)) + " au";

function stats(id) {
  const o = O[id], e = O.earth.au;
  const sunAu = Math.hypot(o.au[0], o.au[1], o.au[2]);
  const earthKm = id === "moon" ? o.km : orbit.dist(o.au, e) * LKP.AU_KM;
  return {
    sun: fmtAu(sunAu) + " · " + LKP.fmtKm(sunAu * LKP.AU_KM),
    earth: LKP.fmtKm(earthKm),
    light: LKP.fmtDuration(earthKm / LKP.C_KM_S)
  };
}

function statRow(label, key, value) { return '<div class="sim-stat"><dt>' + label + "</dt><dd" + (key ? ' data-stat="' + key + '"' : "") + ">" + value + "</dd></div>"; }

function renderInfo() {
  if (!S.ready || !els.info) return;
  const id = S.focus;
  let h = "";
  if (!id) {
    h = '<p class="kicker">Live · real positions</p><h3 class="sim-info__title">The solar system</h3>' +
      '<p class="sim-info__fact">Every world is where it really is on the date shown. Tap a world or a spacecraft to fly there, then look for the glowing pins on the Moon and Mars.</p>' +
      '<dl class="sim-stats">' + statRow("Earth to the Moon", "o-moon", "") + statRow("Earth to Mars", "o-mars", "") + statRow("Earth to Voyager 1", "o-voyager1", "") + "</dl>" +
      '<div class="sim-info__actions"><button class="btn btn--small btn--primary" type="button" data-focus="moon">Explore the Moon</button>' +
      '<button class="btn btn--small" type="button" data-focus="mars">Explore Mars</button></div>';
  } else if (O[id].kind === "probe") {
    const g = O[id].ghost, p = LKP.probes[id], im = LKP.img(g);
    h = '<p class="kicker">Spacecraft · ' + esc(LKP.STATUS[g.status].label) + '</p><h3 class="sim-info__title">' + esc(g.name) + "</h3>" +
      (im ? '<img class="sim-info__img" src="' + im.thumb + '" alt="' + esc(im.caption) + '" width="400" height="300">' : "") +
      '<dl class="sim-stats">' + statRow("From the Sun", "sun", "") + statRow("From Earth", "earth", "") + statRow("Signal travel time", "light", "") +
      statRow("Speed", null, orbit.probeSpeedKmS(id).toFixed(1) + " km every second") + "</dl>" +
      '<p class="sim-info__fact">' + esc(g.hook) + (p.tracked ? "" : " This is its predicted position: nobody has heard from it since " + LKP.fmtDate(g.since) + ".") + "</p>" +
      '<div class="sim-info__actions"><button class="btn btn--small btn--primary" type="button" data-open="' + id + '">Read its story</button></div>';
  } else {
    const d = O[id].def, n = d.world ? LKP.ghosts.filter((g) => g.world === d.world).length : 0;
    h = '<p class="kicker">' + esc(d.type) + '</p><h3 class="sim-info__title">' + esc(d.name) + "</h3>" +
      '<dl class="sim-stats">' + (id === "sun" ? "" : statRow("From the Sun", "sun", "")) + (id === "earth" ? "" : statRow("From Earth", "earth", "") + statRow("Light travel time", "light", "")) +
      statRow("Diameter", null, LKP.fmtInt(d.diameterKm) + " km") + "</dl>" +
      '<p class="sim-info__fact">' + esc(d.fact) + "</p>" +
      (n ? '<p class="sim-info__call"><strong>' + n + " machines</strong> in this story came here. Tap a glowing pin on the globe to meet one.</p>" +
        '<div class="sim-info__actions"><a class="btn btn--small" href="#' + d.world + '">See the full list</a></div>' : "") +
      (d.visitedBy ? '<p class="sim-info__sub">Visited by</p><div class="sim-visitors">' + d.visitedBy.map((gid) =>
        '<button class="sim-visitor" type="button" data-open="' + gid + '">' + LKP.thumb(LKP.byId[gid], "sim-visitor__img") + "<span>" + esc(LKP.byId[gid].name) + "</span></button>").join("") + "</div>" : "");
  }
  els.info.innerHTML = h;
  updateInfoNumbers();
}

function updateInfoNumbers() {
  if (!els.info) return;
  $$("[data-stat]", els.info).forEach((el) => {
    const key = el.dataset.stat;
    if (key.indexOf("o-") === 0) {
      const o = O[key.slice(2)];
      if (!o.group.visible) { el.textContent = "Not launched yet"; return; }
      const s = stats(key.slice(2));
      el.textContent = s.earth + " · " + s.light;
    } else if (S.focus) { el.textContent = stats(S.focus)[key]; }
  });
}

function syncHud() {
  const today = ymd(S.date) === ymd(new Date());
  const text = LKP.fmtDate(ymd(S.date));
  if (els.date) els.date.textContent = text + (today ? " · today" : "");
  if (els.badge) els.badge.textContent = text + " · " + (S.scaleTarget ? "True distances" : "Easy view");
  if (els.dateInput && document.activeElement !== els.dateInput) els.dateInput.value = ymd(S.date);
  $$("[data-focus]", els.strip).forEach((b) => {
    const on = b.dataset.focus === S.focus;
    if (on && b.getAttribute("aria-pressed") !== "true") {
      /* keep the chosen world in view inside the strip (sideways only, never moves the page) */
      els.strip.scrollTo({ left: b.offsetLeft - (els.strip.clientWidth - b.offsetWidth) / 2, behavior: reduce() ? "auto" : "smooth" });
    }
    b.setAttribute("aria-pressed", on ? "true" : "false");
    if (O[b.dataset.focus]) b.disabled = O[b.dataset.focus].kind === "probe" && !O[b.dataset.focus].group.visible;
  });
  $$("[data-scale]", root).forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.scale) === S.scaleTarget ? "true" : "false"));
  $$("[data-view]", root).forEach((b) => b.setAttribute("aria-pressed", !S.focus && b.dataset.view === S.view ? "true" : "false"));
  $$("[data-speed]", root).forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.speed) === S.speed ? "true" : "false"));
}

function bindControls() {
  /* Anything with data-focus (strip, labels, info buttons) flies to that world. */
  root.addEventListener("click", (e) => {
    const f = e.target.closest("[data-focus]");
    if (f) { if (start()) focus(f.dataset.focus); return; }
    const sc = e.target.closest("[data-scale]");
    if (sc) { if (start()) setScale(Number(sc.dataset.scale)); return; }
    const vw = e.target.closest("[data-view]");
    if (vw) { if (start()) view(vw.dataset.view); return; }
    const sp = e.target.closest("[data-speed]");
    if (sp) { S.speed = Number(sp.dataset.speed); if (start()) { setPlaying(true); syncHud(); } return; }
    const z = e.target.closest("[data-zoom]");
    if (z && start()) zoomBy(z.dataset.zoom === "in" ? 0.72 : 1.38);
  });
  if (els.play) els.play.addEventListener("click", () => { if (start()) setPlaying(!S.playing); });
  const today = $("#sim-today");
  if (today) today.addEventListener("click", () => { if (start()) { setPlaying(false); setDate(new Date()); } });
  if (els.dateInput) els.dateInput.addEventListener("change", () => {
    const d = new Date(els.dateInput.value + "T12:00:00");
    if (!isNaN(d) && start()) { setPlaying(false); setDate(d); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.cardSite) hideCard(true); });
  els.card.addEventListener("click", (e) => { if (e.target.closest("[data-open]")) setTimeout(() => hideCard(true), 0); });
}

function bindStage() {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const pick = (e) => {
    const r = els.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(hitList.filter((h) => h.parent.visible), false);
    return hits.length ? hits[0].object.userData.id : null;
  };
  els.canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
    if (!S.zoomArmed) { S.zoomArmed = true; controls.enableZoom = true; }
    root.classList.add("is-touched");
  });
  els.canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } // a drag, not a tap
    down = null;
    if (S.cardSite) { hideCard(true); return; }
    const id = pick(e);
    if (id && id !== S.focus) focus(id);
  });
  let moveT = 0;
  els.canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || performance.now() - moveT < 60) return;
    moveT = performance.now();
    els.canvas.style.cursor = pick(e) ? "pointer" : "grab";
  });
  els.stage.addEventListener("mouseleave", () => {
    if (window.matchMedia("(hover: none)").matches) return;
    S.zoomArmed = false;
    controls.enableZoom = false;
  });
}

function resize() {
  const w = els.stage.clientWidth, h = els.stage.clientHeight;
  if (!w || !h || !renderer) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---------- Per-frame overlays ---------------------------------------------- */
function updateLabels(W, H) {
  const f = O[S.focus];
  const closeUp = f && f.kind === "body" && camera.position.distanceTo(f.group.position) < f.r * 9;
  const nearEarth = camera.position.distanceTo(O.earth.group.position) < 70;
  const taken = [];
  const k = H / (2 * Math.tan((camera.fov * DEG) / 2));
  LABEL_PRIORITY.forEach((id) => {
    const o = O[id], el = o.label;
    let show = o.group.visible && !closeUp && (id !== "moon" || nearEarth);
    if (show) {
      v1.copy(o.group.position).project(camera);
      show = v1.z < 1 && Math.abs(v1.x) < 1.05 && Math.abs(v1.y) < 1.05;
      if (show) {
        const dist = camera.position.distanceTo(o.group.position);
        const rpx = o.kind === "probe" ? 8 : Math.min(140, (o.r / dist) * k);
        const x = (v1.x * 0.5 + 0.5) * W + rpx * 0.72 + 8, y = (-v1.y * 0.5 + 0.5) * H - rpx * 0.72 - 8;
        const w = el.offsetWidth || 80, box = [x - 4, y - 14, x + w + 4, y + 14];
        if (id !== S.focus && taken.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) show = false;
        else { taken.push(box); el.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y - 13) + "px)"; }
      }
    }
    if (el._shown !== show) { el._shown = show; el.classList.toggle("is-on", show); }
  });
}

function updatePins(W, H) {
  const o = O[S.focus];
  const on = !!(o && o.pinList && !S.fly && camera.position.distanceTo(o.group.position) < o.r * 14);
  if (els.pins._on !== on) { els.pins._on = on; els.pins.classList.toggle("is-on", on); if (!on) hideCard(true); }
  if (!on) return;
  o.group.updateWorldMatrix(true, true);
  for (const p of o.pinList) {
    v1.copy(p.local).applyMatrix4(o.mesh.matrixWorld);
    const facing = v2.copy(v1).sub(o.group.position).normalize().dot(v3.copy(camera.position).sub(v1).normalize());
    const shown = facing > 0.12;
    if (p.shown !== shown) { p.shown = shown; p.el.hidden = !shown; }
    if (!shown) continue;
    v1.project(camera);
    p.x = (v1.x * 0.5 + 0.5) * W;
    p.y = (-v1.y * 0.5 + 0.5) * H;
    p.el.style.transform = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px)";
    if (S.hotSite === p.site.id) p.el.classList.add("is-hot");
  }
  if (!els.card.hidden) {
    const pin = o.pinList.find((p) => p.el === els.card._pin);
    if (pin && !pin.shown) hideCard(true); else placeCard();
  }
}

/* ---------- Main loop --------------------------------------------------------- */
function loop() {
  if (raf || !S.ready || !S.visible) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function frame(now) {
  raf = 0;
  if (!S.visible) return;
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tick(dt, now);
}

/* One step of the simulation and one drawn picture. */
function tick(dt, now) {

  if (S.playing) {
    const t = S.date.getTime() + dt * S.speed * 86400000;
    if (t <= MIN_DATE || t >= MAX_DATE) setPlaying(false);
    S.date = new Date(THREE.MathUtils.clamp(t, MIN_DATE, MAX_DATE));
    S.dirty = true;
  }
  if (S.scaleAnim) {
    S.scaleAnim.t = Math.min(1, S.scaleAnim.t + dt / (reduce() ? 0.001 : 1.4));
    S.scale = S.scaleAnim.from + (S.scaleTarget - S.scaleAnim.from) * ease(S.scaleAnim.t);
    S.dirty = true;
    if (S.scaleAnim.t >= 1) { updatePositions(); S.scaleAnim = null; }
  }
  if (S.dirty) { updatePositions(); S.dirty = false; if (S.playing) syncHud(); }

  /* A slow spin keeps the worlds alive (not real rotation speeds). The Moon and any world you are exploring stay still. */
  if (!reduce()) {
    for (const id of STRIP_ORDER) {
      if (id === "moon" || (id === S.focus && O[id].sites)) continue;
      O[id].mesh.rotation.y += dt * (id === "sun" ? 0.02 : 0.07);
    }
  }

  const f = O[S.focus];
  if (S.fly) {
    const a = S.fly;
    a.t = a.dur ? Math.min(1, a.t + dt / a.dur) : 1;
    const e = ease(a.t), base = a.follow || v3.set(0, 0, 0);
    camera.position.lerpVectors(a.p0, v1.copy(a.p1).add(base), e);
    controls.target.lerpVectors(a.t0, v2.copy(a.t1).add(base), e);
    if (a.t >= 1) { S.fly = null; controls.enabled = true; if (f) lastFocusPos.copy(f.group.position); }
  } else if (f) {
    /* Ride along with the selected world as it moves. */
    v1.copy(f.group.position).sub(lastFocusPos);
    if (v1.lengthSq() > 0) { camera.position.add(v1); controls.target.add(v1); lastFocusPos.copy(f.group.position); }
  }
  controls.update();
  sky.position.copy(camera.position);

  const want = f && f.kind === "body" && S.focus !== "sun" ? (f.sites ? 1.15 : 0.4) : 0.1;
  headlight.intensity += (want - headlight.intensity) * Math.min(1, dt * 3);

  renderer.render(scene, camera);
  const W = els.stage.clientWidth, H = els.stage.clientHeight;
  updateLabels(W, H);
  updatePins(W, H);
  if (now - lastInfo > 300) { lastInfo = now; updateInfoNumbers(); }
}
