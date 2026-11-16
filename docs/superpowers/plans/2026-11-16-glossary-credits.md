# Glossary, Credits and the easy "Soon" links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six of the ten "Soon" placeholders become real: four links, a Glossary page at `/glossary` and a Credits page at `/credits`.

**Architecture:** Both pages are static, prerendered routes like the chapters. The glossary reads the existing word list (`src/chapter/words.ts`) through a small pure index; the credits page reads every photo list the site already has through one pure collector. Neither page keeps a copy of the content it shows.

**Tech Stack:** TanStack Start routes, React, plain CSS, GSAP via `#/motion/motion.ts`, `bun test`, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-16-glossary-credits-design.md`. Mocks: Figma file `IPkJZWQnY0IKdIjf6Nuugl`, Glossary 121:2 / 123:2, Credits 126:2 / 127:2.

## Global Constraints

- Zero cost, no new dependency.
- No comments in any file, no `as` casts, no `any`; `bun run lint` must pass.
- Both pages prerender (add `/glossary` and `/credits` to the `pages` list in `vite.config.ts`).
- Light and dark themes; the dark bands stay dark in both.
- Reduced motion: everything visible, nothing moves.
- No sideways page scroll at 390 px.
- Commits are local, conventional, written as the new behaviour, with no Claude trailer. No push without Praffi's word.
- One deviation from the spec, to keep the change small: a photo's photographer and licence are read out of its existing credit line by `creditParts`, not stored as separate fields. Each photo gains only its Commons page (`source`).

## Review Focus

1. **Search with accents or stray spaces.** Typing `parc ferme` or `  Undercut ` finds "Parc fermé" / "Undercut". (Task 2 test.)
2. **Search with regex characters.** Typing `(` or `.*` filters as plain text and never throws. (Task 2 test.)
3. **A link to a word that does not exist** (`/glossary#nope`) shows the full list with no highlighted row and no error. (Task 3 e2e.)
4. **A photo with no confirmed Commons page** shows its row without a "Commons →" link, and is still counted. (Task 4 test.)
5. **A credit line `creditParts` cannot read.** The unit test walks every photo on the site and fails on the first one that does not yield a photographer and a licence, so a new photo with an odd credit breaks the build, not the page. (Task 4 test.)

---

### Task 1: Four links stop saying "Soon"

**Files:**
- Modify: `src/shell/menu.ts`, `src/shell/Menu.tsx`, `src/shell/Footer.tsx`, `src/home/content.ts`, `src/home/Home.tsx`
- Test: `test/shell/footer.test.tsx`, the existing menu test under `test/shell/`, `e2e/home.spec.ts`

**Interfaces:**
- Produces: `MenuEntry = { label: string; to: To | null; href?: string; photo: Photo; chapters?: …; weekend?: true }`. `href` is for a link `Go` cannot type: a hash on another page or an outside site. An entry with `href` renders a plain `<a href>`.
- Produces: `FOOTER_LINKS: ReadonlyArray<{ label: string; to?: To; href?: string }>`.
- Produces: `READ_NEXT[n].to?: ChapterPath`.

- [ ] **Step 1: Change the expectations first.** In `test/shell/footer.test.tsx` the chapter list becomes `'02How F1 works'` and `'04The car'` (no `Soon`); 05–08 keep `Soon` for now. Add: "How F1 works" has `href="/#start"`, "The car" has `href="/chapters/inside-the-car"`, "Source" has `href="https://github.com/praffiii/lights-out"` with `rel="noreferrer"`. Add the same two assertions for the menu. In `e2e/home.spec.ts` add: the Read next item "Why one pit stop can win a race." is a link to `/chapters/tyres-and-strategy`; "Swedish Grand Prix, 1973." still shows `Soon`.
- [ ] **Step 2: Run** `bun test test/shell` — the new assertions fail on `Soon`.
- [ ] **Step 3: Implement.** `MENU`: "How F1 works" gets `href: '/#start'`, "The car" gets `to: '/chapters/inside-the-car'`. `FOOTER_LINKS` becomes `[{ label: 'Credits' }, { label: 'Source', href: 'https://github.com/praffiii/lights-out' }]` (Credits gets its `to` in Task 5). `READ_NEXT[0]` gets `to: '/chapters/tyres-and-strategy'`; `Home.tsx` wraps that item in `Go` and drops its `is-soon` class and tag. `Menu.tsx` and `Footer.tsx` render `href` entries as `<a href>`; an outside link adds `rel="noreferrer"`.
- [ ] **Step 4: Run** `bun test test/shell && bun run lint` — pass.
- [ ] **Step 5: Commit** `feat(shell): The car, How F1 works, Source and the pit-stop read lead somewhere`.

### Task 2: The glossary index

**Files:**
- Create: `src/glossary/index.ts`
- Test: `test/glossary/index.test.ts`

**Interfaces:**
- Produces:
  - `type Entry = { key: WordKey; term: string; def: string; letter: string; chapter: ChapterEntry }`
  - `ENTRIES: ReadonlyArray<Entry>` — every key of `WORDS`, sorted by `term` (case- and accent-insensitive). `chapter` is the first chapter, in order 01→05, whose word list holds the key (`RACE_WEEKEND_WORDS`, `OVERTAKING_WORDS`, `TYRES_WORDS`, `FLAGS_WORDS`, `CAR_WORDS` matched to `CHAPTERS` by `n`). `letter` is the term's first letter, upper case, accents removed.
  - `find(query: string): ReadonlyArray<Entry>` — entries whose term or meaning contains the query; both sides lower-cased, accent-stripped, query trimmed; an empty query returns `ENTRIES`.
  - `LETTERS: ReadonlyArray<string>` — `'A'…'Z'`.

- [ ] **Step 1: Write the failing tests.**

```ts
it('lists every word once, in alphabetical order', () => {
  expect(ENTRIES.length).toBe(Object.keys(WORDS).length)
  expect(ENTRIES.map((e) => e.term)).toEqual([...ENTRIES.map((e) => e.term)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })))
})

it('sends a word to the first chapter that teaches it', () => {
  expect(ENTRIES.find((e) => e.key === 'undercut')?.chapter.n).toBe('03')
  expect(ENTRIES.find((e) => e.key === 'activeAero')?.chapter.n).toBe('02')
})

it('finds words by term or meaning, ignoring case, accents and stray spaces', () => {
  expect(find('  Undercut ').map((e) => e.key)).toContain('undercut')
  expect(find('parc ferme').map((e) => e.key)).toEqual(['parcFerme'])
  expect(find('closed park').map((e) => e.key)).toEqual(['parcFerme'])
  expect(find('')).toBe(ENTRIES)
})

it('treats the query as plain text', () => {
  expect(find('.*')).toEqual([])
  expect(() => find('(')).not.toThrow()
})
```

- [ ] **Step 2: Run** `bun test test/glossary` — fails, module missing.
- [ ] **Step 3: Implement** `src/glossary/index.ts`. A word in no chapter list must be a type or test failure, not a silent drop: build the key→chapter map from the five lists and have the first test catch a missing one.
- [ ] **Step 4: Run** `bun test test/glossary` — pass.
- [ ] **Step 5: Commit** `feat(glossary): every chapter word in one alphabetical index`.

### Task 3: The Glossary page

**Files:**
- Create: `src/routes/glossary.tsx`, `src/glossary/Glossary.tsx`, `src/styles/glossary.css`
- Modify: `src/chapter/Words.tsx`, `src/shell/menu.ts`, `vite.config.ts`, `test/shell/footer.test.tsx`
- Test: `e2e/glossary.spec.ts`

**Interfaces:**
- Consumes: `ENTRIES`, `find`, `LETTERS` (Task 2); `Term` (`src/chapter/Term.tsx`); `NextRace` (`src/chapter/NextRace.tsx`, with `PHOTOS.ch02`); `Go`.
- Produces: route `/glossary`; each row is `<li id={entry.key}>`.

Page, top to bottom (copy fixed here):
1. Head: label `Glossary · {ENTRIES.length} words · from 5 chapters`, `h1` "Every word, in plain English.", side note "Every F1 word on this site, in one or two lines. Tap one anywhere and the meaning opens right where you are reading." Search: label "Search", placeholder `Try “undercut” or “box, box”`, `type="search"`. A–Z row: a letter with a visible word is `<a href="#{key of its first word}">`; one without is a dimmed `<span aria-hidden>`.
2. Dark band: label "Anywhere on the site", `h2` "Tap a word. Get the meaning.", note "Words with a dotted line open a short note in place. No new page, and you never lose your spot.", then the sentence "Car 99 pits a lap early. By the time the leader stops, the `<Term k="undercut">undercut</Term>` has worked."
3. List: head row Letter / Word / Meaning / Chapter; one row per entry; the big letter only on the first row of each letter; chapter cell `Go` to `entry.chapter.to` reading `Chapter {n} →`. Empty result: one line `No word matches “{query}”.` in an `aria-live="polite"` region.
4. `<NextRace photo={PHOTOS.ch02} />`.

Styling: the row the address points at is purple via `li:target` (the mock's "You came from" row). Phone ≤ 760 px: no letter column, meaning under the word, chapter link under the meaning, the A–Z row scrolls inside its own box. Route `head`: title `Glossary · Lights Out`, description "Every Formula 1 word used on Lights Out, explained in one or two plain lines.", stylesheets `chapter.css` (for `Term`, `NextRace`) and `glossary.css`.

Links: `MENU` "Glossary" gets `to: '/glossary'`. In `Words.tsx`, `<Soon>Full glossary</Soon>` becomes `<a href={open ? `/glossary#${open}` : '/glossary'}>Full glossary →</a>`.

- [ ] **Step 1: Write `e2e/glossary.spec.ts`** (pattern: `e2e/flags.spec.ts`, `stubSeason`):
  - loads with no errors in light and dark; `h1` text; title;
  - shows 46 rows; typing `undercut` leaves the "Undercut" row and hides "Pole position"; typing `zzz` shows `No word matches “zzz”.`; clearing brings back 46;
  - `/glossary#undercut` scrolls the Undercut row into view and it has the accent background; `/glossary#nope` loads with no error and no highlighted row;
  - the Undercut row's chapter link goes to `/chapters/tyres-and-strategy`;
  - on `/chapters/tyres-and-strategy`, opening the "Undercut" chip then "Full glossary" lands on `/glossary#undercut`;
  - at 390 px `document.documentElement.scrollWidth <= innerWidth`;
  - with `reducedMotion: 'reduce'` the head and first rows are visible at once.
- [ ] **Step 2: Run** `bunx playwright test e2e/glossary.spec.ts` — fails with 404.
- [ ] **Step 3: Build the page, the route and the links.** Update `test/shell/footer.test.tsx`: `'08Glossary'`.
- [ ] **Step 4: Run** the spec, `bun test`, `bun run lint`, `bun run build` — pass; `/glossary` appears in the prerender log.
- [ ] **Step 5: Look at it.** Screenshot desktop and 390 px in both themes beside mocks 121:2 / 123:2; fix what does not meet them.
- [ ] **Step 6: Commit** `feat(glossary): every word on the site has a page, with search and a link per word`.

### Task 4: Every photo knows its Commons page

**Files:**
- Modify: `src/home/content.ts` (`Photo` gains `source?: string`; each `PHOTOS` entry gains it), `src/drivers/portraits.ts` (tuples gain a fourth element), `src/circuits/calendar.ts` (`CircuitPhoto` and `photo()` gain `source?`)
- Create: `src/credits/photos.ts`
- Test: `test/credits/photos.test.ts`

**Interfaces:**
- Produces:
  - `creditParts(credit: string): { by: string; licence: string } | null` — reads the last `Photo <by> · <licence>` (or, without `Photo`, the last `<by> · <licence>`) from a credit line. `'Kimi Antonelli · Photo Martin Lee · CC BY-SA 4.0'` → `{ by: 'Martin Lee', licence: 'CC BY-SA 4.0' }`; `'Liauzh · CC BY 4.0'` → `{ by: 'Liauzh', licence: 'CC BY 4.0' }`.
  - `type Credit = { src: string; place: string; by: string; licence: string; source: string | null; usedOn: string }`
  - `CREDITS: ReadonlyArray<Credit>` — `PHOTOS` (25), then the 20 calendar circuit photos (`src` = the `-720` file), the 20 portraits, the 22 hero cars (`source` = `car.commons`, place `"{team} {car} · Shanghai, 2026"`). Two entries with the same `source` collapse into one, joining their `usedOn`.
  - `usedOn`: circuits "This season, Race weekend"; portraits "This season, Race weekend"; cars "Home"; `PHOTOS` from a table `USED_ON satisfies Record<keyof typeof PHOTOS, string>` in `src/credits/photos.ts` (fill it by grepping each key's uses).
  - `COUNTS: { photos: number; photographers: number }` from `CREDITS`.

- [ ] **Step 1: Write the failing tests.**

```ts
it('reads the photographer and licence out of every credit line on the site', () => {
  for (const credit of CREDITS) {
    expect(credit.by).not.toBe('')
    expect(credit.licence).toMatch(/^(CC0|CC BY(-SA)? \d\.\d|Public domain)$/)
  }
})

it('reads a credit line with a caption before the photographer', () => {
  expect(creditParts('Mario Andretti leads Ronnie Peterson · Photo Koen Suyk / Anefo, Nationaal Archief · CC0')).toEqual({ by: 'Koen Suyk / Anefo, Nationaal Archief', licence: 'CC0' })
  expect(creditParts('Liauzh · CC BY 4.0')).toEqual({ by: 'Liauzh', licence: 'CC BY 4.0' })
  expect(creditParts('no licence here')).toBeNull()
})

it('points every confirmed photo at a Wikimedia Commons file page', () => {
  for (const { source } of CREDITS) if (source !== null) expect(source).toStartWith('https://commons.wikimedia.org/wiki/File:')
})

it('keeps a photo with no confirmed page in the list', () => {
  expect(CREDITS.length).toBe(COUNTS.photos)
  expect(COUNTS.photographers).toBe(new Set(CREDITS.map((c) => c.by)).size)
})
```

  If the licence pattern meets a real licence it does not list (for example `CC BY 2.0`, `CC BY-SA 3.0`), widen the pattern to the licences actually present; do not edit the credit.
- [ ] **Step 2: Run** `bun test test/credits` — fails, module missing.
- [ ] **Step 3: Implement** `creditParts`, `CREDITS`, `COUNTS`, `USED_ON`. A credit `creditParts` returns `null` for must throw at module load with the offending line, so the test names it.
- [ ] **Step 4: Look up the Commons page for each of the 65 photos without one** (25 `PHOTOS`, 20 circuits, 20 portraits). Use the Commons search API (`https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=…`) with the photographer, place and year from the credit, then `prop=imageinfo&iiprop=extmetadata|url` to read the page's own Artist and LicenseShortName. Accept a page only when its author and licence match the site's credit line and its thumbnail is the same picture as the file in `public/img` (open both). Write accepted pages into the photo lists as `source`. Keep a lookup table (photo, page, Commons author, Commons licence, confirmed or not, any mismatch with the site's credit) in the SDD ledger for the PR body. Leave unconfirmed photos without `source`. Do not change a credit line; list a mismatch for Praffi instead.
- [ ] **Step 5: Run** `bun test && bun run lint` — pass.
- [ ] **Step 6: Commit** `feat(credits): every photo carries its Wikimedia Commons page`.

### Task 5: The Credits page

**Files:**
- Create: `src/routes/credits.tsx`, `src/credits/Credits.tsx`, `src/styles/credits.css`
- Modify: `src/shell/menu.ts` (`FOOTER_LINKS` Credits gets `to: '/credits'`), `src/shell/Footer.tsx` (data line), `vite.config.ts`, `test/shell/footer.test.tsx`
- Test: `e2e/credits.spec.ts`

**Interfaces:**
- Consumes: `CREDITS`, `COUNTS` (Task 4).

Page, top to bottom (copy fixed here):
1. Head: label "Credits", `h1` "Built on other people's work." Three figures: "Photos" `COUNTS.photos`, "Photographers" `COUNTS.photographers`, "Official F1 images" `0` in the accent colour. Note: "Every photo comes from Wikimedia Commons, under the licence its photographer chose. Each one is credited here and again on the page where it appears."
2. Photo table: columns Photo / Place and year / Photographer / Licence / Used on / Source. Thumbnail `loading="lazy"`, fixed 3:2 box, `alt=""`. The source cell is `<a href={source} rel="noreferrer">Commons →</a>`, or empty when `source` is `null`. The first eight rows show; the rest sit in a `<details>` whose summary reads `Show all {COUNTS.photos} photos ↓`.
3. Dark band: label "Type and data", `h2` "Two typefaces. Seven sources.", note "All free and open. The site runs at no cost, and none of these ask for a key." Typeface rows: "Archivo" — "Display and text · Omnibus-Type · SIL Open Font License"; "Martian Mono" — "Numbers and labels · Evil Martians · SIL Open Font License". Sources, numbered 01–07, name then one line:
   - Jolpica F1 API — Calendar, results and standings
   - OpenF1 — Lap times, telemetry and race control · unofficial
   - bacinger/f1-circuits — Circuit layouts · MIT licence
   - NASA SRTM — Circuit elevation · public domain
   - OpenStreetMap — The map under every circuit · © contributors, ODbL
   - MaG80 — The 3D car · CC BY 4.0
   - MultiViewer — Pit-loss estimates
   Before writing the typeface rows, confirm both families and their licences against what the site loads (`src/routes/__root.tsx`); if a third family is loaded, the headline counts it.
4. Small print: label "The small print", `h2` "Not affiliated with Formula 1.", text "Lights Out is an unofficial fan project, made for fun and run at no cost. F1, FORMULA ONE, FORMULA 1 and related marks are trademarks of Formula One Licensing B.V., used here only to name the sport.", link `Spot a wrong credit? Open an issue →` to `https://github.com/praffiii/lights-out/issues/new`.

Route `head`: title `Credits · Lights Out`, description "Every photographer, typeface and data source behind Lights Out, with a link to each original." The footer's data line becomes "Data Jolpica F1 · OpenF1 · NASA SRTM · OpenStreetMap · Photos Wikimedia Commons". Phone ≤ 760 px: each photo row stacks (thumbnail left, text right; licence, used-on and source under the name); sources one per row.

- [ ] **Step 1: Write `e2e/credits.spec.ts`:** loads with no errors in light and dark, `h1`, title; the three figures equal `COUNTS` and `0`; eight rows visible, all rows visible after opening "Show all"; every visible "Commons →" link starts with `https://commons.wikimedia.org/wiki/File:`; the footer "Credits" link opens the page; no sideways scroll at 390 px.
- [ ] **Step 2: Run** it — fails with 404.
- [ ] **Step 3: Build the page, route, footer link and data line.** Update `test/shell/footer.test.tsx` for "Credits" as a link and the new data line.
- [ ] **Step 4: Run** the spec, `bun test`, `bun run lint`, `bun run build` — pass; `/credits` prerenders.
- [ ] **Step 5: Look at it.** Screenshot desktop and 390 px in both themes beside mocks 126:2 / 127:2; fix what does not meet them.
- [ ] **Step 6: Commit** `feat(credits): every photographer, typeface and data source is credited on one page`.

### Task 6: Docs and the whole-branch check

**Files:**
- Modify: `DESIGN.md` ("Concept carried through": the Glossary line now describes the shipped page; add Credits), `docs/motion-map.md` ("Glossary, 404, credits" rows match what was built)

- [ ] **Step 1: Update the two docs** in a few lines each.
- [ ] **Step 2: Run everything:** `bun run lint`, `bun test`, `bun run build`, then the full e2e suite on a quiet machine. Known failures on `main` are listed in the handoff memory; anything else is this branch's.
- [ ] **Step 3: Capture** desktop and phone screenshots of both pages in both themes for the PR.
- [ ] **Step 4: Commit** `docs(design): the Glossary and Credits pages as built`.
