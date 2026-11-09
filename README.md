# Last Known Position

**An interactive story atlas of the machines humanity left behind on the Moon, on Mars and in deep space.**
Built for the 2026 NASA International Space Apps Challenge: *Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars*.

Readers find 29 real artifacts on NASA Trek maps of the Moon and Mars. Each one has a dossier with its story, an imagined first-person log, the science it made possible, and its sources. Live counters show how long each has been silent, and a Light Clock shows how long a message takes to reach the Moon, Mars (computed live), New Horizons or Voyager 1.

The winning strategy, judging-criteria map, demo script and submission checklist are in [docs/CONCEPT.md](docs/CONCEPT.md).

## Run it

No build step and no dependencies to install. Any static server works:

```bash
python3 -m http.server 8080 --directory site
```

Then open <http://localhost:8080>. Opening `site/index.html` directly also works.

Map tiles and fonts load from NASA Trek and Google Fonts, so the maps need an internet connection. Without one, the site still works: the lists, dossiers, counters, Light Clock and quiz all run locally.

## Deploy

- **Netlify Drop:** drag the `site/` folder onto <https://app.netlify.com/drop>.
- **GitHub Pages:** publish the `site/` folder with a Pages workflow, or move its contents to `/docs` and choose "Deploy from branch → /docs".

## Project structure

```
site/
  index.html            page structure and static story text
  css/styles.css        design tokens (night and day themes), components, responsive rules
  js/data.js            ALL content: artifacts, sources, timeline, quiz, Light Clock targets
  js/core.js            helpers: icons, dates, counters, read-aloud, event bus
  js/atlas.js           Leaflet maps of the Moon and Mars (NASA Trek tiles, EPSG:4326)
  js/features.js        Light Clock + live Earth–Mars distance, silence board, timeline, quiz
  js/app.js             theme, navigation, starfield, dossier dialog, deep links
  vendor/leaflet-1.9.4  Leaflet (BSD-2), bundled so the maps don't depend on a CDN
docs/CONCEPT.md         idea, story design, judging map, demo script, checklist
```

## Adding or editing an artifact

Everything lives in `site/js/data.js`. Copy an existing entry and fill in:

- `world` (`moon`, `mars` or `deep`), `kind` (lander, rover, helicopter, probe, reflector, seismometer, impact or orbiter), and `status` (working, silent, lost or impact)
- `loc` with `lat`/`lon` in degrees east (−180…180) and a `site` id. Artifacts that share a `site` share one map marker.
- `since` (YYYY, YYYY-MM or YYYY-MM-DD) and `sinceLabel`, which drive the silence board
- `story`, `voice` (always imagined, always fact-based), `learned`, `facts`, `sources` (at least one)

Deep links open any dossier directly, for example `index.html#ghost=opportunity`.

## Accuracy

- Facts were checked on 9 November 2026 against the sources linked in each dossier (NASA and JPL wherever possible). Every source link was verified to resolve.
- Moon positions come from LROC's *Coordinates of Lunar Anthropogenic Features* (2016). Mars positions are published landing coordinates, approximate where marked.
- The live Earth–Mars distance uses JPL's Keplerian elements (valid 1800–2050). It reproduces real close approaches: 55.8 million km on 27 Aug 2003, 57.6 million km on 31 Jul 2018 and 96.1 million km on 12 Jan 2025.
- Machine "voices" are imagined and labeled as such every time they appear.

## Accessibility

WCAG AA color contrast in both themes. The site supports keyboard navigation (skip link, focus rings, focus-trapped dialog, Escape to close, arrow keys in the timeline and dossier) and screen readers (labels on map markers, plus a full list that mirrors each map). It also has read-aloud narration via the Web Speech API, respects reduced-motion settings, and uses Atkinson Hyperlegible for body text. Day mode is designed for classroom projectors.

## Credits

Map imagery: LRO WAC global mosaic (NASA/GSFC/Arizona State University) and Viking MDIM 2.1 (NASA/JPL/USGS), served by [NASA Trek](https://trek.nasa.gov/). Map library: [Leaflet](https://leafletjs.com/) (BSD-2). Fonts: Fraunces, Atkinson Hyperlegible and IBM Plex Mono (SIL Open Font License). This is a student hackathon project, not an official NASA website.
