/* ==========================================================================
   Last Known Position: atlas (Leaflet maps of the Moon and Mars)
   Base maps are NASA Trek WMTS tiles in an equirectangular (EPSG:4326) grid.
   ========================================================================== */
(function () {
  "use strict";

  const LKP = window.LKP;

  const TREK = "https://trek.nasa.gov/tiles/";
  const LAYERS = {
    moon: {
      url: TREK + "Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
      attribution: 'LRO WAC mosaic: NASA/GSFC/ASU · <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener">NASA Moon Trek</a>'
    },
    mars: {
      url: TREK + "Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
      attribution: 'Viking MDIM 2.1: NASA/JPL/USGS · <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">NASA Mars Trek</a>'
    }
  };

  const STATUS_COLOR = { working: "#62e6c9", silent: "#c9d3e3", lost: "#ff8a94", impact: "#c3b2ff" };

  const state = { maps: {}, byGhost: {}, pending: {} };

  /* Group every location of every ghost on one world into map "sites". */
  function sitesFor(world) {
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
  }

  /* A site shows the "liveliest" status among its ghosts. */
  function siteStatus(site) {
    return site.ghosts.map(function (g) { return g.status; })
      .sort(function (a, b) { return LKP.STATUS[a].order - LKP.STATUS[b].order; })[0];
  }

  function markerIcon(site) {
    const n = site.ghosts.length;
    return L.divIcon({
      className: "lkp-marker lkp-marker--" + siteStatus(site),
      html: '<span class="lkp-marker__dot"></span>' + (n > 1 ? '<span class="lkp-marker__count">' + n + "</span>" : ""),
      iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14], tooltipAnchor: [0, -14]
    });
  }

  function popupHtml(site) {
    return '<p class="site-pop__title">' + LKP.esc(site.name) + '</p><ul class="site-pop__list">' +
      site.ghosts.map(function (g) {
        return '<li><button class="site-pop__btn" type="button" data-open="' + g.id + '">' +
          '<span class="site-pop__dot" style="--c:' + STATUS_COLOR[g.status] + '"></span>' + LKP.esc(g.name) + "</button></li>";
      }).join("") + "</ul>";
  }

  function fmtCoord(v, pos, neg) { return Math.abs(v).toFixed(2) + "° " + (v >= 0 ? pos : neg); }

  function showFallback(el, text) {
    if (el.querySelector(".atlas__fallback")) return;
    const p = document.createElement("p");
    p.className = "atlas__fallback";
    p.textContent = text || "The map imagery needs an internet connection. Every machine is still in the list.";
    el.appendChild(p);
  }

  function createMap(world, el) {
    if (state.maps[world]) return state.maps[world];
    if (!window.L) { showFallback(el, "The map library could not load. Every machine is still in the list."); return null; }

    const map = L.map(el, {
      crs: L.CRS.EPSG4326,
      center: [0, 0], zoom: 1, minZoom: 0, maxZoom: 8,
      zoomSnap: 0.25, zoomDelta: 0.5,
      maxBounds: [[-100, -210], [100, 210]], maxBoundsViscosity: 0.85,
      worldCopyJump: false, scrollWheelZoom: false, keyboard: true
    });
    map.attributionControl.setPrefix(false);

    const layer = L.tileLayer(LAYERS[world].url, {
      tileSize: 256, noWrap: true, bounds: [[-90, -180], [90, 180]],
      maxNativeZoom: 7, attribution: LAYERS[world].attribution
    });
    let loaded = 0, failed = 0;
    layer.on("tileload", function () { loaded += 1; });
    layer.on("tileerror", function () { failed += 1; if (failed > 6 && loaded === 0) showFallback(el); });
    layer.addTo(map);

    const points = [];
    sitesFor(world).forEach(function (site) {
      const single = site.ghosts.length === 1;
      const label = single ? site.ghosts[0].name : site.name + " (" + site.ghosts.length + ")";
      const marker = L.marker([site.lat, site.lon], { icon: markerIcon(site), keyboard: true, riseOnHover: true, title: "" }).addTo(map);
      marker.bindTooltip(label, { direction: "top", opacity: 1 });

      const node = marker.getElement();
      if (node) {
        node.setAttribute("role", "button");
        node.setAttribute("aria-label", single ? label + ": open dossier" : label + ": show what is here");
      }

      if (single) {
        marker.on("click", function () { LKP.openDossier(site.ghosts[0].id, node); });
      } else {
        marker.bindPopup(popupHtml(site), { maxWidth: 300, minWidth: 220, autoPanPadding: [24, 24] });
        marker.on("popupopen", function (e) {
          const first = e.popup.getElement() && e.popup.getElement().querySelector(".site-pop__btn");
          if (first) first.focus({ preventScroll: true });
        });
      }

      marker.on("mouseover focus", function () { site.ghosts.forEach(function (g) { LKP.bus.emit("hot", { id: g.id, on: true, from: "map" }); }); });
      marker.on("mouseout blur", function () { site.ghosts.forEach(function (g) { LKP.bus.emit("hot", { id: g.id, on: false, from: "map" }); }); });

      site.ghosts.forEach(function (g) {
        (state.byGhost[g.id] = state.byGhost[g.id] || []).push({ marker: marker, site: site, world: world });
      });
      points.push([site.lat, site.lon]);
    });

    if (points.length) map.fitBounds(L.latLngBounds(points).pad(0.12), { maxZoom: 3, animate: false });

    /* Don't hijack page scrolling: wheel-zoom only after the reader engages with the map. */
    map.on("click focus", function () { map.scrollWheelZoom.enable(); });
    map.on("mouseout blur", function () { map.scrollWheelZoom.disable(); });

    const readout = el.closest(".atlas").querySelector(".atlas__readout");
    if (readout) {
      map.on("mousemove", function (e) {
        readout.textContent = "LAT " + fmtCoord(e.latlng.lat, "N", "S") + " · LON " + fmtCoord(e.latlng.lng, "E", "W");
      });
    }

    window.addEventListener("resize", function () { map.invalidateSize(); });
    state.maps[world] = map;
    return map;
  }

  function hot(id, on) {
    (state.byGhost[id] || []).forEach(function (m) {
      const node = m.marker.getElement();
      if (node) node.classList.toggle("is-hot", on);
    });
  }

  /* Fly to a ghost's marker(s) and pulse them. */
  function focus(id) {
    const g = LKP.byId[id];
    if (!g || !g.loc) return;
    const atlasEl = LKP.$('[data-atlas="' + g.world + '"]');
    if (!atlasEl) return;
    const map = createMap(g.world, atlasEl.querySelector(".atlas__map"));
    LKP.scrollToEl(atlasEl, "center");
    if (!map) return;

    const entries = state.byGhost[id] || [];
    const run = function () {
      map.invalidateSize();
      const animate = !LKP.reduceMotion.matches;
      if (entries.length > 1) {
        map.flyToBounds(L.latLngBounds(entries.map(function (e) { return [e.site.lat, e.site.lon]; })).pad(0.4), { animate: animate, duration: 1.1, maxZoom: 4 });
      } else if (entries.length === 1) {
        map.flyTo([entries[0].site.lat, entries[0].site.lon], Math.max(map.getZoom(), 4), { animate: animate, duration: 1.1 });
        entries[0].marker.openTooltip();
      }
      hot(id, true);
      setTimeout(function () { hot(id, false); }, 2600);
    };
    setTimeout(run, LKP.reduceMotion.matches ? 0 : 450);
  }

  function init() {
    LKP.bus.on("hot", function (d) { if (d.from !== "map") hot(d.id, d.on); });

    const atlases = LKP.$$("[data-atlas]");
    if (!("IntersectionObserver" in window)) {
      atlases.forEach(function (a) { createMap(a.dataset.atlas, a.querySelector(".atlas__map")); });
      return;
    }
    /* Create each map only when it is about to scroll into view. */
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        createMap(entry.target.dataset.atlas, entry.target.querySelector(".atlas__map"));
        io.unobserve(entry.target);
      });
    }, { rootMargin: "400px 0px" });
    atlases.forEach(function (a) { io.observe(a); });
  }

  LKP.atlas = { init: init, focus: focus, hot: hot };
})();
