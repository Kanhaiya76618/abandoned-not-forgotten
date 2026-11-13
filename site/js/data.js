/* ==========================================================================
   Last Known Position: content and data
   --------------------------------------------------------------------------
   Every fact in a dossier links to its source(s). Facts checked: 9 Nov 2026.
   "voice" lines are imagined first-person logs written from real mission
   facts. The site always labels them as imagined.

   Fields
     id, name, mission, agency, world (moon|mars|deep), kind, status
     status: working | silent | lost | impact
     year       year the hardware arrived / launched (for sorting)
     place      human-readable location
     loc        [{lat, lon, site, siteName}]  (absent = not on a map)
     since      ISO date (YYYY, YYYY-MM or YYYY-MM-DD) used by the counters
     sinceLabel what "since" means for this artifact
     hook       one-sentence teaser
     story      paragraphs (narrator voice)
     voice      imagined log lines (machine voice)
     learned    the science it made possible
     facts      [label, value] pairs
     sources    [{t: title, u: url, o: 1 when it is an official challenge resource}]
     at         id of the small world it orbits or rests on (simulator)
   ========================================================================== */
(function () {
  "use strict";

  var LKP = (window.LKP = window.LKP || {});
  LKP.checked = "2026-11-13";

  /* ---------- Shared sources --------------------------------------------- */
  var S = {
    lroc: { t: "LROC (ASU/NASA): Coordinates of Lunar Anthropogenic Features, 2016", u: "https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf" },
    apollo11: { t: "NASA: Apollo 11 mission overview", u: "https://www.nasa.gov/mission/apollo-11/" },
    jplLLR: { t: "NASA JPL: The Apollo experiment that keeps on giving", u: "https://www.jpl.nasa.gov/news/the-apollo-experiment-that-keeps-on-giving/" },
    jila: { t: "JILA: Apollo 11’s last working experiment on the Moon", u: "https://jila-pfc.colorado.edu/news-events/news/apollo-11s-last-working-experiment-moon" },
    surveyorAlsj: { t: "NASA SP-284: Analysis of Surveyor 3 material and photographs returned by Apollo 12", u: "https://ntrs.nasa.gov/citations/19720019081" },
    surveyorSpace: { t: "Space.com: Where are the Surveyor 3 parts Apollo 12 brought home?", u: "https://www.space.com/apollo-12-surveyor-3-parts-50-years.html" },
    alsep: { t: "NASA Apollo Lunar Surface Journal: ALSEP", u: "https://www.nasa.gov/history/alsj/HamishALSEP.html" },
    popsciSmash: { t: "Popular Science: How the Apollo lunar modules were smashed for science", u: "https://www.popsci.com/how-apollo-lunar-modules-were-smashed-for-science/" },
    lrocTracks15: { t: "LROC: Follow the tracks (Apollo 15)", u: "https://www.lroc.asu.edu/posts/491" },
    utLiftoff: { t: "Universe Today: How NASA filmed humans last leaving the Moon", u: "https://www.universetoday.com/articles/how-nasa-filmed-humans-last-leaving-the-moon-42-years-ago" },
    nasmLiftoff: { t: "Smithsonian NASM: Apollo 17 liftoff from the Moon, 14 Dec 1972", u: "https://airandspace.si.edu/multimedia-gallery/apollo-17-liftoff-moon-december-14-1972" },
    apollo16: { t: "NASA: Apollo 16 mission overview", u: "https://www.nasa.gov/mission/apollo-16/" },
    apollo17: { t: "NASA: Apollo 17 mission overview", u: "https://www.nasa.gov/mission/apollo-17/" },
    psRecord: { t: "The Planetary Society: Opportunity sets historic distance record", u: "https://www.planetary.org/articles/07-mer-update-opportunity-sets-distance-record" },
    lostReflector: { t: "Space.com: Lost Soviet reflecting device rediscovered on the Moon (2010)", u: "https://www.space.com/8295-lost-soviet-reflecting-device-rediscovered-moon.html" },
    lunokhodArxiv: { t: "Murphy et al.: Laser ranging to the lost Lunokhod 1 reflector (arXiv)", u: "https://arxiv.org/abs/1009.5720" },
    lrocLunokhod2: { t: "LROC: Lunokhod 2 revisited", u: "https://www.lroc.asu.edu/images/699" },
    lpNasa: { t: "NASA Science: Lunar Prospector", u: "https://science.nasa.gov/mission/lunar-prospector/" },
    lpAstronomy: { t: "Astronomy: What we learned by crashing Lunar Prospector into the Moon", u: "https://www.astronomy.com/space-exploration/what-we-learned-from-the-lunar-prospector-25-years-on/" },
    lcrossNasa: { t: "NASA Science: LCROSS", u: "https://science.nasa.gov/mission/lcross/" },
    lcrossAstronomy: { t: "Astronomy: Water in Moon crater, LCROSS impact reveals", u: "https://www.astronomy.com/space-exploration/water-in-moon-crater-lcross-impact-reveals/" },
    vikingLander: { t: "NASA Science: Viking Lander", u: "https://science.nasa.gov/3d-resources/viking-lander/" },
    viking1Gsfc: { t: "NASA Goddard: Viking 1 lander", u: "https://science.gsfc.nasa.gov/attic/mola/viking1.html" },
    viking1Hirise: { t: "HiRISE (Univ. of Arizona): Viking Lander 1 seen from orbit", u: "https://www.uahirise.org/PSP_001521_2025" },
    viking1Nasa: { t: "NASA Science: Viking 1", u: "https://science.nasa.gov/mission/viking-1/", o: 1 },
    viking2Nasa: { t: "NASA Science: Viking 2", u: "https://science.nasa.gov/mission/viking-2/" },
    pathfinderNasa: { t: "NASA Science: Mars Pathfinder", u: "https://science.nasa.gov/mission/mars-pathfinder/", o: 1 },
    sojournerSpace: { t: "Space.com: Sojourner, the first successful Mars rover", u: "https://www.space.com/17745-mars-pathfinder-sojourner-rover.html" },
    spiritNasa: { t: "NASA Science: Spirit", u: "https://science.nasa.gov/mission/mer-spirit/" },
    spiritPS: { t: "The Planetary Society: NASA ends Spirit mission", u: "https://www.planetary.org/articles/05-26-mer-update" },
    spiritASU: { t: "ASU News: Mars rover finds Yellowstone-like hot spring deposits", u: "https://news.asu.edu/content/mars-rover-finds-yellowstone-hot-spring-deposits" },
    oppLast: { t: "NASA JPL: Opportunity’s last message (PIA22929)", u: "https://www.jpl.nasa.gov/images/pia22929-opportunitys-last-message/" },
    oppPS: { t: "The Planetary Society: NASA declares Opportunity mission complete", u: "https://www.planetary.org/articles/02-mer-update-opportunity-complete" },
    oppNasa: { t: "NASA Science: Opportunity", u: "https://science.nasa.gov/mission/mer-opportunity/" },
    phoenixJPL: { t: "NASA JPL: Phoenix Mars Lander is silent, new image shows damage", u: "https://www.jpl.nasa.gov/news/phoenix-mars-lander-is-silent-new-image-shows-damage/" },
    phoenixNasa: { t: "NASA Science: Phoenix", u: "https://science.nasa.gov/mission/phoenix/" },
    insightNasa: { t: "NASA Science: InSight", u: "https://science.nasa.gov/mission/insight/", o: 1 },
    ingenuityJPL: { t: "NASA JPL: Ingenuity Mars Helicopter team says goodbye … for now", u: "https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-team-says-goodbye-for-now" },
    ingenuityNasa: { t: "NASA Science: Ingenuity Mars Helicopter", u: "https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/", o: 1 },
    wrightSpace: { t: "Space.com: Wright Flyer fabric flies again on Ingenuity", u: "https://www.space.com/ingenuity-mars-helicopter-wright-flyer-fabric" },
    mplNasa: { t: "NASA Science: Mars Polar Lander / Deep Space 2", u: "https://science.nasa.gov/mission/mars-polar-lander-deep-space-2/" },
    mcoSMA: { t: "NASA: Mars Climate Orbiter Mishap Investigation Board, Phase I report (1999)", u: "https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf" },
    mcoNasa: { t: "NASA Science: Mars Climate Orbiter", u: "https://science.nasa.gov/mission/mars-climate-orbiter/" },
    curiosityNasa: { t: "NASA Science: Curiosity", u: "https://science.nasa.gov/mission/msl-curiosity/" },
    perseveranceNasa: { t: "NASA Science: Perseverance", u: "https://science.nasa.gov/mission/mars-2020-perseverance/" },
    pioneer10Things: { t: "NASA Science: 10 things from the Pioneer days", u: "https://science.nasa.gov/missions/pioneer/10-things-pioneer-days/" },
    pioneerPlaque: { t: "NASA Science: The Pioneer plaque", u: "https://science.nasa.gov/resource/pioneer-plaque/" },
    pioneer11Things: { t: "NASA Science: 10 things about the Pioneer spacecraft", u: "https://science.nasa.gov/missions/pioneer/pioneer-11/10-things-about-pioneer-spacecraft/" },
    voyagerInterstellar: { t: "NASA Science: 10 things to know about going interstellar", u: "https://science.nasa.gov/solar-system/10-things-going-interstellar/" },
    voyager2Interstellar: { t: "NASA Science: Voyager 2 enters interstellar space", u: "https://science.nasa.gov/missions/voyager/nasas-voyager-2-probe-enters-interstellar-space/" },
    voyagerLightDay: { t: "EarthSky: Voyager 1 reaches one light-day from Earth (Nov 2026)", u: "https://earthsky.org/space/voyager-1-1-light-day-from-earth-november-17-18-2026/" },
    voyagerNasa: { t: "NASA Science: Voyager", u: "https://science.nasa.gov/mission/voyager/" },
    goldenRecord: { t: "NASA Science: Voyager Golden Record", u: "https://science.nasa.gov/mission/voyager/golden-record-contents/" },
    voyagerPower: { t: "NASA: NASA turns off 2 Voyager science instruments to extend mission (2025)", u: "https://www.nasa.gov/centers-and-facilities/jpl/nasa-turns-off-2-voyager-science-instruments-to-extend-mission/" },
    nhWake: { t: "NASA Science: New Horizons wakes from hibernation in good health", u: "https://science.nasa.gov/missions/new-horizons/nasas-new-horizons-spacecraft-wakes-from-hibernation-in-good-health/" },
    nhNasa: { t: "NASA Science: New Horizons", u: "https://science.nasa.gov/mission/new-horizons/" },
    nhTombaugh: { t: "AP via Deseret News: Astronomer’s ashes nearing icy world he discovered (2015)", u: "https://www.deseret.com/2015/7/12/20483989/astronomer-s-ashes-nearing-icy-world-he-discovered-pluto/" },
    moonFacts: { t: "NASA Science: Moon facts", u: "https://science.nasa.gov/moon/facts/" },
    marsFacts: { t: "NASA Science: Mars facts", u: "https://science.nasa.gov/mars/facts/" },
    jplElements: { t: "NASA JPL Solar System Dynamics: Approximate positions of the planets", u: "https://ssd.jpl.nasa.gov/planets/approx_pos.html" },
    horizons: { t: "NASA JPL Horizons System (spacecraft trajectories)", u: "https://ssd.jpl.nasa.gov/horizons/" },
    solarSystem: { t: "NASA Science: Solar System exploration", u: "https://science.nasa.gov/solar-system/" },
    /* Official resources from the challenge page (o: 1), plus pages that back up the three machines they added */
    nssdc: { t: "NASA Space Science Data Coordinated Archive (NSSDCA)", u: "https://nssdc.gsfc.nasa.gov/", o: 1 },
    nssdcApollo11: { t: "NASA NSSDCA: Apollo 11 Lunar Module / EASEP", u: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C", o: 1 },
    nssdcApollo12: { t: "NASA NSSDCA: Apollo 12 Lunar Module / ALSEP", u: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C", o: 1 },
    nssdcApollo15: { t: "NASA NSSDCA: Apollo 15 Lunar Module / ALSEP (carried the first rover)", u: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C", o: 1 },
    surveyor3Nasa: { t: "NASA Science: Surveyor 3", u: "https://science.nasa.gov/mission/surveyor-3/", o: 1 },
    merNasa: { t: "NASA Science: Mars Exploration Rovers, Spirit and Opportunity", u: "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/", o: 1 },
    pioneer10Nasa: { t: "NASA Science: Pioneer 10", u: "https://science.nasa.gov/mission/pioneer-10/", o: 1 },
    dawnNasa: { t: "NASA Science: Dawn", u: "https://science.nasa.gov/mission/dawn/", o: 1 },
    dawnEnd: { t: "NASA JPL: NASA’s Dawn mission to asteroid belt comes to end (2018)", u: "https://www.jpl.nasa.gov/news/nasas-dawn-mission-to-asteroid-belt-comes-to-end/" },
    dawnNssdc: { t: "NASA NSSDCA: Dawn", u: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-043A" },
    ceresFacts: { t: "NASA Science: Ceres facts", u: "https://science.nasa.gov/dwarf-planets/ceres/facts/" },
    nearNasa: { t: "NASA Science: NEAR Shoemaker", u: "https://science.nasa.gov/mission/near-shoemaker/", o: 1 },
    erosNasa: { t: "NASA Science: 433 Eros", u: "https://science.nasa.gov/solar-system/asteroids/433-eros/" },
    keplerNasa: { t: "NASA Science: Kepler / K2", u: "https://science.nasa.gov/mission/kepler/", o: 1 },
    keplerEnd: { t: "NASA: NASA retires Kepler space telescope, passes planet-hunting torch (2018)", u: "https://www.nasa.gov/news-release/nasa-retires-kepler-space-telescope-passes-planet-hunting-torch/" },
    keplerGoodnight: { t: "NASA JPL: Kepler telescope bids “goodnight” with final commands (2018)", u: "https://www.jpl.nasa.gov/news/kepler-telescope-bids-goodnight-with-final-commands/" },
    keplerNssdc: { t: "NASA NSSDCA: Kepler", u: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-011A" }
  };
  LKP.sources = S;

  /* ---------- The ghosts ------------------------------------------------- */
  LKP.ghosts = [
    /* ======================= THE MOON ======================= */
    {
      id: "eagle",
      name: "Eagle’s descent stage",
      mission: "Apollo 11",
      agency: "NASA",
      world: "moon", kind: "lander", status: "silent", year: 1969,
      place: "Tranquility Base, Sea of Tranquility",
      loc: [{ lat: 0.67416, lon: 23.47314, site: "tranquility", siteName: "Tranquility Base · Apollo 11" }],
      since: "1969-07-21", sinceLabel: "Left on the Moon",
      hook: "The bottom half of the first lunar lander to carry people still stands where Neil Armstrong and Buzz Aldrin touched down.",
      story: [
        "On 20 July 1969 the lunar module Eagle landed on a flat plain called the Sea of Tranquility. The astronauts named the spot Tranquility Base. About 21½ hours later they fired the engine in Eagle’s top half and flew back to orbit, using the bottom half as their launch pad.",
        "That bottom half, the descent stage, is still there. A plaque on one of its legs reads: “Here men from the planet Earth first set foot upon the Moon, July 1969 A.D. We came in peace for all mankind.” NASA’s Lunar Reconnaissance Orbiter has photographed the site from orbit."
      ],
      voice: [
        "21 July 1969. My top half just left. I gave it a good push.",
        "My job was to land gently. I did. Now I hold a plaque that speaks for a whole planet.",
        "Nobody has visited since. The boot prints around me are still here."
      ],
      learned: [
        "People could land on another world and get home safely.",
        "The crew brought back about 21.5 kg (47.5 lb) of Moon rock and soil from this spot for scientists to study."
      ],
      facts: [["Landed", "20 Jul 1969"], ["Moonwalkers", "Neil Armstrong, Buzz Aldrin"], ["Time on the Moon", "about 21½ hours"], ["Position", "0.674° N, 23.473° E"]],
      sources: [S.nssdcApollo11, S.apollo11, S.lroc]
    },
    {
      id: "lrrr11",
      name: "Apollo 11 laser mirror",
      mission: "Apollo 11 · Laser Ranging Retroreflector",
      agency: "NASA",
      world: "moon", kind: "reflector", status: "working", year: 1969,
      place: "Tranquility Base, Sea of Tranquility",
      loc: [{ lat: 0.67416, lon: 23.47314, site: "tranquility", siteName: "Tranquility Base · Apollo 11" }],
      since: "1969-07-21", sinceLabel: "Working since",
      hook: "A panel of 100 small mirrors that scientists still aim lasers at from Earth, more than half a century later.",
      story: [
        "Buzz Aldrin set this panel down on 21 July 1969. It needs no power: each of its 100 corner-cube prisms bounces light straight back toward wherever it came from.",
        "Observatories on Earth fire laser pulses at it and time the echo, a round trip of about two and a half seconds. Mirrors left by Apollo 14 and 15 and by two Soviet rovers work the same way. Together they let scientists measure the distance to the Moon to within millimetres."
      ],
      voice: [
        "I have no batteries, no radio, no moving parts. I just reflect.",
        "Every so often a flash of laser light arrives from Earth. I send it straight back.",
        "From those echoes you learned that your Moon is drifting away, about 3.8 cm every year."
      ],
      learned: [
        "The Moon is moving away from Earth by about 3.8 cm (1.5 in) every year.",
        "Precise Moon-distance measurements are used to test Einstein’s theory of gravity."
      ],
      facts: [["Placed", "21 Jul 1969"], ["Mirrors", "100 corner cubes"], ["Power needed", "None"], ["Status", "Still used for lunar laser ranging"]],
      sources: [S.jplLLR, S.jila, S.nssdcApollo11]
    },
    {
      id: "surveyor3",
      name: "Surveyor 3",
      mission: "Surveyor program",
      agency: "NASA",
      world: "moon", kind: "lander", status: "silent", year: 1967,
      place: "Ocean of Storms",
      loc: [{ lat: -3.01612, lon: -23.41791, site: "storms", siteName: "Ocean of Storms · Apollo 12 & Surveyor 3" }],
      since: "1967-05-04", sinceLabel: "Last contact",
      hook: "The only robot that humans have ever walked up to on another world.",
      story: [
        "Surveyor 3 landed in the Ocean of Storms on 20 April 1967 to test the ground before astronauts arrived. Its engine did not shut off in time, so it bounced twice before settling. It dug trenches with a small scoop and sent back 6,326 TV pictures. The last contact came on 4 May 1967, two days after the long lunar night began.",
        "In November 1969, Apollo 12 landed about 180 m away, close enough for Pete Conrad and Alan Bean to walk over to it. They cut off about 10 kg of parts, including its TV camera, and brought them home so engineers could see what 31 months on the Moon does to a machine."
      ],
      voice: [
        "I waited two and a half years in silence.",
        "Then two visitors in white suits walked over, took my picture and cut off my camera.",
        "I’m missing a few parts now. They’re in a museum on Earth. I don’t mind."
      ],
      learned: [
        "Its scoop showed the lunar soil was like wet sand: firm enough to hold an Apollo lunar module.",
        "The returned parts showed how dust, radiation and huge temperature swings affect hardware over time."
      ],
      facts: [["Landed", "20 Apr 1967"], ["Last contact", "4 May 1967"], ["Visited by", "Apollo 12, Nov 1969"], ["Parts returned", "about 10 kg, incl. TV camera"]],
      sources: [S.surveyor3Nasa, S.nssdcApollo12, S.surveyorAlsj, S.surveyorSpace, S.lroc]
    },
    {
      id: "alsep12",
      name: "Apollo 12 science station",
      mission: "Apollo 12 · ALSEP seismometer",
      agency: "NASA",
      world: "moon", kind: "seismometer", status: "silent", year: 1969,
      place: "Ocean of Storms",
      loc: [{ lat: -3.0098, lon: -23.4249, site: "storms", siteName: "Ocean of Storms · Apollo 12 & Surveyor 3" }],
      since: "1977-09-30", sinceLabel: "Switched off",
      hook: "A nuclear-powered station that listened to the Moon shake for almost eight years.",
      story: [
        "Apollo 12 set up a science station with a seismometer, powered by a radioisotope generator. After the astronauts left, mission control steered their lunar module’s empty top half into the Moon on purpose, so the seismometer would record a crash of known size. It struck about 60 km from the station and made the first recorded artificial moonquake.",
        "The Moon kept vibrating for almost an hour, and scientists said it rang like a bell. Apollo 14, 15, 16 and 17 left more stations. Together they recorded moonquakes until NASA switched the experiments off on 30 September 1977 to save money."
      ],
      voice: [
        "I felt my own crew’s spaceship crash. That was the plan.",
        "For almost eight years I listened: meteorite strikes, shallow quakes, deep tremors.",
        "On 30 September 1977, Earth stopped listening back."
      ],
      learned: [
        "The Moon has quakes, some shallow and some very deep.",
        "Seismic waves helped reveal the Moon’s layers: a crust, a mantle and a small core."
      ],
      facts: [["Set up", "19 Nov 1969"], ["Power", "Radioisotope generator"], ["Switched off", "30 Sep 1977"], ["Position", "3.010° S, 23.425° W"]],
      sources: [S.nssdcApollo12, S.alsep, S.popsciSmash, S.lroc]
    },
    {
      id: "lrv15",
      name: "Lunar Roving Vehicle 1",
      mission: "Apollo 15",
      agency: "NASA",
      world: "moon", kind: "rover", status: "silent", year: 1971,
      place: "Hadley–Apennine",
      loc: [{ lat: 26.13174, lon: 3.63803, site: "hadley", siteName: "Hadley–Apennine · Apollo 15" }],
      since: "1971-08-02", sinceLabel: "Parked since",
      hook: "The first car ever driven on another world.",
      story: [
        "On 31 July 1971, Dave Scott and Jim Irwin unfolded an electric car from the side of their lunar module and drove it across the Moon. It let them explore much farther from their lander than earlier crews could walk, all the way to the rim of a long, winding valley called Hadley Rille.",
        "When they left, they parked it so its TV camera could film the liftoff. The camera’s tilt mechanism failed, so the shot didn’t work, but NASA tried again on the next two missions. The rover is still parked at Hadley, and its tracks have been photographed from orbit."
      ],
      voice: [
        "I came to the Moon folded up like a deck chair.",
        "Two astronauts drove me over hills and out to the edge of a winding valley.",
        "They parked me facing their ship so I could film the goodbye. My camera wouldn’t tilt up. I missed it."
      ],
      learned: [
        "Rovers let astronauts explore many kilometres from their lander.",
        "The crew found the “Genesis Rock”, a piece of the Moon’s ancient crust."
      ],
      facts: [["First drive", "31 Jul 1971"], ["Drivers", "Dave Scott, Jim Irwin"], ["Distance driven", "27.9 km"], ["Position", "26.132° N, 3.638° E"]],
      sources: [S.nssdcApollo15, S.lrocTracks15, S.utLiftoff, S.lroc]
    },
    {
      id: "lrv16",
      name: "Lunar Roving Vehicle 2",
      mission: "Apollo 16",
      agency: "NASA",
      world: "moon", kind: "rover", status: "silent", year: 1972,
      place: "Descartes Highlands",
      loc: [{ lat: -8.9729, lon: 15.5037, site: "descartes", siteName: "Descartes Highlands · Apollo 16" }],
      since: "1972-04-24", sinceLabel: "Parked since",
      hook: "The rover that took a “Grand Prix” test drive in the lunar highlands.",
      story: [
        "Apollo 16 was the first mission to explore the Moon’s bright, rugged highlands. John Young and Charlie Duke used their rover to climb the slopes of Stone Mountain and reach the rim of North Ray crater.",
        "Before the real work began, Young put the rover through a speed-and-handling test while Duke filmed it, a clip now known as the “Grand Prix”. At the end of the mission the rover was parked for the liftoff shot, but not quite in the right spot to follow the ascent."
      ],
      voice: [
        "My first job was a test drive. Bumps, skids, a lot of dust in the air.",
        "Then the real work: up the slopes, out to the crater rims, home with heavy bags of rock.",
        "I’m parked in the highlands now, a little off my mark."
      ],
      learned: [
        "Scientists expected volcanic rocks here. Instead the highlands turned out to be made mostly of rock smashed and welded together by meteorite impacts."
      ],
      facts: [["Landed", "21 Apr 1972"], ["Drivers", "John Young, Charlie Duke"], ["Region", "Descartes highlands"], ["Position", "8.973° S, 15.504° E"]],
      sources: [S.apollo16, S.utLiftoff, S.lroc]
    },
    {
      id: "lrv17",
      name: "Lunar Roving Vehicle 3",
      mission: "Apollo 17",
      agency: "NASA",
      world: "moon", kind: "rover", status: "silent", year: 1972,
      place: "Taurus–Littrow valley",
      loc: [{ lat: 20.1896, lon: 30.7769, site: "taurus", siteName: "Taurus–Littrow · Apollo 17" }],
      since: "1972-12-14", sinceLabel: "Parked since",
      hook: "The last car on the Moon, and the camera that filmed humans leaving.",
      story: [
        "Gene Cernan and Harrison Schmitt drove about 35.7 km around the valley of Taurus–Littrow. No NASA vehicle drove farther on another world until Opportunity, on Mars, in 2014. Schmitt, a geologist, was the first professional scientist to walk on the Moon.",
        "On 14 December 1972 they parked the rover about 145 m from their lunar module. In Houston, controller Ed Fendell sent camera commands ahead of time to allow for the radio delay. The rover’s camera tilted up and followed the ascent stage Challenger into the black sky. No human has stood on the Moon since."
      ],
      voice: [
        "My last job was to watch them go.",
        "Houston moved my camera up, up, up, and I followed their ship until it was a speck.",
        "Then it was just me and the valley. That was December 1972."
      ],
      learned: [
        "Schmitt spotted orange soil, which turned out to be tiny glass beads from ancient volcanic eruptions."
      ],
      facts: [["Liftoff filmed", "14 Dec 1972"], ["Distance driven", "about 35.7 km"], ["Drivers", "Gene Cernan, Harrison Schmitt"], ["Position", "20.190° N, 30.777° E"]],
      sources: [S.nasmLiftoff, S.utLiftoff, S.psRecord, S.lroc]
    },
    {
      id: "lunokhod1",
      name: "Lunokhod 1",
      mission: "Luna 17",
      agency: "Soviet Union",
      world: "moon", kind: "rover", status: "silent", year: 1970,
      place: "Sea of Rains",
      loc: [{ lat: 38.315, lon: -35.0081, site: "imbrium", siteName: "Sea of Rains · Luna 17" }],
      since: "1971-09", sinceLabel: "Silent since",
      hook: "The first robot rover to drive on another world. Lost for decades, then found.",
      story: [
        "In November 1970 the Soviet Luna 17 lander delivered Lunokhod 1, an eight-wheeled rover driven by a team on Earth. It explored the Sea of Rains for about ten months and drove roughly 10 km.",
        "Its laser reflector went “missing” because nobody knew exactly where the rover had stopped. In 2010, NASA’s Lunar Reconnaissance Orbiter spotted it in a photo. Weeks later a team in New Mexico fired a laser at that spot and got a bright echo back."
      ],
      voice: [
        "For forty years, nobody could find me.",
        "Then a spacecraft overhead took my picture, and a telescope in New Mexico knocked on my door with a laser.",
        "I answered. My mirror still works."
      ],
      learned: [
        "A rover can be driven on another world from Earth, despite the radio delay.",
        "Finding its reflector again gave scientists one more target for measuring the Moon’s motion."
      ],
      facts: [["Landed", "17 Nov 1970"], ["Driven by", "Operators on Earth"], ["Found again", "2010, by NASA’s LRO"], ["Position", "38.315° N, 35.008° W"]],
      sources: [S.lostReflector, S.lunokhodArxiv, S.lroc]
    },
    {
      id: "lunokhod2",
      name: "Lunokhod 2",
      mission: "Luna 21",
      agency: "Soviet Union",
      world: "moon", kind: "rover", status: "silent", year: 1973,
      place: "Le Monnier crater",
      loc: [{ lat: 25.8323, lon: 30.9222, site: "lemonnier", siteName: "Le Monnier crater · Luna 21" }],
      since: "1973", sinceLabel: "Silent since",
      hook: "For 41 years it held the record for the longest drive on another world.",
      story: [
        "Lunokhod 2 arrived in January 1973 and drove around Le Monnier crater, on the eastern edge of the Sea of Serenity. Images from NASA’s Lunar Reconnaissance Orbiter later traced its tracks and showed it had covered about 39 km.",
        "That record stood until 27 July 2014, when NASA’s Opportunity rover passed it on Mars. Opportunity’s team named a small Martian crater “Lunokhod 2” to honour the rover it had overtaken."
      ],
      voice: [
        "I drove 39 kilometres across the Moon. Nobody drove farther for 41 years.",
        "In 2014, a rover on Mars finally passed me.",
        "It named a crater after me. Good sportsmanship."
      ],
      learned: [
        "Its tracks, photographed by NASA’s LRO, let scientists measure exactly how far it drove."
      ],
      facts: [["Landed", "Jan 1973"], ["Distance", "about 39 km (LRO measurement)"], ["Record broken", "27 Jul 2014, by Opportunity"], ["Position", "25.832° N, 30.922° E"]],
      sources: [S.lrocLunokhod2, S.psRecord, S.lroc]
    },
    {
      id: "crashtests",
      name: "The crash-test stages",
      mission: "Apollo 12–17 · S-IVB & ascent stages",
      agency: "NASA",
      world: "moon", kind: "impact", status: "impact", year: 1969,
      place: "Five Saturn V stage craters across the near side",
      loc: [
        { lat: -2.555, lon: -27.8875, site: "sivb13", siteName: "Apollo 13 S-IVB impact" },
        { lat: -8.181, lon: -26.0305, site: "sivb14", siteName: "Apollo 14 S-IVB impact" },
        { lat: -1.2897, lon: -11.8245, site: "sivb15", siteName: "Apollo 15 S-IVB impact" },
        { lat: 1.921, lon: -24.623, site: "sivb16", siteName: "Apollo 16 S-IVB impact" },
        { lat: -4.1681, lon: -12.3307, site: "sivb17", siteName: "Apollo 17 S-IVB impact" }
      ],
      since: "1972-12-15", sinceLabel: "Last impact",
      hook: "Nine spent spacecraft stages were crashed into the Moon on purpose, so seismometers could hear them.",
      story: [
        "A seismometer is only useful if you know what it’s hearing. So NASA steered empty spacecraft stages into the Moon at known times and places: five Saturn V third stages (called S-IVBs) and four lunar module ascent stages.",
        "Each crash sent seismic waves through the Moon to the instruments the astronauts had set up. The last was Apollo 17’s ascent stage, Challenger, on 15 December 1972. The craters made by the S-IVBs have since been found in orbital photos."
      ],
      voice: [
        "We were empty. Our jobs were done.",
        "So NASA gave us one last job: fall.",
        "Every crater we made taught a seismometer what an impact sounds like."
      ],
      learned: [
        "Crashes of known size let scientists calibrate their seismometers and study how waves travel through the Moon."
      ],
      facts: [["Stages crashed", "9 (5 S-IVBs, 4 ascent stages)"], ["Years", "1969–1972"], ["Purpose", "Seismic experiments"], ["Craters mapped", "LRO camera"]],
      sources: [S.popsciSmash, S.lroc]
    },
    {
      id: "prospector",
      name: "Lunar Prospector",
      mission: "Lunar Prospector",
      agency: "NASA",
      world: "moon", kind: "orbiter", status: "impact", year: 1998,
      place: "Shoemaker crater, near the south pole",
      loc: [{ lat: -87.7, lon: 42.1, site: "shoemaker", siteName: "Shoemaker crater (approx.) · Lunar Prospector" }],
      since: "1999-07-31", sinceLabel: "Impact",
      hook: "A small orbiter that ended its mission with a planned crash, carrying a famous scientist’s ashes.",
      story: [
        "Lunar Prospector circled the Moon in 1998 and 1999 and found extra hydrogen near both poles. That was a clue that water ice might be hiding in craters that never see sunlight.",
        "At the end of its mission, NASA crashed it into a shadowed crater near the south pole on 31 July 1999, hoping telescopes would spot water vapour in the debris. They didn’t. On board was a small capsule holding some of the ashes of Eugene Shoemaker, a planetary geologist who had helped train Apollo astronauts. The crater now carries his name."
      ],
      voice: [
        "I mapped the Moon from above, pole to pole.",
        "My last job was to fall into the dark and see what splashed up.",
        "Nothing did. But I carried someone with me, a scientist who always wanted to go to the Moon."
      ],
      learned: [
        "Its hydrogen maps pointed later missions toward the Moon’s icy poles.",
        "Even a “no result” is useful: it showed how hard it is to see water from Earth."
      ],
      facts: [["Launched", "January 1998"], ["Impact", "31 Jul 1999"], ["Target", "Shadowed crater near the south pole"], ["Position (approx.)", "87.7° S, 42.1° E"]],
      sources: [S.lpNasa, S.lpAstronomy]
    },
    {
      id: "lcross",
      name: "LCROSS",
      mission: "Lunar Crater Observation and Sensing Satellite",
      agency: "NASA",
      world: "moon", kind: "impact", status: "impact", year: 2009,
      place: "Cabeus crater, near the south pole",
      loc: [{ lat: -84.9, lon: -35.5, site: "cabeus", siteName: "Cabeus crater (approx.) · LCROSS" }],
      since: "2009-10-09", sinceLabel: "Impact",
      hook: "Ten years after Lunar Prospector, NASA tried again, and this time it found water.",
      story: [
        "On 9 October 2009 an empty Centaur rocket stage slammed into Cabeus, a crater near the Moon’s south pole that never sees sunlight. The LCROSS spacecraft, which had ridden there attached to the stage, followed behind and flew through the cloud of debris, measuring it, before crashing itself minutes later.",
        "Its instruments found water in the plume. That discovery is one reason NASA’s Artemis program is aiming for the Moon’s south pole."
      ],
      voice: [
        "I rode a rocket stage all the way to the Moon, then let it go.",
        "It hit first. I flew through the cloud it threw up, tasting it.",
        "Water. Then it was my turn."
      ],
      learned: [
        "Cold, permanently shadowed craters near the lunar south pole hold water ice."
      ],
      facts: [["Impact", "9 Oct 2009"], ["Crater", "Cabeus, near the south pole"], ["Found", "Water in the debris plume"], ["Position (approx.)", "84.9° S, 35.5° W"]],
      sources: [S.lcrossNasa, S.lcrossAstronomy]
    },

    /* ======================= MARS ======================= */
    {
      id: "viking1",
      name: "Viking 1 lander",
      mission: "Viking 1",
      agency: "NASA",
      world: "mars", kind: "lander", status: "silent", year: 1976,
      place: "Chryse Planitia",
      loc: [{ lat: 22.27, lon: -47.95, site: "chryse", siteName: "Chryse Planitia · Viking 1" }],
      since: "1982-11-11", sinceLabel: "Last signal",
      hook: "NASA’s first Mars lander touched down seven years to the day after Apollo 11, and worked for more than six years.",
      story: [
        "Viking 1 landed on 20 July 1976 on a plain called Chryse Planitia. It sent back the first clear pictures from the surface of Mars, reported the weather every day and scooped up soil to test it for signs of life.",
        "The life-detection results were puzzling and scientists still debate them. Viking 1 kept working until 11 November 1982, when a faulty command sent from Earth cut off communications. Every attempt to regain contact failed."
      ],
      voice: [
        "20 July 1976. Seven years to the day after people first walked on the Moon, I opened my eyes on Mars.",
        "I tasted the soil for signs of life. The answers were… complicated.",
        "I was still working in 1982 when a wrong command from home cut the line."
      ],
      learned: [
        "The surface of Mars is dry, cold and blasted by ultraviolet light, tough conditions for life.",
        "Its weather station gave the first long record of Martian seasons measured from the ground."
      ],
      facts: [["Landed", "20 Jul 1976"], ["Planned mission", "90 days"], ["Last signal", "11 Nov 1982"], ["Position", "22.27° N, 47.95° W"]],
      sources: [S.viking1Nasa, S.vikingLander, S.viking1Gsfc, S.viking1Hirise]
    },
    {
      id: "viking2",
      name: "Viking 2 lander",
      mission: "Viking 2",
      agency: "NASA",
      world: "mars", kind: "lander", status: "silent", year: 1976,
      place: "Utopia Planitia",
      loc: [{ lat: 48.269, lon: 134.01, site: "utopia", siteName: "Utopia Planitia · Viking 2" }],
      since: "1980-04", sinceLabel: "Last signal",
      hook: "It photographed frost on Mars: a thin layer of water ice on the ground around it.",
      story: [
        "Viking 2 landed on 3 September 1976 on Utopia Planitia, much farther north than its twin. It repeated the soil and life experiments in a different place so scientists could compare the two sites.",
        "During the Martian winter its cameras caught a thin coat of frost on the rocks and soil. Viking 2 kept working until its batteries failed in April 1980."
      ],
      voice: [
        "I landed far to the north of my twin, on a plain scattered with rocks.",
        "One winter morning I saw frost all around me. Ice, on Mars.",
        "My batteries gave out in April 1980."
      ],
      learned: [
        "Water frost forms on the Martian surface in winter.",
        "Soil at the two Viking sites, thousands of kilometres apart, turned out to be remarkably similar."
      ],
      facts: [["Landed", "3 Sep 1976"], ["Region", "Utopia Planitia"], ["Last signal", "Apr 1980"], ["Position", "48.27° N, 134.01° E"]],
      sources: [S.viking2Nasa, S.vikingLander, S.viking1Nasa]
    },
    {
      id: "sojourner",
      name: "Sojourner & Pathfinder",
      mission: "Mars Pathfinder",
      agency: "NASA",
      world: "mars", kind: "rover", status: "silent", year: 1997,
      place: "Ares Vallis",
      loc: [{ lat: 19.13, lon: -33.22, site: "ares", siteName: "Ares Vallis · Mars Pathfinder" }],
      since: "1997-09-27", sinceLabel: "Last signal",
      hook: "The first rover on Mars was about the size of a microwave oven.",
      story: [
        "On 4 July 1997, Mars Pathfinder bounced onto Mars inside a bundle of airbags, rolled to a stop and opened up like a flower. Out drove Sojourner, a six-wheeled rover weighing about 10.6 kg.",
        "Sojourner was planned to work for 7 sols (a sol is a Martian day). It lasted 83, driving about 100 m in total while studying rocks the team nicknamed Barnacle Bill and Yogi. It never went more than about 12 m from the lander, its only link to Earth. Contact ended on 27 September 1997."
      ],
      voice: [
        "I was small enough to carry in your arms.",
        "They gave me a week. I worked for nearly three months.",
        "I always stayed close to my lander. It was my only way to talk to Earth."
      ],
      learned: [
        "Airbag landings and small rovers worked, which paved the way for Spirit and Opportunity.",
        "Rocks at the site suggested Ares Vallis had been carved by giant ancient floods."
      ],
      facts: [["Landed", "4 Jul 1997"], ["Planned", "7 sols"], ["Lasted", "83 sols"], ["Position", "19.13° N, 33.22° W"]],
      sources: [S.pathfinderNasa, S.sojournerSpace]
    },
    {
      id: "spirit",
      name: "Spirit",
      mission: "Mars Exploration Rover A",
      agency: "NASA",
      world: "mars", kind: "rover", status: "silent", year: 2004,
      place: "Gusev crater",
      loc: [{ lat: -14.5684, lon: 175.4726, site: "gusev", siteName: "Gusev crater · Spirit" }],
      since: "2010-03-22", sinceLabel: "Last signal",
      hook: "Stuck in soft sand, it kept doing science where it stood.",
      story: [
        "Spirit landed in Gusev crater on 4 January 2004, built to work for about 90 sols. It lasted more than six years and drove about 7.7 km, climbing into a range of hills to study rocks that had been changed by water.",
        "In 2007, with one front wheel no longer turning, Spirit dragged it along and scraped up bright soil that was more than 90% silica, a sign of ancient hot springs or steam vents. In May 2009 it got stuck in soft soil. Engineers tried for months to free it, then turned it into a stationary science station. Its last signal came on 22 March 2010."
      ],
      voice: [
        "One of my wheels stopped turning, so I dragged it behind me.",
        "That wheel dug up something bright: almost pure silica. Hot water was here once.",
        "Then the sand held me. I couldn’t tilt toward the Sun for winter, so I went to sleep."
      ],
      learned: [
        "Gusev crater once had hot water or steam, the kind of place where microbes thrive on Earth."
      ],
      facts: [["Landed", "4 Jan 2004"], ["Planned", "about 90 sols"], ["Distance", "about 7.7 km"], ["Last signal", "22 Mar 2010"]],
      sources: [S.merNasa, S.spiritNasa, S.spiritPS, S.spiritASU]
    },
    {
      id: "opportunity",
      name: "Opportunity",
      mission: "Mars Exploration Rover B",
      agency: "NASA",
      world: "mars", kind: "rover", status: "silent", year: 2004,
      place: "Meridiani Planum",
      loc: [{ lat: -1.9462, lon: -5.5266, site: "meridiani", siteName: "Meridiani Planum · Opportunity" }],
      since: "2018-06-10", sinceLabel: "Last signal",
      hook: "Built for 90 Martian days, it worked for more than 14 years and drove farther than a marathon.",
      story: [
        "Opportunity landed on 25 January 2004 on Meridiani Planum. Within weeks it found tiny round pebbles of the mineral hematite, nicknamed “blueberries”: evidence that water once soaked these rocks.",
        "It drove 45.16 km in all. In 2014 it broke the record for the longest drive on another world, and it kept that record until 11 October 2026, when Perseverance passed its mark. In June 2018 a planet-wide dust storm blotted out the Sun. Its final data, sent on 10 June 2018 (sol 5,111), showed low power and a darkening sky, which people later summed up as “My battery is low and it’s getting dark.” NASA sent more than 1,000 commands trying to wake it, then declared the mission over on 13 February 2019."
      ],
      voice: [
        "90 sols. That’s what they planned for me.",
        "I found blueberries, crossed craters and drove farther than a marathon.",
        "Then the sky filled with dust and my panels went dark. I kept the last of my power for the batteries, and waited."
      ],
      learned: [
        "Meridiani Planum was once wet: water soaked its rocks long ago.",
        "Careful driving and lucky gusts of wind that cleaned dust off its panels let a 90-day rover last 14 years."
      ],
      facts: [["Landed", "25 Jan 2004"], ["Planned", "about 90 sols"], ["Distance", "45.16 km (28.06 miles)"], ["Last signal", "10 Jun 2018 · sol 5,111"]],
      sources: [S.merNasa, S.oppLast, S.oppPS, S.psRecord, S.oppNasa]
    },
    {
      id: "phoenix",
      name: "Phoenix",
      mission: "Phoenix Mars Lander",
      agency: "NASA",
      world: "mars", kind: "lander", status: "silent", year: 2008,
      place: "Vastitas Borealis, near the north pole",
      loc: [{ lat: 68.2188, lon: -125.7492, site: "vastitas", siteName: "Vastitas Borealis · Phoenix" }],
      since: "2008-11-02", sinceLabel: "Last signal",
      hook: "It dug into the Martian arctic and found ice just under the dirt.",
      story: [
        "Phoenix landed on 25 May 2008 on the icy plains near Mars’s north pole. Its robotic arm dug shallow trenches and uncovered bright water ice just a few centimetres down. Small chunks of it slowly vanished into the thin air over a few days.",
        "As autumn came, there was less and less sunlight for its solar panels. Phoenix sent its last signal on 2 November 2008. Orbiter photos taken in 2010 showed that winter ice had damaged its solar panels."
      ],
      voice: [
        "I dug, and the dirt turned white under my scoop. Ice.",
        "The Sun got lower every day. I knew winter was coming.",
        "The frost came down on me, heavy enough to bend my wings."
      ],
      learned: [
        "Water ice lies just below the surface in Mars’s far north.",
        "The soil contains salts called perchlorates, which matter for Martian chemistry and for future explorers.",
        "Its design proved itself: ten years later the InSight lander was built on the same plan."
      ],
      facts: [["Landed", "25 May 2008"], ["Region", "near the north pole"], ["Last signal", "2 Nov 2008"], ["Position", "68.22° N, 125.75° W"]],
      sources: [S.phoenixJPL, S.phoenixNasa, S.insightNasa]
    },
    {
      id: "insight",
      name: "InSight",
      mission: "Interior Exploration using Seismic Investigations",
      agency: "NASA",
      world: "mars", kind: "seismometer", status: "silent", year: 2018,
      place: "Elysium Planitia",
      loc: [{ lat: 4.5024, lon: 135.6234, site: "elysium", siteName: "Elysium Planitia · InSight" }],
      since: "2022-12-15", sinceLabel: "Last signal",
      hook: "It listened to Mars shake more than 1,300 times.",
      story: [
        "InSight landed on 26 November 2018 on Elysium Planitia, a flat, smooth plain chosen because it was safe rather than pretty. Its job was to study the inside of Mars, so it set a super-sensitive seismometer on the ground and listened.",
        "Over four years it detected more than 1,300 marsquakes, and even felt meteorites hitting the planet. Dust slowly covered its solar panels. Its last contact came on 15 December 2022, and NASA ended the mission on 21 December 2022."
      ],
      voice: [
        "I didn’t come to drive. I came to listen.",
        "Mars rumbled: more than 1,300 marsquakes, and the thuds of falling meteorites.",
        "Dust covered my solar panels like a blanket. I sent my last message in December 2022."
      ],
      learned: [
        "Marsquake waves let scientists measure the thickness of Mars’s crust and the size of its core."
      ],
      facts: [["Landed", "26 Nov 2018"], ["Marsquakes", "more than 1,300"], ["Last signal", "15 Dec 2022"], ["Position", "4.50° N, 135.62° E"]],
      sources: [S.insightNasa]
    },
    {
      id: "ingenuity",
      name: "Ingenuity",
      mission: "Mars Helicopter",
      agency: "NASA",
      world: "mars", kind: "helicopter", status: "silent", year: 2021,
      place: "Valinor Hills, Jezero crater",
      loc: [{ lat: 18.447, lon: 77.402, site: "jezero", siteName: "Jezero crater (approx.) · Perseverance & Ingenuity" }],
      since: "2024-04-16", sinceLabel: "Final data",
      hook: "The first aircraft to fly on another planet. Planned for 5 flights, it made 72.",
      story: [
        "Ingenuity rode to Mars tucked under the belly of the Perseverance rover. On 19 April 2021 it lifted off, hovered and landed: the first powered, controlled flight on another planet. Under its solar panel it carried a tiny scrap of fabric from the Wright brothers’ 1903 Flyer.",
        "It was meant to make up to five test flights in 30 days. Instead it flew 72 times over nearly three years, scouting ahead for the rover. On its 72nd flight, on 18 January 2024, a rough landing damaged its rotor blades. It rests at a spot the team named Valinor Hills and sent its final data to Earth on 16 April 2024."
      ],
      voice: [
        "The air here is so thin that my blades spin about 2,400 times a minute just to lift me.",
        "They planned five flights. I flew 72.",
        "My blades are broken now. Every day I still wake up, check myself and write it down for whoever comes next."
      ],
      learned: [
        "Flying on Mars is possible, so future missions may carry helicopters as scouts.",
        "Its aerial photos helped plan safer, faster routes for Perseverance."
      ],
      facts: [["First flight", "19 Apr 2021"], ["Flights", "72 (5 planned)"], ["Time in the air", "about 2 h 9 min"], ["Final data", "16 Apr 2024"]],
      sources: [S.ingenuityJPL, S.ingenuityNasa, S.wrightSpace]
    },
    {
      id: "polarlander",
      name: "Mars Polar Lander",
      mission: "Mars Surveyor ’98",
      agency: "NASA",
      world: "mars", kind: "lander", status: "lost", year: 1999,
      place: "Near the south polar cap",
      loc: [{ lat: -76, lon: 165, site: "ultimi", siteName: "Target area (approx.) · Mars Polar Lander" }],
      since: "1999-12-03", sinceLabel: "Contact lost",
      hook: "It vanished during landing, and its fate is still not known for certain.",
      story: [
        "Mars Polar Lander was supposed to touch down near Mars’s south pole on 3 December 1999 and dig for water. Its radio was expected to come back after landing. It never did.",
        "Investigators concluded the most likely cause was a software problem: sensors in the landing legs may have mistaken a jolt for touchdown, shutting off the engines about 40 m above the ground."
      ],
      voice: [
        "I went quiet on purpose for the descent. I was supposed to call home after landing.",
        "I never did. Nobody knows exactly what happened to me.",
        "Somewhere near the south pole, I am a question."
      ],
      learned: [
        "Its loss pushed engineers to test landing software and sensors much more carefully."
      ],
      facts: [["Arrival", "3 Dec 1999"], ["Target", "Near the south polar cap"], ["Status", "Lost during landing"], ["Likely cause", "Engines shut off early"]],
      sources: [S.mplNasa]
    },
    {
      id: "climateorbiter",
      name: "Mars Climate Orbiter",
      mission: "Mars Surveyor ’98",
      agency: "NASA",
      world: "mars", kind: "orbiter", status: "lost", year: 1999,
      place: "Lost while entering orbit",
      since: "1999-09-23", sinceLabel: "Contact lost",
      hook: "A spacecraft lost because two teams used different units.",
      story: [
        "Mars Climate Orbiter reached Mars on 23 September 1999 and fired its engine to slip into orbit. It passed behind the planet as planned, and never came out.",
        "Investigators found that one piece of ground software reported thruster data in English units (pound-force seconds) while the navigation software expected metric units (newton-seconds). The error built up during the nine-month cruise, and the spacecraft flew far too close to Mars."
      ],
      voice: [
        "They told me I was on course. I wasn’t.",
        "Someone measured in pounds. Someone else read it as newtons.",
        "I went behind Mars and never came out. Check your units."
      ],
      learned: [
        "Units matter! Its loss is still used to teach engineers to check every number."
      ],
      facts: [["Arrival", "23 Sep 1999"], ["Cause", "Units mix-up (English vs metric)"], ["Size of error", "a factor of 4.45"], ["Fate", "Destroyed or flung into space"]],
      sources: [S.mcoSMA, S.mcoNasa]
    },
    {
      id: "curiosity",
      name: "Curiosity",
      mission: "Mars Science Laboratory",
      agency: "NASA",
      world: "mars", kind: "rover", status: "working", year: 2012,
      place: "Gale crater",
      loc: [{ lat: -4.5895, lon: 137.4417, site: "gale", siteName: "Gale crater · Curiosity" }],
      since: "2012-08-06", sinceLabel: "Exploring since",
      hook: "Still climbing Mount Sharp, one of the rovers the ghosts made possible.",
      story: [
        "Curiosity landed in Gale crater on 6 August 2012 and is still exploring. It runs on a radioisotope power source instead of solar panels, so a dust storm can’t starve it of sunlight the way one did Opportunity.",
        "It discovered that Gale crater once held a lake with the chemical ingredients that microbes would need."
      ],
      voice: [
        "I’m not a ghost. Not yet.",
        "I learned from the rovers before me. I carry my own power, so dust storms don’t put me to sleep."
      ],
      learned: [
        "Ancient Gale crater held a lake that could have supported microbial life."
      ],
      facts: [["Landed", "6 Aug 2012"], ["Power", "Radioisotope generator"], ["Status", "Exploring"], ["Position", "4.59° S, 137.44° E"]],
      sources: [S.curiosityNasa]
    },
    {
      id: "perseverance",
      name: "Perseverance",
      mission: "Mars 2020",
      agency: "NASA",
      world: "mars", kind: "rover", status: "working", year: 2021,
      place: "Jezero crater",
      loc: [{ lat: 18.447, lon: 77.402, site: "jezero", siteName: "Jezero crater (approx.) · Perseverance & Ingenuity" }],
      since: "2021-02-18", sinceLabel: "Exploring since",
      hook: "It left sealed rock samples on the ground: hardware left behind on purpose.",
      story: [
        "Perseverance landed in Jezero crater on 18 February 2021, near an ancient river delta, carrying Ingenuity under its belly.",
        "It drills rock cores and seals them in tubes. Ten tubes were set down on the surface at a spot called Three Forks, a backup sample depot waiting for a future mission.",
        "On 11 October 2026 it passed Opportunity’s 45.16 km to become the machine that has driven farthest on another world. It is still going."
      ],
      voice: [
        "I left ten sealed tubes on the ground at a place called Three Forks.",
        "Not abandoned. Saved for later."
      ],
      learned: [
        "Jezero crater once held a lake fed by a river, a good place to look for signs of ancient life."
      ],
      facts: [["Landed", "18 Feb 2021"], ["Region", "Jezero crater"], ["Sample depot", "10 tubes at Three Forks"], ["Driving record", "since 11 Oct 2026"]],
      sources: [S.perseveranceNasa, S.merNasa]
    },

    /* ======================= DEEP SPACE ======================= */
    {
      id: "pioneer10",
      name: "Pioneer 10",
      mission: "Pioneer program",
      agency: "NASA",
      world: "deep", kind: "probe", status: "silent", year: 1972,
      place: "Leaving the solar system",
      since: "2003-01-23", sinceLabel: "Last signal",
      hook: "The first spacecraft to cross the asteroid belt and fly past Jupiter.",
      story: [
        "Pioneer 10 launched on 2 March 1972. It was the first spacecraft to travel through the asteroid belt and, in December 1973, the first to fly past Jupiter.",
        "Its signal grew weaker as its power source faded, and the last faint signal arrived on 23 January 2003, after an 11-hour-20-minute trip from 12.23 billion km away. It carries a gold-anodized plaque, designed by Carl Sagan and Frank Drake, showing two humans and a map of where Earth is."
      ],
      voice: [
        "I was the first to fly through the asteroid belt. Nobody knew if I’d make it.",
        "I passed Jupiter and kept going.",
        "My voice faded in 2003. I’m still carrying your picture."
      ],
      learned: [
        "The asteroid belt is safe to fly through.",
        "Jupiter’s radiation belts are fierce, which later missions like Voyager needed to know."
      ],
      facts: [["Launched", "2 Mar 1972"], ["Jupiter flyby", "Dec 1973"], ["Last signal", "23 Jan 2003"], ["Carries", "The Pioneer plaque"]],
      sources: [S.pioneer10Nasa, S.pioneer10Things, S.pioneerPlaque]
    },
    {
      id: "pioneer11",
      name: "Pioneer 11",
      mission: "Pioneer program",
      agency: "NASA",
      world: "deep", kind: "probe", status: "silent", year: 1973,
      place: "Heading toward the constellation Aquila",
      since: "1995-09-30", sinceLabel: "Last signal",
      hook: "The first spacecraft to visit Saturn.",
      story: [
        "Pioneer 11 launched in April 1973, flew past Jupiter in 1974 and in September 1979 became the first spacecraft to visit Saturn.",
        "Eventually its power ran too low to keep working. NASA’s last contact came on 30 September 1995. It is heading toward the constellation Aquila and will pass near one of its stars in about four million years."
      ],
      voice: [
        "I showed you Saturn up close before anyone else.",
        "Then I headed for the dark. My last words reached Earth in 1995.",
        "In four million years I’ll drift past a star in Aquila. I’ll still have your plaque."
      ],
      learned: [
        "It gave humanity the first close-up look at Saturn and its rings."
      ],
      facts: [["Launched", "Apr 1973"], ["Saturn flyby", "Sep 1979"], ["Last contact", "30 Sep 1995"], ["Heading", "Toward Aquila"]],
      sources: [S.pioneer11Things, S.pioneerPlaque, S.pioneer10Nasa]
    },
    {
      id: "voyager1",
      name: "Voyager 1",
      mission: "Voyager program",
      agency: "NASA",
      world: "deep", kind: "probe", status: "working", year: 1977,
      place: "Interstellar space",
      since: "1977-09-05", sinceLabel: "Talking to Earth since",
      hook: "The most distant human-made object, about one light-day from Earth as of November 2026.",
      story: [
        "Voyager 1 launched on 5 September 1977 and flew past Jupiter and Saturn. On 14 February 1990 it turned around and photographed Earth from about 6 billion km away: the famous “Pale Blue Dot”.",
        "On 25 August 2012 it became the first spacecraft to reach interstellar space, and it is still sending data. In November 2026 NASA expects it to become the first spacecraft one light-day from Earth: a radio message will take a full day to reach it."
      ],
      voice: [
        "I took your picture once. You were a pale blue dot, smaller than a pixel.",
        "I crossed into interstellar space in 2012. I’m still talking.",
        "Your messages take a whole day to reach me now. Keep them coming."
      ],
      learned: [
        "The Sun’s bubble, the heliosphere, has a real edge, and Voyager 1 measured what lies beyond it."
      ],
      facts: [["Launched", "5 Sep 1977"], ["Interstellar space", "25 Aug 2012"], ["One light-day", "expected Nov 2026"], ["Carries", "The Golden Record"]],
      sources: [S.voyagerInterstellar, S.voyagerLightDay, S.goldenRecord, S.voyagerNasa]
    },
    {
      id: "voyager2",
      name: "Voyager 2",
      mission: "Voyager program",
      agency: "NASA",
      world: "deep", kind: "probe", status: "working", year: 1977,
      place: "Interstellar space",
      since: "1977-08-20", sinceLabel: "Talking to Earth since",
      hook: "The only spacecraft ever to visit Uranus and Neptune.",
      story: [
        "Voyager 2 actually launched first, on 20 August 1977. It is the only spacecraft to have flown past all four giant planets: Jupiter, Saturn, Uranus in 1986 and Neptune in 1989.",
        "It entered interstellar space on 5 November 2018. To stretch its shrinking power supply, NASA has been switching off instruments one at a time so the spacecraft can keep talking for as long as possible."
      ],
      voice: [
        "I left before my twin, on the longer road.",
        "Uranus in 1986. Neptune in 1989. No one else has been there since.",
        "They are switching off my instruments one by one to save power. I understand."
      ],
      learned: [
        "Uranus and Neptune are “ice giants” with strangely tilted magnetic fields."
      ],
      facts: [["Launched", "20 Aug 1977"], ["Uranus / Neptune", "1986 / 1989"], ["Interstellar space", "5 Nov 2018"], ["Carries", "The Golden Record"]],
      sources: [S.voyager2Interstellar, S.voyagerPower, S.goldenRecord]
    },
    {
      id: "newhorizons",
      name: "New Horizons",
      mission: "New Frontiers program",
      agency: "NASA",
      world: "deep", kind: "probe", status: "working", year: 2006,
      place: "The Kuiper Belt",
      since: "2006-01-19", sinceLabel: "Talking to Earth since",
      hook: "It flew past Pluto, and it carries some of the ashes of the man who discovered it.",
      story: [
        "New Horizons launched on 19 January 2006 and flew past Pluto on 14 July 2015, revealing ice mountains and a giant heart-shaped plain. On 1 January 2019 it flew past Arrokoth, the most distant object ever explored up close.",
        "It carries a small capsule with some of the ashes of Clyde Tombaugh, who discovered Pluto in 1930. After a record-long hibernation it woke up healthy on 23 June 2026, about 9.5 billion km from Earth."
      ],
      voice: [
        "I crossed the solar system to say hello to Pluto. It had a heart.",
        "I carry the person who found Pluto in 1930.",
        "I just woke from my longest sleep. I’m about 9.5 billion km away, and still working."
      ],
      learned: [
        "Pluto is geologically active, with mountains of water ice and glaciers of frozen nitrogen."
      ],
      facts: [["Launched", "19 Jan 2006"], ["Pluto flyby", "14 Jul 2015"], ["Arrokoth flyby", "1 Jan 2019"], ["Woke from hibernation", "23 Jun 2026"]],
      sources: [S.nhWake, S.nhNasa, S.nhTombaugh]
    },
    {
      id: "near",
      name: "NEAR Shoemaker",
      mission: "Near Earth Asteroid Rendezvous",
      agency: "NASA",
      world: "deep", kind: "lander", status: "silent", year: 2001,
      place: "On asteroid 433 Eros",
      at: "eros",
      since: "2001-02-28", sinceLabel: "Last contact",
      hook: "It was never built to land. It touched down on an asteroid anyway, and kept working for two more weeks.",
      story: [
        "NEAR was the first spacecraft to orbit an asteroid. It reached Eros, a rock about 34 km long, on 14 February 2000, a year later than planned because an engine burn had been aborted. While it circled, NASA renamed it NEAR Shoemaker in honour of the geologist Eugene Shoemaker.",
        "At the end of its mission the team tried something it was not designed for. On 12 February 2001 it drifted down, taking 69 close-up photos on the way, and touched the surface at about 6 km/h. It survived. For about two weeks it sent measurements from the ground, until the cold (about −173 °C) silenced it on 28 February 2001. A final call in December 2002 went unanswered."
      ],
      voice: [
        "I have no legs and no landing gear. I landed anyway, at walking pace.",
        "For two more weeks I measured the ground I was sitting on.",
        "Then the cold came. I am still here, riding this rock around the Sun."
      ],
      learned: [
        "Eros is a solid, cratered rock about as dense as Earth’s crust, with no magnetic field.",
        "The mission sent back about 160,000 images, roughly ten times more data than planned."
      ],
      facts: [["Launched", "17 Feb 1996"], ["Orbited Eros", "from 14 Feb 2000"], ["Touchdown", "12 Feb 2001, at about 6 km/h"], ["Last contact", "28 Feb 2001"]],
      sources: [S.nearNasa, S.erosNasa]
    },
    {
      id: "dawn",
      name: "Dawn",
      mission: "Dawn · Vesta and Ceres",
      agency: "NASA",
      world: "deep", kind: "orbiter", status: "silent", year: 2007,
      place: "In orbit around the dwarf planet Ceres",
      at: "ceres",
      since: "2018-10-31", sinceLabel: "Fell silent",
      hook: "It ran out of fuel in 2018 and still circles a dwarf planet, with nobody at the controls.",
      story: [
        "Dawn flew on ion engines, which push gently but can keep pushing for years. That let it do something no spacecraft had done before: orbit one distant world, leave, and then orbit a second. It studied the giant asteroid Vesta from July 2011 to September 2012, then reached the dwarf planet Ceres on 6 March 2015.",
        "In its final months it swooped to within about 35 km of Ceres every 27 hours. On 31 October 2018 it ran out of hydrazine, the fuel that kept its antenna pointed at Earth, and went silent. It was left in orbit on purpose. Ceres has water and the kind of chemistry that interests scientists who study how life begins, so NASA chose an orbit that should keep Dawn off the surface for at least 20 years."
      ],
      voice: [
        "My engines pushed gently, but they could push for years.",
        "I visited two worlds and stayed at both. Nobody had done that before.",
        "My fuel is gone and I cannot turn toward Earth. I am still circling Ceres."
      ],
      learned: [
        "Dwarf planets like Ceres could have had oceans for much of their history, and might still hold some water today.",
        "Vesta and Ceres grew up very differently, which shows how much location mattered when the solar system was young."
      ],
      facts: [["Launched", "27 Sep 2007"], ["At Vesta", "Jul 2011 – Sep 2012"], ["Reached Ceres", "6 Mar 2015"], ["Distance flown", "about 6.9 billion km"]],
      sources: [S.dawnNasa, S.dawnEnd, S.dawnNssdc, S.ceresFacts]
    },
    {
      id: "kepler",
      name: "Kepler space telescope",
      mission: "Kepler / K2",
      agency: "NASA",
      world: "deep", kind: "telescope", status: "silent", year: 2009,
      place: "Circling the Sun, trailing behind Earth",
      since: "2018-11-15", sinceLabel: "Switched off",
      hook: "It found more than 2,600 planets around other stars. Then it ran out of fuel, and its team said goodnight.",
      story: [
        "Kepler stared at about 150,000 stars in one patch of sky, watching for the tiny dip in brightness when a planet crosses in front of its star. In 2013 the second of its four reaction wheels failed and it could no longer hold steady. Engineers found a fix: they balanced the telescope against the pressure of sunlight, and the mission carried on for years under a new name, K2.",
        "On 30 October 2018 NASA announced that Kepler had run out of fuel. On 15 November its team sent a last set of “goodnight” commands that switched off its transmitters. By coincidence, that was the anniversary of the death of the astronomer Johannes Kepler in 1630. The telescope now drifts in its own orbit around the Sun, far from Earth."
      ],
      voice: [
        "I never looked at Earth. I watched 150,000 other suns, waiting for one to blink.",
        "When my wheels failed, I learned to balance on sunlight.",
        "The last word from home was “goodnight”. I follow Earth around the Sun, a little farther behind each year."
      ],
      learned: [
        "Our galaxy holds more planets than stars.",
        "The most common size of planet Kepler found, between Earth and Neptune, does not exist in our own solar system."
      ],
      facts: [["Launched", "6 Mar 2009"], ["Planets found", "more than 2,600"], ["Stars surveyed", "more than 500,000"], ["“Goodnight” sent", "15 Nov 2018"]],
      sources: [S.keplerNasa, S.keplerEnd, S.keplerGoodnight, S.keplerNssdc]
    }
  ];

  /* ---------- Official challenge resources --------------------------------
     The NASA links listed on the challenge page, and the machines here that
     cite each one. Sources flagged o: 1 show a "Challenge resource" badge. */
  LKP.resources = [
    { group: "The Moon", name: "Apollo Lunar Modules", src: S.nssdcApollo11, ghosts: ["eagle", "lrrr11"] },
    { group: "The Moon", name: "Lunar Roving Vehicles", src: S.nssdcApollo15, ghosts: ["lrv15"] },
    { group: "The Moon", name: "ALSEP scientific packages", src: S.nssdcApollo12, ghosts: ["alsep12", "surveyor3"] },
    { group: "The Moon", name: "Surveyor landers", src: S.surveyor3Nasa, ghosts: ["surveyor3"] },
    { group: "Mars", name: "Sojourner rover", src: S.pathfinderNasa, ghosts: ["sojourner"] },
    { group: "Mars", name: "Spirit & Opportunity", src: S.merNasa, ghosts: ["spirit", "opportunity", "perseverance"] },
    { group: "Mars", name: "Viking 1 & 2 landers", src: S.viking1Nasa, ghosts: ["viking1", "viking2"] },
    { group: "Mars", name: "Phoenix & InSight landers", src: S.insightNasa, ghosts: ["insight", "phoenix"] },
    { group: "Mars", name: "Ingenuity helicopter", src: S.ingenuityNasa, ghosts: ["ingenuity"] },
    { group: "Beyond", name: "Dawn spacecraft", src: S.dawnNasa, ghosts: ["dawn"] },
    { group: "Beyond", name: "NEAR Shoemaker", src: S.nearNasa, ghosts: ["near"] },
    { group: "Beyond", name: "Pioneer 10 & 11", src: S.pioneer10Nasa, ghosts: ["pioneer10", "pioneer11"] },
    { group: "Beyond", name: "Kepler space telescope", src: S.keplerNasa, ghosts: ["kepler"] },
    { group: "Catalog", name: "NSSDCA master catalog", src: S.nssdc, ghosts: ["dawn", "kepler"] }
  ];

  /* ---------- Light Clock destinations ---------------------------------- */
  // km = distance from Earth. "live" destinations are computed in features.js.
  LKP.destinations = [
    { id: "moon", name: "The Moon", km: 384400, note: "Average Earth–Moon distance", ghost: "lrrr11", source: S.moonFacts },
    { id: "mars", name: "Mars, today", km: null, live: "mars", note: "Computed live from JPL orbital elements", ghost: "opportunity", source: S.jplElements },
    { id: "newhorizons", name: "New Horizons", km: null, live: "probe", note: "Computed live from JPL Horizons trajectory data", ghost: "newhorizons", source: S.horizons },
    { id: "voyager1", name: "Voyager 1", km: null, live: "probe", note: "Computed live from JPL Horizons trajectory data", ghost: "voyager1", source: S.horizons }
  ];
  LKP.marsRange = { nearKm: 54.6e6, farKm: 401e6, source: S.marsFacts };

  /* ---------- Simulator: worlds ------------------------------------------
     Diameters are NASA equatorial values. "visitedBy" lists machines in this
     story that flew past; "world" links a body to its chapter of machines. */
  LKP.bodies = [
    { id: "sun", name: "The Sun", type: "Star", diameterKm: 1392700, color: "#ffc65a",
      fact: "Our star holds about 99.8% of all the mass in the solar system. Its light takes about 8 minutes to reach Earth." },
    { id: "mercury", name: "Mercury", type: "Planet", diameterKm: 4879, color: "#b9b2a8",
      fact: "The smallest planet and the closest to the Sun. A year here lasts just 88 Earth days." },
    { id: "venus", name: "Venus", type: "Planet", diameterKm: 12104, color: "#e8c98f",
      fact: "The hottest planet. Under its thick clouds, the surface is hot enough to melt lead." },
    { id: "earth", name: "Earth", type: "Planet", diameterKm: 12756, color: "#5aa9ff",
      fact: "Home. Every machine in this story was built here, and mission control still listens from here." },
    { id: "moon", name: "The Moon", type: "Moon of Earth", diameterKm: 3475, color: "#d3dbe8", world: "moon",
      fact: "Earth’s only natural satellite. Twelve people have walked here, and they left a lot behind." },
    { id: "mars", name: "Mars", type: "Planet", diameterKm: 6792, color: "#f07c4f", world: "mars",
      fact: "The red planet is cold, dusty and dry today, but it once had rivers and lakes." },
    { id: "jupiter", name: "Jupiter", type: "Planet", diameterKm: 142984, color: "#e3b98a", visitedBy: ["pioneer10", "pioneer11", "voyager1", "voyager2"],
      fact: "The biggest planet, more than twice as massive as all the others combined. Pioneer 10 was the first to fly past, in 1973." },
    { id: "saturn", name: "Saturn", type: "Planet", diameterKm: 120536, color: "#ecd9a0", visitedBy: ["pioneer11", "voyager1", "voyager2"],
      fact: "Famous for its rings of ice and rock. Pioneer 11 got the first close look in 1979." },
    { id: "uranus", name: "Uranus", type: "Planet", diameterKm: 51118, color: "#9fe3e6", visitedBy: ["voyager2"],
      fact: "An ice giant that spins tipped over on its side. Only Voyager 2 has ever visited, in 1986." },
    { id: "neptune", name: "Neptune", type: "Planet", diameterKm: 49528, color: "#6f8dff", visitedBy: ["voyager2"],
      fact: "The most distant planet. Only Voyager 2 has ever visited, in 1989." },
    { id: "pluto", name: "Pluto", type: "Dwarf planet", diameterKm: 2376, color: "#d9bfa3", visitedBy: ["newhorizons"],
      fact: "A dwarf planet in the Kuiper Belt. New Horizons flew past in 2015 and found a giant heart-shaped plain." },
    { id: "eros", name: "Eros", type: "Near-Earth asteroid", diameterKm: 34, sizeLabel: "about 34 km long", color: "#c9ab8b", home: ["near"], homeLabel: "Still resting here",
      fact: "The first near-Earth asteroid ever found, in 1898, and the first asteroid a spacecraft orbited and landed on. Its shape here is a sketch, not a measured model." },
    { id: "ceres", name: "Ceres", type: "Dwarf planet", diameterKm: 952, color: "#b9b4ab", home: ["dawn"], homeLabel: "Still in orbit here",
      fact: "The largest object in the asteroid belt and the only dwarf planet in the inner solar system. It could be as much as 25 percent water." }
  ];

  /* ---------- Simulator: small worlds and a telescope on closed orbits -----
     Osculating heliocentric ecliptic elements from NASA JPL Horizons at the
     epoch below (2026-Nov-10 00:00 TDB): a (au), e, i, node, peri (argument
     of perihelion), M (mean anomaly) in degrees, n in degrees per day.
     Moved forward and back as simple two-body orbits. Checked against
     Horizons for 2000-2040: within 1.4 degrees and 0.35% in distance. */
  LKP.smallOrbits = {
    epochJD: 2461354.5,
    ceres: { a: 2.766298040182, e: 0.079822071885, i: 10.586865742683, node: 80.248550794486, peri: 73.130495837214, M: 307.58621958977, n: 0.214217832297 },
    eros: { a: 1.458276549927, e: 0.222847331198, i: 10.828609167406, node: 304.267834808744, peri: 178.925705541788, M: 148.698857885191, n: 0.559685732145 },
    kepler: { a: 1.013115835458, e: 0.036087804182, i: 0.448323297512, node: 154.112347170608, peri: 294.154088133103, M: 197.697214338760, n: 0.966530177755 }
  };

  /* ---------- Simulator: spacecraft leaving the solar system -------------
     Heliocentric ecliptic position (au) and velocity (au/day) from NASA JPL
     Horizons at 2026-Nov-10 00:00 TDB. These craft now travel in nearly
     straight lines, so the simulator moves them at constant velocity.
     "validFrom" is the date after which that straight line is a fair match
     (after each craft's last planetary flyby). */
  LKP.probeEpochJD = 2461354.5;
  LKP.probes = {
    voyager1: { p: [-32.21083735, -137.13904573, 99.22236516], v: [-0.00119525254, -0.00786120308, 0.00567820459], validFrom: "1981", tracked: true },
    voyager2: { p: [39.98737875, -105.680126, -89.96474532], v: [0.00242765675, -0.0053944081, -0.00653564089], validFrom: "1990", tracked: true },
    pioneer10: { p: [24.09941163, 139.94905257, 7.40635193], v: [0.000708654264, 0.00679721895, 0.000348250148], validFrom: "1974", tracked: false },
    pioneer11: { p: [29.18027868, -111.00170489, 28.2853796], v: [0.00233175601, -0.0058304261, 0.00140403375], validFrom: "1980", tracked: false },
    newhorizons: { p: [20.96977635, -62.56433357, 2.30187285], v: [0.00306476617, -0.00721097507, 0.000283778716], validFrom: "2016", tracked: true },
    /* Kepler circles the Sun on a closed orbit (see LKP.smallOrbits) instead of flying a straight line. */
    kepler: { orbit: true, validFrom: "2010", tracked: false }
  };

  /* ---------- Hero telemetry ticker -------------------------------------- */
  LKP.ticker = [
    "OPPORTUNITY · MERIDIANI PLANUM · LAST SIGNAL 10 JUN 2018",
    "APOLLO 11 LASER MIRROR · SEA OF TRANQUILITY · STILL REFLECTING",
    "VOYAGER 1 · INTERSTELLAR SPACE · STILL TRANSMITTING",
    "INGENUITY · VALINOR HILLS · FINAL DATA 16 APR 2024",
    "PIONEER 10 · BEYOND THE PLANETS · LAST SIGNAL 23 JAN 2003",
    "LUNAR ROVER 3 · TAURUS–LITTROW · PARKED 14 DEC 1972",
    "KEPLER TELESCOPE · SOLAR ORBIT · GOODNIGHT 15 NOV 2018",
    "NEAR SHOEMAKER · ASTEROID EROS · LAST CONTACT 28 FEB 2001",
    "DAWN · IN ORBIT AT CERES · SILENT SINCE 31 OCT 2018"
  ];

  /* ---------- Timeline ---------------------------------------------------- */
  LKP.timeline = [
    { date: "1967-04-20", title: "Surveyor 3 lands", text: "A robot scout bounces twice, then tests the ground in the Ocean of Storms.", ghost: "surveyor3" },
    { date: "1969-07-20", title: "Apollo 11 lands", text: "Eagle touches down. The laser mirror is set out the next day.", ghost: "eagle" },
    { date: "1969-11-19", title: "A visit to Surveyor 3", text: "Apollo 12 astronauts walk to the old robot and take its camera.", ghost: "surveyor3" },
    { date: "1970-11-17", title: "Lunokhod 1 starts driving", text: "The first robot rover on another world, driven from Earth.", ghost: "lunokhod1" },
    { date: "1971-07-31", title: "First drive on the Moon", text: "Apollo 15’s rover takes its first spin at Hadley.", ghost: "lrv15" },
    { date: "1972-03-02", title: "Pioneer 10 launches", text: "Next stop: the asteroid belt and Jupiter.", ghost: "pioneer10" },
    { date: "1972-12-14", title: "The last liftoff", text: "Apollo 17 leaves. Its parked rover films the departure.", ghost: "lrv17" },
    { date: "1973-01", title: "Lunokhod 2 arrives", text: "It will drive about 39 km, a record for 41 years.", ghost: "lunokhod2" },
    { date: "1976-07-20", title: "Viking 1 lands on Mars", text: "Seven years to the day after Apollo 11.", ghost: "viking1" },
    { date: "1977-08-20", title: "Voyager 2 launches", text: "Voyager 1 follows on 5 September.", ghost: "voyager2" },
    { date: "1977-09-30", title: "Apollo stations switched off", text: "The Moon’s seismometers stop listening.", ghost: "alsep12" },
    { date: "1979-09", title: "First visit to Saturn", text: "Pioneer 11 flies past the ringed planet.", ghost: "pioneer11" },
    { date: "1989-08", title: "Voyager 2 reaches Neptune", text: "The last of the four giant planets.", ghost: "voyager2" },
    { date: "1990-02-14", title: "The Pale Blue Dot", text: "Voyager 1 looks back and photographs Earth.", ghost: "voyager1" },
    { date: "1995-09-30", title: "Pioneer 11 goes quiet", text: "NASA’s last contact.", ghost: "pioneer11" },
    { date: "1997-07-04", title: "First rover on Mars", text: "Sojourner rolls off Mars Pathfinder.", ghost: "sojourner" },
    { date: "1999-07-31", title: "Lunar Prospector’s last dive", text: "A planned crash near the Moon’s south pole.", ghost: "prospector" },
    { date: "1999-09-23", title: "Mars Climate Orbiter lost", text: "Pounds versus newtons.", ghost: "climateorbiter" },
    { date: "1999-12-03", title: "Mars Polar Lander lost", text: "Silence after landing.", ghost: "polarlander" },
    { date: "2001-02-12", title: "First landing on an asteroid", text: "NEAR Shoemaker settles onto Eros at walking pace.", ghost: "near" },
    { date: "2003-01-23", title: "Pioneer 10’s last signal", text: "Its power source finally fades.", ghost: "pioneer10" },
    { date: "2004-01-25", title: "Opportunity lands", text: "Three weeks after its twin, Spirit.", ghost: "opportunity" },
    { date: "2008-05-25", title: "Phoenix lands in the arctic", text: "It will find ice just below the dirt.", ghost: "phoenix" },
    { date: "2009-03-06", title: "Kepler launches", text: "It will watch 150,000 stars for the shadow of a planet.", ghost: "kepler" },
    { date: "2009-10-09", title: "LCROSS finds water", text: "A rocket stage hits Cabeus crater.", ghost: "lcross" },
    { date: "2010-03-22", title: "Spirit’s last signal", text: "Stuck in sand, it falls asleep for good.", ghost: "spirit" },
    { date: "2010-04", title: "Lunokhod 1 found", text: "NASA’s LRO spots it. Lasers get an echo.", ghost: "lunokhod1" },
    { date: "2012-08-25", title: "Voyager 1 goes interstellar", text: "The first spacecraft to leave the Sun’s bubble.", ghost: "voyager1" },
    { date: "2014-07-27", title: "A new driving record", text: "Opportunity passes Lunokhod 2’s 39 km.", ghost: "opportunity" },
    { date: "2015-03-06", title: "Dawn reaches Ceres", text: "The first spacecraft to orbit two worlds beyond Earth.", ghost: "dawn" },
    { date: "2015-07-14", title: "Hello, Pluto", text: "New Horizons flies past.", ghost: "newhorizons" },
    { date: "2018-06-10", title: "Opportunity’s last signal", text: "A planet-wide dust storm blocks the Sun.", ghost: "opportunity" },
    { date: "2018-10-31", title: "Dawn runs out of fuel", text: "It falls silent, still in orbit around Ceres.", ghost: "dawn" },
    { date: "2018-11-05", title: "Voyager 2 goes interstellar", text: "Six years after its twin.", ghost: "voyager2" },
    { date: "2018-11-15", title: "Goodnight, Kepler", text: "The final command switches off its transmitters.", ghost: "kepler" },
    { date: "2021-04-19", title: "First flight on another planet", text: "Ingenuity hovers over Jezero crater.", ghost: "ingenuity" },
    { date: "2022-12-21", title: "InSight’s mission ends", text: "More than 1,300 marsquakes recorded.", ghost: "insight" },
    { date: "2024-01-18", title: "Ingenuity’s 72nd flight", text: "Its last. The rotor blades are damaged.", ghost: "ingenuity" },
    { date: "2026-06-23", title: "New Horizons wakes up", text: "After its longest hibernation yet.", ghost: "newhorizons" },
    { date: "2026-10-11", title: "The record falls again", text: "Perseverance passes Opportunity’s 45.16 km.", ghost: "perseverance" },
    { date: "2026-11", title: "One light-day", text: "Voyager 1 is expected to reach 24 light-hours from Earth.", ghost: "voyager1" }
  ];

  /* ---------- Quiz -------------------------------------------------------- */
  LKP.quiz = [
    {
      q: "Which robot did astronauts walk up to on the Moon, and take parts from?",
      options: ["Lunokhod 1", "Surveyor 3", "Viking 1", "Sojourner"],
      answer: 1,
      explain: "In November 1969, Apollo 12’s Pete Conrad and Alan Bean walked to Surveyor 3 and brought its TV camera home.",
      ghost: "surveyor3"
    },
    {
      q: "Opportunity was planned to work for about 90 Martian days. How long did it actually keep going?",
      options: ["About 6 months", "About 3 years", "More than 14 years", "Exactly 90 days"],
      answer: 2,
      explain: "It landed in January 2004 and sent its last data in June 2018, after driving about 45 km.",
      ghost: "opportunity"
    },
    {
      q: "Why was Mars Climate Orbiter lost in 1999?",
      options: ["A dust storm", "A mix-up between English and metric units", "It ran out of fuel", "A meteorite hit it"],
      answer: 1,
      explain: "One program used pound-force seconds and another expected newton-seconds, so the spacecraft flew too close to Mars.",
      ghost: "climateorbiter"
    },
    {
      q: "Lasers bounced off the Apollo 11 mirror show that the Moon is…",
      options: ["Shrinking", "Moving away from Earth by about 3.8 cm a year", "Getting closer every year", "Spinning faster"],
      answer: 1,
      explain: "Timing the echoes to within millimetres shows the Moon drifting away by about 3.8 cm (1.5 in) a year.",
      ghost: "lrrr11"
    },
    {
      q: "Ingenuity was planned to make up to 5 flights. How many did it make?",
      options: ["5", "19", "72", "300"],
      answer: 2,
      explain: "It flew 72 times between April 2021 and January 2024.",
      ghost: "ingenuity"
    },
    {
      q: "In November 2026, how long does a radio message take to reach Voyager 1?",
      options: ["1.3 seconds", "About 20 minutes", "About 9 hours", "About 1 day"],
      answer: 3,
      explain: "Voyager 1 is about one light-day away, the first spacecraft ever to get that far.",
      ghost: "voyager1"
    },
    {
      q: "Which is the only spacecraft to have visited Uranus and Neptune?",
      options: ["Voyager 1", "Voyager 2", "Pioneer 11", "New Horizons"],
      answer: 1,
      explain: "Voyager 2 flew past Uranus in 1986 and Neptune in 1989.",
      ghost: "voyager2"
    },
    {
      q: "InSight’s seismometer detected more than 1,300 of what?",
      options: ["Dust devils", "Marsquakes", "Meteor showers", "Lightning strikes"],
      answer: 1,
      explain: "Its marsquake recordings revealed the thickness of Mars’s crust and the size of its core.",
      ghost: "insight"
    },
    {
      q: "NEAR Shoemaker was built only to orbit the asteroid Eros. What did it do at the end of its mission?",
      options: ["Flew on to Jupiter", "Landed on the asteroid and kept working", "Returned to Earth", "Crashed into the Moon"],
      answer: 1,
      explain: "On 12 February 2001 it touched down at about 6 km/h, the first landing on an asteroid, and sent data for about two more weeks.",
      ghost: "near"
    },
    {
      q: "The Kepler space telescope ran out of fuel in 2018. What were its final commands from Earth called?",
      options: ["Goodnight", "Farewell", "Sleep mode", "Lights out"],
      answer: 0,
      explain: "The “goodnight” commands were sent on 15 November 2018, the anniversary of the death of the astronomer Johannes Kepler in 1630.",
      ghost: "kepler"
    }
  ];
})();
