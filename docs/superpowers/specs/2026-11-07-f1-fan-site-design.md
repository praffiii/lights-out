# Lights Out: an F1 site for newcomers (design)

Date: 2026-11-07
Owner: Praffi
Status: draft, awaiting approval

Calls the builder (Claude) made without Praffi's explicit sign-off are marked **[my call]**. Praffi can overturn any of them.

## 1. Intent and why

This is a fan-made web app that introduces Formula 1 to people who know nothing about it. It is not official and does not imitate the official F1 look. It is a personal project, built for fun, in Praffi's own style.

Praffi fell in love with F1 watching Abu Dhabi 2021. Three things hooked them. First, two rivals were level on points with everything riding on one last lap. Second, the cars were fast and loud. Third, the race was chaotic and controversial, and nobody knew what would happen next. The site exists to give a newcomer that same feeling, then to teach them enough to keep watching.

The intro must not retell Abu Dhabi 2021 or any other specific race. It should evoke the feeling, not the event.

Success means a newcomer leaves hooked and able to follow a race: they understand what is happening on track and why it matters.

## 2. Audience

People who are new to F1. Assume zero knowledge: no jargon goes unexplained.

## 3. Goals

- A cinematic intro that makes people *feel* why F1 is beautiful. It carries three things: tension (it all comes down to one moment), sensation (speed and noise), and unpredictability (anything can happen).
- Teach through visuals, animation, and interaction, not walls of text. Text is short captions that support the visuals.
- Follow the current season, up to date after each session.
- Cost nothing to run.

## 4. Non-goals

- **Live timing during sessions.** The only real source, OpenF1's live tier, costs €9.90/month and is licensed for personal use. Dropped for good, not deferred.
- User accounts, saved progress, quizzes, comments, and anything else that needs a database.
- Being official or looking official.
- A separate history section. History is woven into each section instead.

## 5. Anti-goals (failure even if it technically works)

- **It looks like a reskin of landonorris.com.** That site sets the quality bar for how alive the motion feels. Ours must look like its own thing.
- It reads like Wikipedia: text-heavy, dry, static.
- It teaches something wrong. Newcomers will believe what we tell them.
- It uses copyrighted material and gets taken down.
- It quietly starts costing money.

## 6. Hard constraints

### 6.1 Zero cost

Zero cost covers everything: hosting, data, fonts, libraries, and the domain.
- **Domain:** use the free `*.workers.dev` subdomain. A custom domain costs money, so it waits until Praffi decides to pay for one. **[my call]**
- **Fonts:** use only fonts with free licenses, such as Google Fonts or open-source fonts.

### 6.2 No copyrighted media

- **Never self-host:** race footage, official F1 or FOM photography, the F1 logo, team logos or liveries, broadcast graphics, or the official F1 typeface.
- **Allowed imagery sources:**
  1. Original motion, SVG, 3D, and sound that we create.
  2. Wikimedia Commons photos with free licenses. Credit each photographer as its license requires.
  3. Embedded YouTube videos from F1's official channel. They are embedded, never downloaded.
  4. 3D models with free licenses (CC0 or CC-BY), credited as their licenses require. The rules for using them:
     - They must be generic designs. Never use a replica of a team's car: the uploader cannot license a team's design or branding.
     - The builder decides per asset whether to make it from scratch or adapt a free-licensed model. **[Praffi delegated this]**
     - The leading candidate for the car is MaG80's generic 2026-regulations car (CC-BY): <https://sketchfab.com/models/4b77c9b72dc44803a530eaaff18ed590>.
     - Before adopting any model, check that it can be split into parts for the take-apart effect, that it can be slimmed to roughly 200k polygons or fewer, and that its license is real. Reject reuploads of other people's work.
  5. Credits: every Wikimedia photo and 3D model is listed on a credits page and noted near where it appears. **[my call]**
- **Facts are free to use:** names, results, statistics, history, and technical explanations.
- **Disclaimer:** the footer carries a plain line saying this is an unofficial fan project, not affiliated with Formula 1 or FOM. **[my call]**

### 6.3 Content accuracy

Claude drafts every caption and explanation. Praffi fact-checks them and corrects anything that does not sound the way fans really talk. Nothing ships until Praffi has reviewed it.

### 6.4 Platform

The site is desktop-first, because the cinematic experience is designed for a large screen. It must still work well on phones. **[my call]** Praffi has not stated a preference.

### 6.5 Language

English. **[my call]**

### 6.6 Accessibility

