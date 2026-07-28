# CLAUDE.md

Shared context for AzubiWeg across **Claude (claude.ai)**, **Claude Code
(CLI)**, and **Claude Design** — the source of truth for the dashboard's
design system and the conventions established while building it, so a
mockup made in Claude Design, a change discussed in claude.ai, and code
written by Claude Code all stay consistent with each other and with what's
actually shipped.

For feature scope (V1–V3, what each version does) see [README.md](README.md).
This file is specifically about **how the app is built and styled**, and the
non-obvious decisions/gotchas behind it — mainly the Dashboard, which has
gone through many iterative design passes.

## Stack

React 19 + TypeScript + Tailwind CSS 4 + TanStack Query + React Router + Vite
(client) · Express 5 + TypeScript + Prisma 7 + PostgreSQL (server).

**Gotcha**: `npx prisma migrate dev` does **not** auto-run `prisma generate`
in this project — always run `npx prisma generate` explicitly after a
migration, or the server throws "Unknown argument" errors against a stale
generated client. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Dashboard layout: 4 grouped sections

The dashboard (`client/src/pages/Dashboard.tsx`) is organized into 4 sections,
each a **single bordered/rounded container with internal divider lines**
between its members — not N separate cards with gaps between them. This was
a deliberate consolidation after the dashboard read as "congested": every
widget having its own border/radius/shadow/padding wasted a lot of space.

1. **Stats** — 5 tiles in one row, `divide-x` between them, chrome-stripped
   individual tiles (full card look below `lg:`, flush inside one shared
   border at `lg:`).
2. **Courses** ("My Courses") — a 3-panel horizontal accordion (A1/A2/B1).
   Collapsed panel = conic-gradient ring + code + title. Active panel = a
   48px left "water-tank" strip (background fills bottom-up to
   percent-complete, no separate progress bar) + a scrollable **list** of
   course rows (`divide-y`, not individually-carded), green-highlighted when
   100% done. Clicking the active strip again collapses back to
   all-3-equal-width.
3. **Analytics** — one bordered container, CSS grid: Performance (radar) +
   Study Time (bar chart) side by side on top, My Progress (overall bar +
   5 skill gauges) spanning full width below (`grid-rows-[1fr_1.1fr]`).
4. **Schedule** (right column) — one bordered container: week-strip
   calendar, Tasks Completed (segmented bar), Today's Tasks (the one
   scrollable section), and a pinned Jobs-pipeline icon row at the bottom.

Left (Courses+Analytics) : right (Schedule) column width is `7fr : 3fr`
(`lg:grid-cols-[7fr_3fr]`) — deliberately tuned narrower for Schedule,
confirmed working at that ratio without cramping the calendar/task list.

