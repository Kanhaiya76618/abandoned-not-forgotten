# Last Known Position

**Fly through a live 3D solar system and meet the machines humanity left behind on the Moon, on Mars and in deep space.**
Built for the 2026 NASA International Space Apps Challenge: *Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars*.

## What it does

- **Tabs, not one long scroll.** Simulator (home), Moon, Mars, Deep space, Silence board, Timeline, Quiz and About each have their own tab, with their own sky tint. Links such as `index.html#mars` open a tab directly, and the browser's Back button works.
- **Solar system simulator on the home tab.** Every planet, the Moon, the dwarf planet Ceres, the asteroid Eros and six spacecraft are shown where they really are on the chosen date. Fly to the Moon or Mars and the real surface appears, with a glowing pin at the measured position of each machine. Hover a pin for its photo. Click it and the globe turns to face that spot while the full story slides in from the right, beside the globe.
- **Clear distances.** Each world shows its distance from the Sun and from Earth and how long light takes to get there. Switch between "Easy view" and "True distances" to see how empty space really is.
- **32 story panels with real photos.** Each has a NASA photo, how long the machine has been silent (or working), key facts, the story, an imagined first-person log, the science it made possible, key moments, and its sources. Machines that share a spot (Apollo 11's lander and its laser mirror, for example) can be switched inside the panel.
- **Built on NASA's challenge resources.** All fourteen resources listed on the challenge page are used. The About tab maps each one to the machines that cite it, and those links carry a "Challenge resource" badge in the story panels.
- **Search.** Press `/` and type "rover", "Apollo", "Mars" or "still working".
- **Also:** zoomable NASA maps of the Moon and Mars, live "silence" counters, a Light Clock, a timeline, a quiz, read-aloud narration, and a Day mode for classroom projectors.

The winning strategy, judging-criteria map, demo script and submission checklist are in [docs/CONCEPT.md](docs/CONCEPT.md).

## Run it

No build step and nothing to install. Any static web server works:

```bash
python3 -m http.server 8080 --directory site
```

Then open <http://localhost:8080>.

The 3D simulator needs the site to be served like this (or hosted online). If you open `site/index.html` directly as a file, the browser blocks the simulator and the page says so; everything else still works.

Fonts, photos, planet maps and code libraries are all bundled, so the simulator works offline. Only the two zoomable 2D maps load imagery from NASA Trek and need an internet connection.

## Deploy

- **Netlify Drop:** drag the `site/` folder onto <https://app.netlify.com/drop>.
- **GitHub Pages:** publish the `site/` folder with a Pages workflow, or move its contents to `/docs` and choose "Deploy from branch → /docs".

After you change any CSS or JS file, bump the `?v=` number on the `<link>` and `<script>` tags in `site/index.html` so browsers fetch the new version.

## Project structure

```
site/
  index.html            page structure and static story text
  css/styles.css        design tokens (night and day), layered sky, glass and clay components, responsive rules
  js/data.js            ALL content: machines, sources, worlds, spacecraft positions, timeline, quiz
  js/images.js          photo, caption and credit for every machine
  js/core.js            helpers: icons, dates, read-aloud, orbit math (LKP.orbit)
  js/sim.js             the 3D simulator (Three.js, ES module)
  js/atlas.js           zoomable 2D maps of the Moon and Mars (Leaflet + NASA Trek tiles)
  js/features.js        Light Clock, silence board, timeline, quiz
  js/app.js             theme, tabs, sky, search, story panel, deep links
  assets/               photos, planet maps and fonts (see assets/CREDITS.md)
  vendor/               three.js r170 (MIT) and Leaflet 1.9.4 (BSD-2)
docs/CONCEPT.md         idea, story design, judging map, demo script, checklist
```

## Adding or editing a machine

1. Add an entry to `LKP.ghosts` in `site/js/data.js`. Copy an existing one and fill in:
   - `world` (`moon`, `mars` or `deep`), `kind`, and `status` (working, silent, lost or impact)
   - `loc` with `lat`/`lon` in degrees east (−180…180) and a `site` id. Machines that share a `site` share one pin on the globe and the map.
   - `since` (YYYY, YYYY-MM or YYYY-MM-DD) and `sinceLabel`, which drive the silence board
   - `story`, `voice` (always imagined, always fact-based), `learned`, `facts`, `sources` (at least one)
2. Add its photo to `site/assets/ghosts/` as `<id>.jpg` (about 1000 px) and `<id>_t.jpg` (400×300), and an entry in `site/js/images.js` with a caption, credit and source link. Without a photo, the machine falls back to an icon.

Deep links open any dossier directly, for example `index.html#ghost=opportunity`.

## Accuracy

- **Planet positions** use NASA JPL's Keplerian elements (valid 1800–2050). Checked against JPL Horizons for 10 November 2026: every planet and Pluto is within 0.13% of its true distance and 0.07° of its true direction. The Moon's direction is good to about 1.5°.
- **Spacecraft positions** (Voyager 1 and 2, Pioneer 10 and 11, New Horizons) come from JPL Horizons position and velocity vectors. They now travel in nearly straight lines, so the simulator moves them at constant velocity, and hides each one for dates before its last planetary flyby. Pioneer positions are predictions: nobody has heard from them since 1995 and 2003.
- **Ceres, Eros and the Kepler telescope** follow fixed orbital elements from JPL Horizons (10 November 2026), moved as simple two-body orbits. Checked against Horizons for 2000–2040: within 1.4° and 0.35% in distance. Kepler has been silent since 2018, so its position is a prediction.
- **What is not to scale:** the sizes of the worlds, the Moon's distance from Earth, and how fast the planets spin. The shape of Eros is a sketch, not a measured model. "Easy view" also squeezes the outer orbits (square-root spacing); "True distances" is linear. The site says this next to the controls.
- **Moon positions** come from LROC's *Coordinates of Lunar Anthropogenic Features* (2016). Mars positions are published landing coordinates, approximate where marked.
- **Facts** were checked on 9 November 2026 against the sources linked in each dossier (NASA and JPL wherever possible). All source links were re-verified on 11 November 2026. On 13 November 2026 every dossier was checked again against NASA's official challenge resources (this added Dawn, NEAR Shoemaker and Kepler, and the news that Perseverance passed Opportunity's driving record on 11 October 2026).
- **Machine "voices"** are imagined and labeled as such every time they appear.

## Accessibility

WCAG AA text contrast in both themes. Keyboard support throughout: skip link, visible focus rings, focus-trapped dialogs, Escape to close, `/` to search, arrow keys in search results, the timeline and dossiers. In the simulator, every world and spacecraft can be reached from the button strip, and every pin is a real button with a spoken label, so nothing depends on dragging. Each map and globe is mirrored by a full list. Read-aloud narration uses the Web Speech API. Reduced-motion settings turn off camera flights and animations. Body text is Atkinson Hyperlegible. Not yet tested with a physical screen reader.

## Credits

Full asset credits and licenses are in [site/assets/CREDITS.md](site/assets/CREDITS.md). In short: photos and the Moon, Mars and Ceres maps are NASA public-domain imagery; other planet maps are from Solar System Scope (CC BY 4.0); positions come from NASA JPL; code libraries are three.js (MIT) and Leaflet (BSD-2); fonts are under the SIL Open Font License. This is a student hackathon project, not an official NASA website.
