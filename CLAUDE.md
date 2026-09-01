# CLAUDE.md

Shared context for AzubiWeg across **Claude (claude.ai)**, **Claude Code
(CLI)**, and **Claude Design** — the source of truth for the app's design
system and the conventions established while building it, so a mockup made
in Claude Design, a change discussed in claude.ai, and code written by
Claude Code all stay consistent with each other and with what's actually
shipped.

For feature scope (V1–V3, what each version does) see [README.md](README.md).
This file is specifically about **how the app is built and styled**.

## Stack

React 19 + TypeScript + Tailwind CSS 4 + TanStack Query + React Router + Vite
(client) · Express 5 + TypeScript + Prisma 7 + PostgreSQL (server).

**Gotcha**: `npx prisma migrate dev` does **not** auto-run `prisma generate`
in this project — always run `npx prisma generate` explicitly after a
migration, or the server throws "Unknown argument" errors against a stale
generated client. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## The Nocturne redesign (complete)

The app has been fully rebuilt against a Claude Design handoff — a
dark-only design system called **Nocturne**, a new 5-tab
(Today/Words/Plan/Jobs/Stats) + back-stack navigation model, several new
backend subsystems (kaikki.org/DErivBase enrichment pipeline, exam-gating,
word-linked notes), and a real desktop (lg+) layout — a labelled sidebar +
⌘K palette shell, pixel-precise Dashboard/Words desktop layouts, and every
other real screen centered in a consistent capped-width pane inside that
shell. All 20 phases (0–19, including the desktop pass and a full
regression/dead-code cleanup) are done. The plan that drove it — sequencing
rationale, per-phase file lists — lives at
`~/.claude/plans/so-we-are-going-wondrous-axolotl.md`, kept for historical
reference rather than a live status tracker now that nothing's outstanding
against it. **`docs/KNOWN_ISSUES.md`** tracks what's left: a small bug
backlog deliberately deferred until the whole redesign shipped, now being
worked through.

Rollout is **big-bang per phase** — no coexisting old/new routes or
feature-flagged UI. When a phase reskins a page, the old implementation is
deleted outright (grep for external consumers first), not kept around behind
a flag.

**Reproduce the handoff with literal fidelity** — exact colors, spacing,
copy, structure — by extracting the actual markup/styles from the
`.dc.html` prototype (`grep`/`Read` the relevant `<sc-if>` block and its
backing JS, not just the README prose), then translate that into this app's
real React/Tailwind stack (don't paste the prototype's own markup or class
names — it uses a design-tool-proprietary CSS reset that doesn't exist
here).

### Deviate from literal fidelity only when it would misrepresent real data

The handoff is an offline demo with fabricated data and a simplified model
of the app (no real backend, no real auth). Follow it exactly for visual
design, but when its *behavior* assumes something this app's real backend
doesn't do, build the honest version instead — this has come up repeatedly
and the same judgment call applies each time:

- **Auth screen**: reskin the passphrase-dot visual style, but rewrite the
  "everything stays on this device, nothing is uploaded" copy — this is a
  real server-backed JWT app, not local-only.
- **Add-Word sheet**: the article-suggest chips (der/die/das guessed from a
  word's ending) are a hint only, never submitted to the API — the real
  gender comes from the kaikki.org enrichment lookup at save time.
- **Review session grade row**: this app's SRS
  (`server/src/services/srs.ts`) is a 3-grade port of the Obsidian Spaced
  Repetition plugin — there's no "again" grade the handoff's 4-button row
  assumes, so it's Hard/Good/Easy only. Per-grade interval labels are real,
  computed via `GET /api/reviews/:wordId/preview` (calls the same pure
  `schedule()` the real grade-submit route uses), not the handoff's
  hardcoded "&lt;1 min"/"2 days" copy.
- **Missing/incomplete data** (declension, conjugation, word-family):
  kaikki.org/DErivBase coverage is real but incomplete — hide the card
  entirely rather than showing an empty/fabricated table.
- When a real affordance has no correct implementation yet (e.g. the review
  session's undo button would need to both revert a word's SRS fields *and*
  delete the `ReviewLog` row it just wrote, and no such endpoint exists),
  **omit it** rather than build something that looks functional but isn't.
  Leave a comment saying why, the same way `BottomTabBar.tsx`/`Layout.tsx`
  already flag several Phase-17-pending gaps.

### Navigation model (`client/src/lib/navStack.tsx`)

A back-stack layered on top of React Router, ported from the handoff's own
`go()`/`goBack()`/`tabTo()` reference implementation:

- **`push(path, { state? })`** — forward navigation from a tab or another
  pushed screen. Records the current path onto the stack (deduping if
  `path` is already in it — re-entering pops back to that entry instead of
  growing the stack) unless the current path is transient. `state` carries
  router location state (e.g. a curated word list for the review session)
  without serializing it into the URL.
- **`switchTab(path)`** — selecting a bottom-tab destination; resets the
  stack (tabs are independent roots).
- **`goBack()`** — pops to the real previous screen, skipping transient
  entries and stale duplicates of the current path.
- **`backLabel`** — what `goBack()` will land on right now, for a pushed
  screen's dynamic "‹ Back to X" button (`ROUTE_LABELS`, longest-prefix
  match — a screen under `/words/*` doesn't need its own entry, `/words`'s
  already covers it).