**No page scroll at `lg:` and up** is a hard requirement — everything fits a
fixed viewport (`h-dvh`-based) via flex-1/min-h-0 chains. Internal scroll is
only acceptable on genuinely list-like content (the course list, Today's
Tasks) — chart/gauge quadrants must **fit exactly**, not scroll (see the
Charts section below for how that's kept true). Below `lg:`, everything
falls back to a plain stacked single column of individually-carded widgets —
sm/md has been explicitly deferred and isn't part of this design pass.

## Card identity: watermark icons, not text headers

"My Courses", "Performance", "Study Time", and "My Progress" have **no
visible heading text** — each carries a large (~112px), low-opacity (10%),
grayscale watermark icon bleeding off a corner instead (My Courses gets two,
one per corner). Every one of these cards still has a real `<h2>`/`<h3
className="sr-only">` heading in the DOM for accessibility, since the
watermark is purely decorative.

**Gotcha**: the watermark must have a **higher z-index than the card's
content** (`z-20` vs. the content wrapper's `z-10`), not lower — otherwise
opaque content underneath (e.g. the accordion panels' `bg-card`) fully hides
it. `pointer-events-none` on the watermark keeps clicks passing through to
the real content beneath it.

Tasks Completed / Today's Tasks / the Jobs row keep plain text labels — the
watermark treatment is only for the 4 cards above.

## Icon set

Flat PNG icons in `client/src/assets/icons/` (not emoji, not a line-icon
library, for card/tile identity specifically):

| File | Used for |
|---|---|
| `fire.png` | Stat tile: Day streak |
| `clock.png` | Stat tile: Learning Hrs |
| `dictionary.png` | Stat tile: Vocab due/total |
| `quiz.png` | Stat tile: Quizzes completed |
| `streaming.png` | Stat tile: Active courses |
| `hourglass.png` / `schedule.png` / `annual.png` | Study Time toggle: Hour / Weekly / Monthly |
| `clock (1).png` | Study Time watermark |
| `good-feedback.png` | Performance watermark |
| `rise.png` | My Progress watermark |
| `online-certificate.png` | My Courses watermark (top-left) |
| `learning.png` | My Courses watermark (bottom-right) |
| `task.png` | Tasks Completed header |
| `clipboard.png` | Today's Tasks header |
| `wishlist.png` / `apply.png` / `job-interview.png` / `job-offer.png` / `reject.png` | Jobs-pipeline row: Wishlist / Applied / Interview / Offer / Rejected |

All 5 job-pipeline icons are real files now (no lucide placeholders left in
that row).

Everything else (chevrons, checkmarks, award badge, etc.) is `lucide-react`.

## Charts: pick the simplest thing that fits, avoid vendored chart libraries

- **Radar** (Performance): Chart.js via `react-chartjs-2`
  (`client/src/components/SkillPerformanceRadar.tsx`).
- **Bar charts** (Study Time hour/weekly/monthly): hand-rolled SVG, not a
  library — full control over a simple shape, no dependency risk.
- **Arc gauges, donut rings, segmented bars**: also hand-rolled SVG
  (`SkillProgressGauges.tsx`, `DonutProgress.tsx`, `SegmentedSkillBar.tsx`).
- A `@bklit`/`@visx`-based radar chart family (`client/src/charts/*`) and
  `motion` were used in an earlier pass and have been **fully removed** —
  don't reintroduce them; Chart.js replaced that exact slot.

**Gotcha — Canvas can't resolve CSS variables.** Chart.js draws on
`<canvas>`, which (unlike SVG/DOM styles) can't resolve `var(--foo)` — colors
must be read via `getComputedStyle(document.documentElement)` and re-read
whenever the theme toggles (see `resolveColor()` in
`SkillPerformanceRadar.tsx`, driven by the `useTheme()` hook). SVG-based
charts don't have this problem — `var(--color-...)` works fine directly in
their `style`/attribute props.

**Gotcha — chart containers must have a real, bounded height, not a fixed
pixel guess.** Both the radar and the SVG bar charts previously used a fixed
height (`h-72`, or an SVG whose CSS height was driven by a fixed
width:height aspect ratio) that didn't match the actual flex-computed space
in a merged/no-scroll layout, causing clipped labels or forced scrolling.
Fix: size the chart's wrapper `h-full w-full` inside a proper
`min-h-0 flex-1` ancestor chain, and for hand-rolled SVGs use
`preserveAspectRatio="xMidYMid meet"` so it scales down to fit rather than
overflowing. For the Analytics grid specifically, **explicit
`grid-rows-[1fr_1.1fr]`** (not implicit auto rows) is required — implicit
grid rows size to content, not equal shares, and silently starved one row
of height when the grid was flattened from separate cards into one merged
container.

## Other conventions

- **`cn()` (`client/src/lib/cn.ts`) is a plain string-join, not
  tailwind-merge.** Passing conflicting utilities (e.g. `items-baseline` from
  a shared component default + `items-start` override) via `className` does
  **not** reliably resolve by "last one wins" — build the element's classes
  as one literal string instead of trying to override a conflicting default.
- **Skill colors are global** (`client/src/lib/skills.ts`,
  `SKILL_COLORS`/`SKILL_LABELS`) — reused everywhere a skill is shown (task
  rows, radar axes, gauges, bars, course-row badges). `displaySkill()` merges
  listening into speaking for display purposes only (`DISPLAY_SKILLS`); the
  raw 9-skill truth stays intact for anything showing a single real task.
  `DISPLAY_SKILL_LABELS_COMPACT` gives the merged skill as `"S/L"` instead of
  `"Speaking & Listening"` for tight spaces (Study Time legend, Tasks
  Completed legend) — use it there; other spots (radar axis, gauge label)
  keep the full label.
- **Notification-bubble count pattern**: a small circle
  (`bg-[var(--color-danger-solid)]`, white bold text, `rounded-full`,
  positioned `absolute -right-0.5 -top-0.5`) overlaid on an icon, shown only
  when count > 0 — established first in the sidebar's unread-notifications
  dot, reused for the Jobs-pipeline icon row. Prefer this over a
  count-printed-below-the-icon or a bordered-pill-with-text-label when space
  is tight and the icon alone is identifiable.
- **Divided lists over individually-carded rows** when something is
  logically one list (course rows, learning-hub sections): wrap in
  `divide-y divide-hairline`, no per-row border/radius/own-background. Only
  reach for a full nested card when the row is genuinely a separate,
  independently-styled unit.
- Design tokens (colors, radius, shadows, type scale) live in
  `client/src/index.css`'s `@theme` block and re-theme automatically for dark
  mode via a `.dark` class override of the same variable names — never
  hardcode a hex value that should adapt to theme; reference the CSS
  variable (or, for canvas contexts, resolve it — see the Charts gotcha
  above).

## Claude Design handoffs

Exports live under `~/Downloads/<name>/design_handoff_.../` as a `.dc.html`
(a design-tool-proprietary reference, not code to copy) + a `README.md`
describing intended structure/tokens/interactions in prose. Treat the
`README.md` as the spec and the `.dc.html` as a visual reference to open in a
browser — recreate the *described behavior* in the real React/Tailwind
stack, don't paste markup from it. Any data/icons shown in a mock are
placeholders for positioning/alignment unless the handoff says otherwise —
real data comes from the API, real icons come from whatever's in
`client/src/assets/icons/` (confirm with the user before substituting or
guessing a file that isn't there yet).
