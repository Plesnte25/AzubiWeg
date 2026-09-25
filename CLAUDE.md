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

## The Bento "Sticker Club" redesign (in progress, `bento` branch)

The app is being rebuilt against a Claude Design handoff that replaces the earlier Nocturne design entirely:
`~/Downloads/Personal German Learning Companion (1)/design_handoff_azubiweg_bento/` (the `README.md` is the spec;
the seven `*.dc.html` files are the visual reference, viewed with `npx serve .` on `AzubiWeg Bento.dc.html`). It's a
bento grid in a playful sticker style: chunky ink outlines, hard offset shadows, slightly rotated tiles, tape strips,
round stickers and one colour per area, with light/dark following the OS and three breakpoints.

**The plan is `~/.claude/plans/recursive-booping-sunbeam.md`**: phases, and every keep/cut/redefine decision settled
with the user (metrics definitions, per-page scope, what's deferred). Read it before starting a phase. Nocturne v2 is
tagged `nocturne-final` and is what production runs until the `bento` branch is merged.

Rollout: all Bento work lands on the long-lived `bento` branch, which is merged and deployed **once**, at the end.
There's no per-page production rollout and no feature flag. When a phase rebuilds a page, the old Nocturne
implementation is deleted outright (grep for external consumers first), not kept behind a flag. Until every page is
rebuilt, not-yet-rebuilt pages render their Nocturne styling inside the Bento shell (they look wrong in light mode;
that's expected on the branch).

**Reproduce the handoff with literal fidelity** — exact colours, spacing, copy, rotation, structure — by extracting
the actual values from the `.dc.html` source: markup between `<x-dc>` tags, and `renderVals()` in the
`<script type="text/x-dc">` block, which computes every style. Grep/Read those, not just the README prose. Then
translate into this app's React/Tailwind stack; don't paste the prototype's markup. Build only the variants the
README's table lists (dashboard `variant="a"`, Jobs/Notes `dir="a"`).

### Deviate from literal fidelity only when it would misrepresent real data

The handoff is an offline demo with fabricated sample data and a simplified model of the app. Follow it exactly for
visual design, but when its *behaviour* assumes something this app's real backend doesn't do, build the honest
version instead. Cases already settled (the plan has the full list):

- **One source of truth per metric.** The demo contradicts itself (hero "A2 · 64%" by words against 34% by stations;
  14 applied against 12 sent). Level % = passed+mastered syllabus items ÷ items in the active level, everywhere.
  Strength pips are derived from SRS interval bands; "shaky" = strength ≤ 2 everywhere. Lernzeit = heartbeat minutes
  on learning routes. Weekly goal = `studyCapacityMinutes` × 6. "New" = added in the last 7 days.
- **Real rules over demo copy.** The exam gate shows the real rules (20 questions / 20 min / 70%), not the demo's
  40/45/80. The review session has Again/Hard/Good/Easy: Again is this app's
  addition to the Obsidian-plugin scheduler (`server/src/services/srs.ts`, a lapse to 1 day; the vault SR line format
  is unchanged), and the interval labels come from `GET /api/reviews/:wordId/preview`. Undo reverts a grade on the
  server (`POST /api/reviews/:wordId/undo`, from the previous schedule stored on ReviewLog).
- **Missing data is hidden, not faked.** Declension, conjugation and word family come from kaikki.org/DErivBase with
  incomplete coverage: hide the tab/card rather than show an empty or invented table. The Valency tab has no data
  source, so it's hidden.
- **Hints stay hints.** The Add-word article picker is a hint; the real gender comes from enrichment at save time.
  Job-posting fetch is best-effort, and detected German levels can be overridden.
- **No fake affordances.** When a real affordance has no correct implementation yet (e.g. the application checklist,
  deferred), omit it rather than build something that looks functional but isn't, and leave a comment saying why.
- **Auth copy**: this is a real server-backed JWT app; never claim data stays on the device.

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
  stack, and `Layout.tsx` renders no chrome while on one, for a
  distraction-free session. Extend this list as MCQ/fill-blank/note-editor
  land.

**Gotcha**: React Router does **not** remount a route element just because
`location.state` changes on an unchanged pathname. `push("/review", {state})`
called while already on `/review` (e.g. Session Done's "drill" button on the
flagged word) needs a real remount to reset session state — key the route's
inner component on `useLocation().key` (unique per navigation entry, even to
the same path). See `ReviewSession.tsx`'s outer/inner split for the pattern.

### Design tokens (`client/src/index.css`)

- **Bento tokens** are plain CSS variables with the README §1.2 names (`--bg`, `--line`, `--shadow`, `--onTile`,
  `--plain`, `--plain2`, `--plainText`, `--plainMuted`, `--dash`, `--tomato`, `--lemon`, `--sky`, `--lilac`, `--mint`,
  `--pink`, `--orange`, `--tape`, `--btn`, `--sel`, `--scrim`, `--hl`, `--pipOff`, `--h0`, `--cork`, `--rule`, …),
  defined for `[data-theme="light"]` and `[data-theme="dark"]`. An `@theme inline` block aliases the common ones for
  Tailwind (`bg-tomato`, `border-line`, `text-plain-muted`, …).
- **Theme** (`lib/theme.tsx`): preference `'system' | 'light' | 'dark'`. The default follows `prefers-color-scheme`
  with a live listener; the toggle stores an explicit override in `localStorage["azubiweg-theme"]`. Only the resolved
  theme is written to `<html data-theme>`, and `client/index.html` resolves it pre-mount so there's no flash.
- **Breakpoints**: sm < 768 ≤ md < 1200 ≤ lg. Tailwind's `md:` is already 768 and is used as-is. The 1200 step is
  **`blg:`**. Tailwind's own `lg:` (1024) is deliberately not redefined, because legacy pages still use it. **`lgfill:`**
  = lg *and* at least 820px tall: only then does the shell fill the viewport with no page scroll. Shorter lg
  viewports page-scroll, with tile min-heights.
- **`--k`** display-type scale: each page root sets its README value (Dashboard/Words md .86 sm .72, Plan .9/.74, Stats
  .92/.8, Jobs/Notes .9/.78). Display sizes are written `calc(var(--k) * 34px)`. `:root` has a fallback for portalled
  modals.
- **Type**: Space Grotesk only, self-hosted variable WOFF2 (`src/assets/fonts/`, GDPR: no Google Fonts CDN), mostly
  700/600. Timers and clocks use `var(--font-mono)` with tabular nums.
- **Icons**: Phosphor (`@phosphor-icons/react`) with **`weight="fill"`** on Bento surfaces. `lucide-react` has been
  removed.
- The legacy Nocturne `@theme` tokens (`brand-*`, `ink-*`, `paper`, `card`, …) and keyframes remain only for pages not
  yet rebuilt. Don't use them in Bento code; they're deleted in the Phase 5 dead-code pass.

**Idiom**: inline `style={{}}` for literal handoff values (`var(--line)`, exact px, tilt degrees) plus Tailwind
utilities for layout. Hover lift and pressed nudge can't be inline, so they're classes in `index.css`: `.lift`
(reads `--tilt`, and `--lift` for the shadow size), `.tilt`, `.press`. Global `prefers-reduced-motion` handling
removes lifts and transitions but keeps the static tilt. There is no global `:active` transform: it would wipe out
the tiles' rotation. Focus is a dashed ink outline, not a box-shadow, because box-shadow is taken by the hard shadows.

### Shell and chrome

`components/Layout.tsx` is the Bento shell: page padding lg 24 / md 22 / sm 14, the chrome, then `<main>` as a flex
column. Pages fill it with `flex-1 min-h-0` (or `h-full`) at `lgfill`, and use explicit row heights below that. The
chrome (`components/chrome/Chrome.tsx`) is rendered once here rather than as row 1 of every page grid the way the
prototypes do it: the `TopNav` pill (lg: all labels; md: the active label only) and, on sm, a sticky `SmTopBar` plus
a sticky `SmBottomNav`. It has the `ThemeToggle` and an avatar that opens `ProfileSheet`. The ⌘K `CommandPalette`
and the G-letter shortcuts (`QUICK_LINKS` in `lib/navDestinations.ts`) stay app-wide. Transient routes (`/review`)
get no chrome.

### Shared primitives (`client/src/components/ui/`)

- `Tile` (outline, hard shadow, `tilt`, `lift`, `tape`; text colour follows the bg per the contrast rule), `Tape`,
  `Eyebrow`.
- `Sticker.tsx`: `Starburst` (18-point clip-path plus drop-shadow filter), `DuSticker`, `RoundSticker`.
- `Chip` (selected = `--sel`, tilted), `ArticleChip` plus `GENDER_COLORS` (der sky · die pink · das mint · verb
  lilac), `Segmented`, `Checkbox` (square/circle, mint when checked), `ProgressBar`, `PillButton`
  (primary/secondary/dashed), `EmptyState` (dashed box).
- `Modal`: centred and tilted at md+, a bottom sheet on sm. Tag, 30px title, subtitle, coloured `bg`, `footer`, focus
  trap, Esc, returns focus. Mount it conditionally.
- `BottomSheet`: the same look, but **permanently mounted** with an `open` prop so its close transition plays and
  callers can reset form state on reopen (see `AddWordsDialog.tsx`).
- `Toast` (`toast.success/error/info`): one at a time, 2200ms, bottom-centre `--btn` pill; errors are tomato.
- Keep the semantic colour maps identical across pages (README §1.2): skill/task kind, note category, job stage,
  source type, score bands, strength pips.
- `client/src/lib/wordDisplay.ts` has the shared word-display helpers (Nocturne-era; review as Words is rebuilt).

### Phase-tracking comments

Code that bridges to a not-yet-built phase carries a `Phase N` comment naming the plan phase that replaces it. Grep
for `Phase ` before assuming a screen is unfinished or a stopgap is permanent.

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
  as the feature working. **`node client/scripts/shots.mjs`** (a
  `playwright-core` devDependency plus the Chromium build already cached in
  `~/.cache/ms-playwright/`) screenshots every route × sm/md/lg/laptop ×
  light/dark plus named UI states into `docs/screenshots/bento/`, and
  reports console errors and horizontal overflow. Add a `STATES` entry for
  each new modal or sheet. For one-off interaction checks, a small
  throwaway playwright-core script is enough — inject a token into
  `localStorage` (see `api/client.ts`'s `setSession` for the exact keys:
  `token`/`user`/`isDemo`) rather than automating the login form. The local
  DB is `cd server && npm run db:start` (embedded Postgres on 5433, no
  Docker). `DEMO_MODE_ENABLED=true`
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
  `SKILL_COLORS`/`SKILL_LABELS`), reused everywhere a skill is shown, with the
  Bento map (Vocab tomato · Grammar lilac · Listening sky · Speaking pink ·
  Writing mint · Reading orange · Self-test/Jobs lemon). Listening and
  speaking are shown as separate skills (the Nocturne-era display merge is
  gone).

## Claude Design handoffs

Exports live under `~/Downloads/<name>/design_handoff_.../` as a `.dc.html`
(a design-tool-proprietary reference, not code to copy) + a `README.md`
describing intended structure/tokens/interactions in prose. Treat the
`README.md` as the spec and the `.dc.html` as a visual reference to open in
a browser — recreate the *described behavior* in the real React/Tailwind
stack, don't paste markup from it. Any data/icons shown in a mock are
placeholders for positioning/alignment unless the handoff says otherwise —
real data comes from the API, real icons come from Phosphor Icons
(`@phosphor-icons/react`, fill weight for Bento).