- **Transient screens** (`TRANSIENT_PATH_PREFIXES`, currently `/review`) are
  never a valid Back target — abandoning one is never recorded onto the
  stack, and `Layout.tsx` hides the tab bar/FAB while on one for a
  distraction-free session. Extend this list as MCQ/fill-blank/note-editor
  land.

**Gotcha**: React Router does **not** remount a route element just because
`location.state` changes on an unchanged pathname. `push("/review", {state})`
called while already on `/review` (e.g. Session Done's "drill" button on the
flagged word) needs a real remount to reset session state — key the route's
inner component on `useLocation().key` (unique per navigation entry, even to
the same path). See `ReviewSession.tsx`'s outer/inner split for the pattern.

### Design tokens

Dark-only, defined in `client/src/index.css`'s `@theme` block — no `.dark`
class light/dark mechanism (removed with the Nocturne token swap). Key
values: background `#161826`, surfaces `#1c1f2c`/`#20222f`, accent family
`#9184d9`/`#b5abfc`/`#d2cefd`/`#5d5294`/`#423a6a`/`#3f424d`, amber warning
`#e4c4b6`/`#d19b86`, gender-coding hues (`--color-genus-der/die/das`, already
matching the handoff's ART map). Type scale, radius steps, and the
`--animate-*` custom properties (`fade-in-screen`, `pulse-glow`, `pop-in`,
`bob`, …) live in the same block — add new keyframes there rather than
inlining animation CSS per component.

Nocturne pages are written with inline `style={{}}` for anything pulled
directly from the handoff (literal hex/rgba values, exact px spacing) plus
Tailwind utilities for layout — see `Dashboard.tsx`/`Vocabulary.tsx` for the
established shape. This is a deliberate departure from the pre-Nocturne
`Button`/`Card`/`Stat` component library (still used by not-yet-rebuilt
pages) — don't reach for those components on a page being actively
reskinned to Nocturne.

### Shared primitives

- **`components/ui/BottomSheet.tsx`** — headerless bottom sheet (drag
  handle, scrim, slide-up transform), ported exactly from the handoff's
  `taskScrim`/`taskSheet` styling. The default primitive for any modal
  surface on a Nocturne page (task detail, Add-Word, Word Family, note
  editing, review-session actions) — distinct from the older `Modal.tsx`
  (centered dialog / sheet-on-sm), which still backs not-yet-rebuilt pages
  and stopgaps. A `BottomSheet` should stay **permanently mounted** with an
  `open` boolean prop (not conditionally rendered) so its close transition
  plays and so the "reset form fields when it reopens" `useEffect` pattern
  works — see `AddWordsDialog.tsx`.
- **`client/src/lib/wordDisplay.ts`** — shared word-display helpers used
  everywhere a word gets a chip or a review-strength sparkline (the Words
  list, Word Detail, the review card): `chipLabel`/`chipColor`/
  `fullArtLabel` (article/wortart chip), `buildSparkline`/`barColor`/
  `GRADE_HEIGHT` (grade-history bars, tiered by height), `findSlippingWord`
  (longest current streak of "hard" grades, for Session Done).
- **`client/src/lib/navDestinations.ts`** — the 5 tab destinations
  (icon/label/path), source of truth for `BottomTabBar.tsx`.

### Phase-tracking comments

Code that bridges to a not-yet-built phase carries a `Phase N` comment
(e.g. `PlanEntry.tsx`: "Phase 11 replaces this whole shell"; `CaptureFab.tsx`:
"onClick is a stub until Phase 13"). Grep for `Phase ` before assuming a
screen is unfinished or a stopgap is permanent — it usually says exactly
which phase replaces it.

## Testing conventions

- **Server** (`cd server && npm test`, vitest) — **pure-function unit tests
  on `services/` only**. There is no DB-integration or route-level test
  infra in this repo (no supertest, no test Postgres) — a route handler
  that's just thin CRUD+zod over Prisma isn't a testing gap on its own; the
  gap is when a route contains real *logic* with no extracted pure function
  backing it (e.g. `buildGrammarNote()` in
  `services/enrichment/index.ts` was genuinely untested pure logic until
  Phase 5's gap-closing pass exported and tested it — don't invent a
  route/DB test to cover something that's really just schema validation).
- **Client** — no dedicated test runner. Rely on `npm run build` (`tsc -b`,
  catches type errors) plus **actually driving the page in a browser**
  before calling a UI change done — `npm run build` passing is not the same
  as the feature working. This project has no committed browser-automation
  skill yet; when one is needed, `playwright-core` + a cached Chromium
  binary (check `~/.cache/ms-playwright/`, `~/.cache/pw-shot/` for one
  already on disk before reaching for a fresh install) driven by a small
  throwaway script is enough — inject a token into `localStorage` (see
  `api/client.ts`'s `setSession` for the exact keys: `token`/`user`/
  `isDemo`) rather than automating the login form. `DEMO_MODE_ENABLED=true`
  in `server/.env` + `npm run seed:demo` gives a fast login path for local
  testing — toggle it back off afterward, it's meant to be temporary.
  Real bugs this has actually caught: a date-math bug in a "next review"
  display (mixing UTC-anchored `@db.Date` values with local-timezone
  formatting — see the Date arithmetic gotcha below) and a same-route
  remount bug (see the Navigation model gotcha above). Neither would have
  been caught by typecheck alone.

## Other conventions

- **Date arithmetic on `@db.Date` columns**: Prisma serializes these as
  UTC-midnight ISO strings. Some routes reformat to a plain `YYYY-MM-DD`
  before sending (`dashboard.ts`'s `examTargetDate`) so the client can use a
  cheap local-midnight reconstruction (`` `${dateStr}T00:00:00` ``); others
  don't (`Word.srDue`) and need the UTC-getter treatment instead (see
  `server/src/services/reminders.ts`'s `daysUntil()` for the canonical
  pattern, or `client/src/pages/words/ReviewHistoryCard.tsx` for the
  client-side translation of it). **Check which convention a given field
  actually uses before copying a date-math pattern from a neighboring
  screen** — the two are not interchangeable and mixing them silently
  shifts the displayed day for anyone not at UTC.
- **`cn()` (`client/src/lib/cn.ts`) wraps `tailwind-merge`.** Conflicting
  utilities resolve "last one wins," so overriding a component default
  through `className` is safe.
- **Skill colors are global** (`client/src/lib/skills.ts`,
  `SKILL_COLORS`/`SKILL_LABELS`), reused everywhere a skill is shown.
  `displaySkill()` merges listening into speaking for display purposes only
  — the raw 9-skill truth stays intact for anything showing a single real
  task.

## Claude Design handoffs

Exports live under `~/Downloads/<name>/design_handoff_.../` as a `.dc.html`
(a design-tool-proprietary reference, not code to copy) + a `README.md`
describing intended structure/tokens/interactions in prose. Treat the
`README.md` as the spec and the `.dc.html` as a visual reference to open in
a browser — recreate the *described behavior* in the real React/Tailwind
stack, don't paste markup from it. Any data/icons shown in a mock are
placeholders for positioning/alignment unless the handoff says otherwise —
real data comes from the API, real icons come from Phosphor Icons
(`@phosphor-icons/react`, regular weight — the Nocturne handoff's icon
system; `lucide-react` still backs not-yet-rebuilt pages, being swapped
incrementally per page rather than in one mechanical pass).
