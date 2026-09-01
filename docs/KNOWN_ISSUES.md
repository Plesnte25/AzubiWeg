# Known issues — Nocturne redesign

Bugs and rough edges found while building the Nocturne redesign
(`~/.claude/plans/so-we-are-going-wondrous-axolotl.md`), tracked here instead
of fixed inline so the redesign itself doesn't stall — the plan is to clear
this list in one pass once all 20 phases have landed. Each entry says which
phase surfaced it, whether it's fixed, and enough detail to act on it without
re-deriving the investigation.

## Open — needs a fix

### 1. Dashboard "Mastery ›" link is unclickable (tab bar occlusion)

- **Where**: `client/src/pages/Dashboard.tsx`, the "Weakest right now" strip's
  `mt-auto`-pinned footer block (`Mastery ›` button, and likely the whole
  block's clickable area near the bottom edge).
- **Found**: Phase 12, while fixing the identical bug on `ExamGate.tsx`
  (below). Confirmed independently with a real Playwright click attempt —
  it timed out the same way the Exam Gate button did before that fix, i.e.
  this is a real click-occlusion, not a cosmetic overlap.
- **Cause**: same root cause as the Exam Gate bug — a `min-h-[calc(100dvh-40px)]`
  + `mt-auto`-pinned-footer layout that doesn't account for the fixed tab
  bar's own `~88px + safe-area` reservation on `<main>` (`Layout.tsx`).
- **Why not fixed yet**: the straightforward fix (make the screen internally
  scrollable, add real bottom padding — what was done for Exam Gate) doesn't
  directly apply here: Dashboard has an explicit "must not scroll, content
  fits exactly one viewport" design requirement, so enabling scroll would
  violate that. Needs a different fix (tighter/corrected `min-h` math, or
  reducing content height, or reserving explicit clearance the way the
  `CaptureFab`'s `pr-16` already does for horizontal space) plus real
  viewport-height verification across a few device sizes — more than a
  drive-by fix.

### 2. `/plan/self-tests` renders with a light card on the dark page

- **Where**: `client/src/pages/learning-hub/SelfTestsPage.tsx`, reached via
  the new real route `client/src/pages/plan/SelfTests.tsx` (Phase 11).
- **Found**: Phase 11, screenshotted while verifying the new `/plan/*`
  routes all load without errors.
- **Cause**: not a regression — confirmed via `git log` that
  `SelfTestsPage.tsx` was last touched in commit `466fb59`, *before* the
  Nocturne redesign started. It's still fully pre-Nocturne styling (light
  card, old token assumptions) now visible against the new dark app shell
  for the first time because Phase 11 gave it a real, directly-reachable
  route instead of hiding it behind the old `?view=` shell.
- **Why not fixed yet**: this is exactly Phase 14's job ("Self-tests hub +
  MCQ + Fill-in-the-blank — reskinning existing question-bank.ts/engine.ts
  output onto the new visual spec"), not a bug to patch around — the real
  fix is the Phase 14 reskin itself.

### 3. Note Editor doesn't match the Claude Design handoff

- **Where**: `client/src/pages/plan/NoteEditor.tsx` (Phase 13).
- **Found**: user review after Phase 13 shipped — "Note editor is not the
  way I designed via Claude design."
- **What's known so far**: no specifics yet on which part is off (layout,
  spacing, colors, the MinimalTiptap-vs-literal-textarea deviation
  documented in the file's own comment, or something else). Needs a
  follow-up pass once the user says what to change — don't guess and
  re-skin blind.
- **Why not fixed yet**: per the standing "defer incidental bugs until all
  20 phases ship" instruction — this doesn't block Phase 14+.

## Resolved during the redesign (for reference — no action needed)

Kept here as an audit trail so nothing on this list gets "rediscovered" as
new. All of these were found by actually driving the app in a browser
(Playwright + a real seeded account), not by reading code or trusting
`tsc`/`npm test` alone.

- **Phase 9** — `ReviewHistoryCard`'s "Next review" line showed "in NaN days
  · Invalid Date". `Word.srDue` comes over the wire as a full UTC-midnight
  ISO string, not the pre-formatted `YYYY-MM-DD` some other date fields get
  server-side; a local-midnight string-concat trick that works for those
  fields silently produced a malformed date here. Fixed with the same
  UTC-getter pattern `server/src/services/reminders.ts`'s `daysUntil()`
  already uses.
- **Phase 10** — Session Done's "drill" button on the flagged slipping word
  (`push("/review", {state}) `while already on `/review`) did nothing
  visible; React Router doesn't remount a route just because
  `location.state` changes on an unchanged pathname, so the exhausted
  session's state kept serving. Fixed by keying the route's inner component
  on `location.key`.
- **Phase 11** — Plan's progress bar showed roadmap-wide totals ("24 of
  893") instead of today's; `GET /api/learning/roadmap/today`'s
  `overview.tasksDone/tasksTotal` turned out to be plan-wide fields, not
  today's, despite living inside a "today" response. Fixed to derive
  today's count from `today.tasks` directly.
- **Phase 11** — a real, pre-existing gap (not this session's bug, but
  fixed while touching the same route): bureaucracy-skill roadmap tasks
  were filtered out of the visible task list (used to surface on the
  since-removed Checklist page) while still counting toward progress
  stats — invisible-but-counted tasks with no UI to ever complete them.
  Filter removed.
- **Phase 12** — Exam Gate's "Start exam" button was unclickable, occluded
  by the fixed tab bar (see the open Dashboard bug above — same root
  cause, this instance got the actual fix: made the screen scrollable with
  real bottom clearance instead of trusting the `min-h` arithmetic).
- **Phase 12** — `TestDone.tsx`'s "level unlocked" reward card showed "is
  now open" with no level name. `NEXT_LEVEL` already maps to a
  ready-to-display label ("A2"), but the reward card wrapped that result
  in `LEVEL_LABELS[...]` again, looking up `LEVEL_LABELS["A2"]` against a
  map keyed by lowercase `"a1"/"a2"/"b1"` and silently getting `undefined`.
  Fixed by using the value directly.
- **Phase 14** — no persistent CTA anywhere reached `/plan/self-tests`; the
  handoff's own literal entry point (Session Done's "Take a test" button,
  `ReviewSession.tsx` → `SessionDone.tsx`) was already correctly wired, but
  that's only reachable after finishing a review session, and Plan's
  Syllabus/Sources/Notes row never had a fourth entry for it — a real
  discoverability gap, even though it matched the handoff's literal
  3-button row. Fixed by adding a "Tests" entry (`ListChecks` icon) to
  that row in `client/src/pages/plan/Plan.tsx`, a deliberate small
  deviation from literal fidelity for the sake of the feature being
  reachable at all.