- **Reduced motion:** visitors with `prefers-reduced-motion` get still frames or simplified transitions.
- **Sound:** off until the user interacts. Browsers block autoplaying audio anyway.
- **Skipping:** the intro can be skipped.
- **Keyboard:** interactive figures work with the keyboard.

## 7. The site: eight sections

1. **Cinematic intro.** A short opening act built from original motion, typography, and sound, not footage. It plays on the first visit. It can be skipped, and a visitor can replay it. **[my call]**
2. **The car.** The visitor takes the car apart piece by piece. The interaction pattern comes from <https://skills.wheresryan.sh/anatomy>:
   - The car is a real object, not a diagram.
   - Exactly one part is lit with an accent color at any moment.
   - Hovering or dragging explodes the car into its assemblies.
   - Live readouts come from the same data that drives the motion.
   - An idle animation runs until the visitor touches it.
   - It is a generic car built to the current regulations, not any one team's car, and it carries no team livery. **[my call]**
3. **The engine.** The visitor "revs" the power unit and watches it work. They see the turbo, the hybrid deployment (MGU-K), and the energy store, with real numbers.
4. **The tracks.** Circuits with their corners, active-aero straight-mode zones, braking points, and character.
5. **The people.** Drivers, teams, and legends.
6. **This season.** The calendar, a countdown to the next session in the visitor's local timezone, the latest results (race, qualifying, sprint), and driver and constructor standings. The section updates after each session.
7. **How F1 works.**
   - **Racecraft:** overtaking, the divebomb, defending, slipstreaming, the switchback.
   - **Strategy:** tyres, pit stops, undercut and overcut.
   - **Rules:** active aero and overtake mode, flags, safety car and virtual safety car, penalties, track limits. DRS (2011–2025) appears as history, not as a current rule.
   - **Format:** the race weekend (practice, qualifying, sprint), the points system, the drivers' vs constructors' championships, the budget cap.

   Moves and strategies are shown as animated top-down replays that visitors can scrub through, with short captions.
8. **Glossary.** Hovering or tapping an F1 term anywhere on the site, such as "box box", "dirty air", or "parc fermé", explains it inline.

History is woven in: a car's evolution, a legend's story, a classic corner's past.

**Which rulebook:** the site teaches the regulations of the season it follows. Today that is the 2026 rules: active aerodynamics with straight and corner modes, overtake mode, and the 2026 power-unit split with no MGU-H. Older rules, such as DRS, are taught as history. Every caption must be checked against the current regulations before it ships.

## 8. Build order: one Figma design at a time

**Changed by Praffi on 2026-11-08.** The release split below (Release 1, then 2 to 5) is replaced. Each approved Figma design is built and shipped on its own, with its own plan:

1. **Home**, together with the shell every page shares (loader, header and weekend box, menu, footer). Plan: `docs/superpowers/plans/2026-11-08-home.md`, on top of `2026-11-07-foundation-season-data.md`.
2. **The intro** (storyboard in DESIGN.md). It plays before Home on the first visit. **[my call]** on its place in the order.
3. **This season.**
4. **How F1 works:** the index, then one chapter at a time.
5. **The car**, **the engine**, **the tracks** (index and circuit page), **the people** (index and driver page).
6. **Glossary, credits, 404.**

Praffi can reorder anything after Home. Links to a design that isn't built yet show "Soon".

The history of what was in each release is kept below for its content (which topics, which glossary scope).

### Former Release 1: intro, How F1 works, and This season

**How F1 works, starter set [my call]:**
- **Racecraft:** overtaking into a braking zone, the divebomb, slipstream and overtake mode, defending, the switchback.
- **Strategy:** tyre compounds, the pit stop, the undercut and the overcut.
- **Rules:** flags, the safety car and virtual safety car, penalties and track limits.
- **Format:** the weekend structure, points, and the two championships.

The rest of section 7 follows later.

**Glossary:** the inline-term mechanism ships in R1. It covers only the terms used in R1 sections, and it grows as each later section lands. **[my call]**

**Timing:** the 2026 season ends in early December. The 2027 season starts in March. Launching before March makes the season-opener countdown a natural hook. This is a target, not a deadline.

### Former later releases, in this order

1. The car
2. The engine
3. The tracks
4. The people

The car and engine go after R1 because they need 3D models, which makes them the hardest sections.

## 9. Look and feel (direction only; the design system comes later)

- **Mood:** F1 at night. Dark and floodlit, with the pit wall and timing screens as the ambience. **[my call]** Praffi was unsure when asked and asked to come back to the look later.
- **Motion everywhere:** the site should feel alive. The quality bar is landonorris.com. See the anti-goal in section 5 for what that does not mean.
- **Visuals do the teaching:** minimal text.
- **Interaction pattern for car, engine, and tracks:** the anatomy reference in section 7.2.

