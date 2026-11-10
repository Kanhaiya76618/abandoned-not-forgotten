# Last Known Position: the plan to win

**Challenge:** 2026 NASA Space Apps · *Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars*

**One-line pitch:** *Last Known Position* is a live 3D solar system where you fly to the Moon, Mars and deep space to find the machines humanity left behind. Each one is pinned at its real position, with a real photo, its story, its "own words", and a live counter showing how long it has been silent. A few of them are still talking to Earth.

---

## 1. What the challenge asks, and how we answer it

| The challenge says | Our answer |
|---|---|
| Tell the story of hardware left on the Moon, on Mars and in deep space | 29 artifacts across three chapters: **the Moon** (12), **Mars** (12, including the two rovers still working there) and **deep space** (5) |
| Introduce school-age space fans to the hardware **and the science it made possible** | Every dossier has three parts: *The story* (what happened), *What we learned* (the science) and *In its own words* (emotion) |
| Translate complex data into an engaging narrative | We frame everything around one idea, the **last known position**: where it is, the last time it spoke, and what it found |
| Show how missions operated rather than listing facts | Light-delay calculator, a live Mars distance computed from orbital elements, the silence board, and the stories of rescue attempts (Spirit), wake-up calls (Opportunity) and a remote-controlled camera (Apollo 17) |
| Something like "an interactive map with clickable ghost rovers" | A 3D simulator with detailed NASA globes of the Moon and Mars, plus zoomable NASA Trek maps. Pins sit at LROC's measured coordinates, and hovering one shows a real photo, so a place is never "just a dot" |
| A personal connection to forgotten explorers | First-person "imagined logs", always labeled and always built from real facts |
| **Accuracy is important throughout** | Every fact links to its source, imagined voices are clearly labeled, and the "fact-checked on" date is shown on the site |
| Think about age group, accessibility, perspective | Core audience is 10–14 (text written for that level). Read-aloud makes it work for ages 8+, "Go deeper" facts serve teens and adults. Atkinson Hyperlegible type, WCAG AA contrast, keyboard support, reduced-motion mode, and a Day mode for classroom projectors |

## 2. What past Space Apps winners teach us

All of these are verified global winners (NASA announcements for 2023, 2024 and 2025, plus the 2022 Space Apps blog).

| Winner (year, award) | What they built | What we borrow |
|---|---|---|
| **TeamVoyagers** (2023, Best Storytelling) | An interactive web game that tells the story of the water cycle | Story *plus* interaction: quiz ranks and "send a message" moments, not just reading |
| **TerraTales** (2024, Best Storytelling) | A climate story for the "Tell Us a Climate Story!" challenge | Lead with narrative and let the data serve the story |
| **HerCode Space** (2025, Best Use of Storytelling) | *Stellar Stories: Space Weather Through the Eyes of Earthlings* | A strong **point of view**: our machines tell their own stories |
| **Connected Earth Museum** (2024, Art & Technology) | An immersive virtual museum with a guide, 2D and 3D data visualizations | The "archive or museum" framing, a narrator voice, and data as exhibits |
| **Arcobaleno** (2023, Global Connection) | Sonification of NASA images for people with sight impairments | Accessibility as a headline feature: read-aloud narration, screen-reader map alternative |
| **Zumorroda-X** (2025, Art & Technology) | Mini games where you step into a farmer's shoes | Role-play: *you* are mission control sending a command to Voyager 1 |
| **Spacebee / LunarTech Ensemble** (2023, Technology / Science), **42 QuakeHeroes** (2024, Technology) | Moonquake maps and seismic detection using Apollo and InSight data | Judges reward *real NASA data on a map*, so we use the Apollo seismometers and InSight as story threads |
| **The MIMBI Project** (2022, Best Storytelling) | Literature, visuals, music and public art | Multi-modal storytelling: text, voice, map, timeline, interactive tools |
| **Astro Sweepers** (2025, Galactic Impact) | "We Catch What Space Leaves Behind": an orbital debris risk platform | Our epilogue asks what we will leave behind next, which links heritage to responsibility |

