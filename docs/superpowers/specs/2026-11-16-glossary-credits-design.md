# Glossary, Credits and the easy "Soon" links

Date: 2026-11-16. Status: awaiting Praffi's approval.

## Intent

Ten places on the site say "Soon". Six of them can stop saying it now: four only need a link to something that already exists, and two (Glossary, Credits) need a page whose content the site already holds and whose mocks Praffi approved on 2026-11-08. A newcomer who meets a word they don't know should be able to look it up, and every photographer whose work the site uses should be credited in one place.

## Goals

- **Glossary page** at `/glossary`, built from Figma "Glossary" 121:2 (light) / 123:2 (dark).
- **Credits page** at `/credits`, built from Figma "Credits" 126:2 (light) / 127:2 (dark).
- **Four links go live:**
  - menu and footer "The car" → Chapter 05, `/chapters/inside-the-car`;
  - Home "Read next · Why one pit stop can win a race." → Chapter 03, `/chapters/tyres-and-strategy`;
  - footer "Source" → `https://github.com/praffiii/lights-out`;
  - menu and footer "How F1 works" → the chapter list on Home.
- Menu and footer "Glossary", footer "Credits", and "Full glossary" under every chapter's word chips link to the new pages.

## Non-goals

- The engine, The tracks, The people and the "Swedish Grand Prix, 1973" article. They keep their "Soon" tag; each is its own project.
- The "How F1 works · index" page (Figma 111:2). It has an approved mock but its content is stale (old Chapter 05, chapters 06–08); it stays out.
- New words. The glossary shows the 46 words the chapters already define.
- Team-radio audio or any sound.

## Anti-goals

- A glossary that drifts from the chapters. There is one word list (`src/chapter/words.ts`); the page reads it and holds no copy of its own.
- A credits table typed by hand beside the photos. Each photo's credit lives with the photo, once.
- A wrong credit. Every source link I add is listed for Praffi to check before merge.

## Approaches

1. **Build both pages from the approved mocks, with today's content (chosen).** The structure and look are already signed off; only the content that changed since 8 Nov is updated. Smallest path to two real pages.
2. **Link-only fix now, pages later.** Clears four placeholders in an hour but leaves "Glossary" and "Full glossary", the placeholders a reader actually reaches for, still dead.
3. **New mocks first.** The 8 Nov mocks predate the shipped header and footer, but those are shared components now, so a fresh mock round would only redraw what is already built.

## Glossary

Sections, top to bottom, as in the mock:

1. **Head.** "Every word, in plain English." with the count line "Glossary · 46 words · from 5 chapters" (counted from the data, never typed). A search field ("Try "undercut" or "box, box"") and an A–Z row; letters with no word are dimmed and not focusable.
2. **Dark band, "Tap a word. Get the meaning."** One real sentence with a real `Term` (the undercut), so the band demonstrates the inline note that already works in every chapter instead of drawing a picture of it.
3. **The list.** Columns Letter / Word / Meaning / Chapter. Words sort A–Z by term; the big letter shows on the first word of each letter. The chapter column links to the first chapter that lists the word ("Chapter 03 →").
4. **Next band.** The existing live `NextRace` band (the mock's "Watch it happen this weekend").
5. The shipped footer.

Behaviour:

- **Search** filters the list as you type, matching the word and its meaning, case-insensitive. No match shows one line: "No word matches "…"." Letters with no visible word dim.
- **Arriving on a word.** Every row has an id (`/glossary#undercut`). The row the address points at is the purple row from the mock, done with CSS `:target`, no state. "Full glossary" under a chapter's chips links to the open chip's word, or to the top when none is open.
- Phone (my call; the mock has no phone page): the letter column drops, the meaning sits under the word, the chapter link under the meaning; the A–Z row scrolls sideways inside its own box.
- No WebGL, no scroll pin. Entrance motion follows the motion map's existing page-head and row rules. Reduced motion: everything visible, no movement.

## Credits

Sections, as in the mock:

1. **Head.** "Built on other people's work." Three figures counted from the data: photos, photographers, and "Official F1 images 0".
2. **Photo table.** Thumbnail / place and year / photographer / licence / used on / "Commons →". The first eight rows show; "Show all N photos ↓" reveals the rest (a `<details>`-style control that works without JavaScript).
3. **Dark band, type and data.** The two typefaces with their licences, then the sources the site really uses today. The mock lists four; the site now uses seven, so the headline counts them: Jolpica F1 API, OpenF1, bacinger/f1-circuits (MIT), NASA SRTM, OpenStreetMap (ODbL), MaG80's car model (CC BY 4.0), MultiViewer (pit-loss estimate).
4. **Small print.** "Not affiliated with Formula 1." and "Spot a wrong credit? Open an issue →" to the repository's issues page.

Data:

- Each entry in `PHOTOS` (25) gains its photographer, licence and Wikimedia Commons page as separate fields; the caption string the pages show today is derived from them, so nothing is written twice. The 22 hero car photos in `src/home/cars.ts` already carry a Commons link and join the same table.
- "Used on" is a short list kept with each photo.
- I look up the Commons page for each photo. The lookup list (photo, page, author, licence as Commons states it) goes in the PR for Praffi's check; a photo whose page I cannot confirm is listed as unconfirmed rather than guessed.

## Constraints

- Zero cost, no new dependency, no comments, no `as` casts.
- Both pages are static and prerendered like the chapters.
- Light and dark themes; the dark bands stay dark in both.

## Left to the builder

File layout, CSS, the exact phone spacing, test selection (unit tests for the word index, search and counts; one e2e per page plus the newly live links).