The concrete visual design has not been explored or agreed yet. It is the first design task before building R1 UI: palette, type, motion language, and the intro storyboard.

## 10. How it gets made

### 10.1 Decided by Praffi

- **Languages and runtime:** TypeScript and Bun.
- **Framework:** TanStack Start, with TanStack Router and TanStack Query.
- **Effect:** for the server side. Praffi wants to learn Effect on this project, so it should be used idiomatically, not minimally.
- **Explicitly dropped:**
  - Next.js
  - Hono
  - Convex
  - Drizzle
  - Turborepo
  - Alchemy

  There is no database and no separate backend framework. Convex is the candidate only if accounts or saved progress are ever added.

### 10.2 Builder's calls, accepted in conversation

| Area | Choice |
|---|---|
| Motion | GSAP. It is fully free, plugins included: ScrollTrigger, SplitText, MorphSVG, DrawSVG, MotionPath, Flip. |
| 3D | React Three Fiber, only where 3D earns its place (car, engine). Models are made from scratch or adapted from free-licensed generic models (see §6.2), decided per asset. |
| 2D | Custom SVG for tracks, racecraft replays, and diagrams. |
| Sound | Web Audio API, with synthesized or CC0-licensed recordings. |
| Video | Mostly real-time animation in the browser. Remotion, which is free for individuals, is on standby if a real video file is ever needed. |
| Content | Typed data and MDX in the repo: drivers, teams, tracks, glossary, and captions. |
| Season data | Jolpica F1 API (`api.jolpi.ca`, Ergast-compatible). Free, no key. |
| Hosting | Cloudflare Workers free tier. |

### 10.3 Architecture

- **Prerendering:** every content route is prerendered to static HTML at build time, using TanStack Start's prerender support.
  - Static assets on Cloudflare are free and unlimited.
  - The free plan allows only 10 ms of CPU per Worker request, and per-request server rendering typically takes 10–20 ms.
  - So per-request server rendering is not used.
- **Season data:** goes through one server route, roughly `/api/season/*`, written with Effect. The route:
  - fetches from Jolpica;
  - decodes the response with Effect Schema. Jolpica returns numbers as strings, and the schema turns them into real types;
  - retries on failure with backoff;
  - returns shaped JSON with CDN cache headers.

  ~~Every visitor is served from Cloudflare's edge cache.~~ **Superseded during planning (2026-11-07):**
  - A Cron Trigger (every 30 minutes) fetches and decodes Jolpica, then writes a snapshot to KV, but only if every part succeeded.
  - `/api/season` reads that snapshot from KV.
  - Why: Workers Caching would bill static-asset requests against the free limit, and the Cache API does not work on `*.workers.dev`.
  - Visitors never trigger Jolpica calls, and the last good snapshot survives outages.

  Jolpica is rate-limited and its terms allow blocking for abuse, which is why visitors never reach it.
- **Client:** the client reads the season data through TanStack Query.
- **Per-page link previews:** each prerendered page carries its own title, description, and Open Graph image.
- **Off-season state:** between seasons, the season section must still look intentional. It shows the countdown to the next season opener, the final standings of the last season, and the new calendar once Jolpica publishes it.

### 10.4 Known technical risks

- **React version:** React Three Fiber v9 requires React ≥19.0 and <19.4. At setup, check which React version TanStack Start pulls in. Then either pin React into that range or move to R3F v10. Home has the circuit in 3D, so the Home plan pins React to `~19.3.1`, as the motion spike does.
- **Jolpica outage or stale data:** the route should serve the last good cached response if Jolpica is down, rather than an error.
- **Free-tier CPU limit:** keep the season route's CPU work small, mostly decoding and shaping data.
- **Edge caching on the free tier:** verify how caching behaves before building the season route.
  - The reviewer read in Cloudflare's current docs that caching a Worker's responses may require turning on Workers caching.
  - That would make every request to that Worker count against the 100,000/day free limit, static assets included.
  - The Cache API may also be limited on `*.workers.dev`.
  - Likely answer: the season API gets its own Worker, so the static site stays free and unlimited, with KV storing the last good response if needed. Settle this in the plan.

## 11. Left to the builder

- The visual design system and the intro storyboard. Show these to Praffi before building R1 UI.
- Exact routes, file structure, cache durations, and the data shapes the season route returns.
- Sound design specifics.
- Test strategy. Tests should be focused, especially the Effect decoding and caching, with no slop tests.
- The working name "Lights Out" and the folder name. Both are **[my call]** and easy to rename.