**Open-source simulators we studied** (GitHub): [elymas/solar-simulator](https://github.com/elymas/solar-simulator) (JPL elements, time controls, a mobile "planet strip", tap-versus-drag guard), [qunabu/Gravity](https://github.com/qunabu/Gravity) (an honest toggle between true scale and a visual scale) and [OG-Dhai/solar-system-simulator](https://github.com/OG-Dhai/solar-system-simulator) (orbits solved at runtime, texture fallbacks). NASA's own [Eyes on the Solar System](https://eyes.nasa.gov/) set the bar for "ride along with a spacecraft". We borrowed the ideas, not the code: ours adds what none of them have, which is the abandoned hardware pinned on the Moon and Mars with photos and stories.

**Pattern:** the storytelling winners have a clear point of view, interaction that makes the learner act, real data, and a format anyone can open on a phone.

## 3. How judges score, and our evidence

Space Apps judges use five criteria (from the official Judging & Awards Guide): **Impact, Creativity, Validity, Relevance, Presentation.**

| Criterion | What judges ask | Our evidence |
|---|---|---|
| **Impact** | Will it inspire or help many people? | Free website with nothing to install. It works on phones and classroom projectors, includes a teacher activity guide, read-aloud, and shareable deep links to any artifact (`#ghost=opportunity`) |
| **Creativity** | Is it novel? | The "last known position" frame, machine voices, live silence counters, and story links between worlds (Opportunity named a Mars crater after Lunokhod 2, the Soviet rover whose record it broke) |
| **Validity** | Is it scientifically valid? | LROC-measured coordinates, NASA/JPL sources on every dossier, a live Mars distance from JPL's Keplerian elements, imagined voices labeled |
| **Relevance** | Responsive to the challenge? Complete? Usable? | Covers Moon, Mars and "elsewhere" and covers both *silent* and *still-active* artifacts. It's a finished, working site, not a mockup |
| **Presentation** | Did they tell the story of the project well? | A 30-second hook (Opportunity's last message), plus the demo script and pitch outline below |

**Awards to target:** Best Storytelling (primary), Most Inspirational, Art & Technology, Global Connection (accessibility).

## 4. The experience (site walkthrough)

1. **Hero: "Last Known Position".** A radar-style display shows the light-delay rings (Moon 1.3 light-seconds, Mars light-minutes, Voyager 1 about a light-day), with a telemetry ticker of last signals.
2. **Prologue: "Nothing gets tidied up out there".** No wind or rain on the Moon. Four sourced stats.
3. **Live simulator: "Fly through the solar system".** Real positions for today (or any date from 1960 to 2050), time controls, and an "Easy view / True distances" switch. Fly to the Moon or Mars for a detailed globe with photo pins. Fly to Voyager 1 and look back at how far it has gone.
4. **Chapter 1, the Moon: "A museum with no visitors".** Real lunar map, 12 artifacts, story moments (the only robot humans ever walked up to; the last car on the Moon filmed its drivers leaving).
5. **Chapter 2, Mars: "The ghost rovers".** Real Mars map, 12 artifacts including two lost ones and two still working.
6. **Chapter 3, deep space: "Messages in a bottle".** Pioneer plaques, the Golden Record, a log-scale signal gauge and the **Light Clock**: type a message, pick a destination, and see when it arrives. Mars's distance is computed live.
7. **Chapter 4: "The silence board".** Every artifact's status (working, silent, lost, impact) with live counters since its last signal.
8. **Timeline:** "Sixty years of leaving things behind" (1967–2026).
9. **Quiz:** "Are you a ghost hunter?" Eight questions, each with an explanation and a source.
10. **Epilogue:** "What will we leave next?" Teacher activities, sources and credits.

Every artifact opens a **dossier** with a real NASA photo, key facts, the story, the imagined log, what we learned, and sources, plus *Listen*, *Show on map*, *See in 3D* and *Previous/Next*. A **search** box (press `/`) finds any machine or world.

**Look and feel:** frosted-glass panels over a soft aurora sky, with puffy clay buttons and photo frames. It is friendly for kids and still reads as a serious archive.

## 5. Story design

- **Perspective:** two voices. The *narrator* (calm, factual, archive-like) and the *machines* (first person, short, a little funny, never inventing facts).
- **Reading level:** short sentences, defined terms ("a sol is a Martian day"), numbers rounded for kids, exact values in the fact grid.
- **Emotional arc:** wonder (we got there) → loss (signals stop) → surprise (some are still working) → responsibility (what will we leave next?).
- **The hook we open the pitch with:** in June 2018 a dust storm darkened the sky over Opportunity. Its final data showed low power and a darkening sky, which people summed up as *"My battery is low and it's getting dark."* NASA sent more than 1,000 commands trying to wake it.

## 6. Accuracy policy

1. Every number and date in a dossier comes from a linked source, NASA or JPL wherever possible.
2. Coordinates: Moon sites from LROC's *Coordinates of Lunar Anthropogenic Features* (2016). Mars sites from published landing coordinates (approximate where noted).
3. Imagined logs are labeled *"Imagined log, written from real mission facts"* every time.
4. Where sources disagree (Viking 1's last contact is given as 11 or 13 November 1982), we use the NASA value and note the uncertainty.
5. Facts were checked on **9 November 2026**, and the site shows that date.

## 7. NASA data and resources used

- NASA Moon Trek and Mars Trek map tiles (LRO WAC global mosaic, Viking MDIM 2.1 color mosaic)
- LROC / Arizona State University: *Coordinates of Lunar Anthropogenic Features* (2016)
- NASA / JPL mission pages for every artifact (linked in each dossier)
- JPL *Approximate Positions of the Planets* (Keplerian elements) for every planet's position in the simulator and the live Earth–Mars distance
- JPL Horizons trajectories for Voyager 1 and 2, Pioneer 10 and 11, and New Horizons
- NASA SVS *CGI Moon Kit* (LRO color map and elevation) for the 3D Moon
- 29 public-domain NASA photographs, one per machine (credits in `site/assets/CREDITS.md`)
- Non-NASA: planet textures other than the Moon and Mars are from Solar System Scope (CC BY 4.0, credited on the site)
- **Add when the official challenge resources are released** (see section 10)

## 8. Demo video script (about 2 minutes; a 30-second cut is marked ★)

1. ★ Black screen, one line types out: *"My battery is low and it's getting dark."* Narrator: "That's how people remember the last message from a robot on Mars."
2. ★ Hero radar appears. "Since 1967 we've left machines on the Moon, on Mars and between the stars. This is where they are."
3. Simulator: click **Moon**. The camera flies in and pins appear. Hover Tranquility Base to show the Apollo 11 photo, then open *Apollo 11's laser mirror*: "Still working. Scientists bounce lasers off it today."
4. Open *Surveyor 3*: "The only robot humans have ever walked up to on another world."
5. ★ Click **Mars**, open *Opportunity*, press **Listen**. The machine voice reads its log.
5b. Click **Voyager 1**, then switch to **True distances**: the planets shrink to a dot. "This is how far our oldest explorer has gone."
6. Light Clock: type "hello Voyager", send. "Your message arrives tomorrow. Voyager 1 is about one light-day away this month."
7. ★ Silence board counters ticking. "Abandoned, but not forgotten."
8. End card: URL, team name, "Built with NASA open data."

## 9. Submission checklist

- [ ] Project title, short description, link to the live site (GitHub Pages or Netlify)
- [ ] Demo video or slides, in the format and length the 2026 rules ask for
- [ ] List of NASA data and resources used (section 7, plus the official resources)
- [ ] Declare any AI assistance as the 2026 Space Apps rules require
- [ ] Test on a phone and on a classroom projector (Day mode)
- [ ] Credit imagery: NASA/GSFC/ASU (LRO) and NASA/JPL/USGS (Viking) via NASA Trek

## 10. When the official resources drop (13:00 IST)

1. Read every resource link and add any new artifacts or datasets to `site/js/data.js`. Each entry needs at least one source.
2. Swap or add basemaps if the resources list specific mosaics, for example LROC NAC close-ups of the Apollo sites.
3. Cite the official resources in section 7 and in the site's *Sources & method* footer.
4. Check that our artifact list matches the "hardware" the resources emphasize, and add a dossier for anything missing.

## 11. Stretch goals (if time allows)

- Hindi and Spanish translations of the story text (helps the Global Connection award)
- Close-up landing-site imagery (LROC NAC) on the 3D globes when zoomed in
- 3D models of the rovers and landers from NASA's 3D Resources
- "Postcard to a ghost": write a note and download a shareable image
- Sonification: hear Opportunity's power fade as a falling tone

## 12. Sources for this plan

- NASA: [2025 Space Apps global winners](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)
- NASA: [2024 Space Apps global winners](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/)
- NASA Science: [2023 Space Apps global winners](https://science.nasa.gov/directorates/smd/2023-nasa-international-space-apps-challenge-announces-10-global-winners)
- Space Apps: [2022 global winners](https://www.spaceappschallenge.org/blog/2022-global-winners/)
- Space Apps: [Judging & Awards Guide (2022 PDF)](https://spaceapps-prod.s3.amazonaws.com/media/documents/Space_Apps_2022_Judging_and_Awards_Guide.pdf)
- Artifact facts: see the sources inside every dossier on the site (`site/js/data.js`)
