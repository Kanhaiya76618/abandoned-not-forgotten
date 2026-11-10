# Asset credits and licenses

Everything bundled in this folder, where it came from, and the terms it is used under.

## Photos of the machines (`ghosts/`)

All 29 photos are **public-domain NASA images**, fetched from Wikimedia Commons and resized. Each dossier on the site shows its caption, credit and a link to the source page. The same list lives in `../js/images.js` (`page` is the source link, `credit` is the photographer or team).

Files ending in `_t.jpg` are small cropped thumbnails of the same photo.

## Planet and Moon maps (`textures/`)

| File | Source | Terms |
|---|---|---|
| `moon_4k.jpg`, `moon_bump.jpg` | NASA Scientific Visualization Studio, [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) (LRO camera color map and laser-altimeter elevation) | NASA media, free to use. Credit: NASA's Scientific Visualization Studio |
| `mars_4k.jpg` | Viking MDIM 2.1 color mosaic (NASA/JPL/USGS), stitched from [NASA Mars Trek](https://trek.nasa.gov/mars/) map tiles, then brightened for on-screen clarity | NASA/USGS data, public domain |
| `sun.jpg`, `mercury.jpg`, `venus.jpg`, `earth.jpg`, `jupiter.jpg`, `saturn.jpg`, `saturn_ring.png`, `uranus.jpg`, `neptune.jpg`, `stars.jpg` | [Solar System Scope textures](https://www.solarsystemscope.com/textures/), resized | **CC BY 4.0**. Credit: Solar System Scope (based on NASA elevation and imagery data) |

## Fonts (`fonts/`)

Fraunces, Atkinson Hyperlegible and IBM Plex Mono, all under the **SIL Open Font License 1.1**. The license files sit next to the fonts.

## Code libraries (`../vendor/`)

- [three.js](https://threejs.org/) r170, MIT license
- [Leaflet](https://leafletjs.com/) 1.9.4, BSD 2-Clause license

## Data

- Planet positions: NASA JPL, [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- Spacecraft positions: NASA JPL [Horizons System](https://ssd.jpl.nasa.gov/horizons/)
- Positions of hardware on the Moon: LROC, [Coordinates of Lunar Anthropogenic Features](https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf)
- 2D map tiles (loaded live): [NASA Trek](https://trek.nasa.gov/)

This is a student hackathon project. NASA does not endorse it.
