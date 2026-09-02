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

### 2. Note Editor doesn't match the Claude Design handoff

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

### 3. Jobs' click-through detail view is still pre-Nocturne styling

- **Where**: `client/src/pages/job-search/ApplicationDetailModal.tsx` /
  `ApplicationDetailSheet.tsx` / `ApplicationDetailContent.tsx` / `shared.tsx`
  — opened by clicking a row in `BoardDesktop.tsx` (the new lg+ Jobs list) or
  `BoardMobile.tsx`.
- **Found**: the Nocturne desktop pass (2026-09-01), while rebuilding Jobs'
  lg+ layout against `German Companion Desktop.dc.html` id="2e" — that
  handoff spec covers the funnel/filter/list only, not a detail panel.
- **Cause**: not a regression — these files still use the old `Modal`
  primitive, `lucide-react` icons, and pre-Nocturne token classes
  (`text-body`/`ink-*`/`border-hairline`), unchanged since before the
  redesign. `BoardMobile.tsx` already reskinned the list it opens from;
  the modal itself was never in scope for that.
- **Why not fixed yet**: no handoff spec exists for this panel (attachments,
  CV linking, event timeline) — reskinning it now would mean inventing new
  Nocturne UI rather than reproducing a spec, a bigger and separately-scoped
  piece of work. Deferred by explicit user decision when the desktop pass
  was planned.

### 4. Review session (`/review`) has no desktop (`lg:`) layout

- **Where**: `client/src/pages/ReviewSession.tsx` (and its children —
  the flip card, grade row).
- **Found**: the Nocturne desktop pass (2026-09-01), while building the
  Self-tests Runner's desktop sizing, which partly extrapolated from
  Review's shape as the nearest transient-screen precedent.
- **Cause**: Review's only handoff spec at desktop size is the exotic
  2560×1080 ultrawide mock (`German Companion Desktop.dc.html` id="1c"),
  which needs its own bespoke 5-pane layout (stack queue | flashcard |
  dictionary entry | notes dock) — not something a standard 1440px `lg:`
  breakpoint can reasonably approximate by just widening the mobile card.
- **Why not fixed yet**: out of scope for the desktop pass, which targeted
  the screens with a literal *standard-breakpoint* handoff spec (Plan,
  Syllabus, Sources, Jobs, Stats, Self-tests, Settings, Login). Building
  Review's real desktop layout means either scoping down the ultrawide mock
  to 1440px (a real design judgment call, not just a reskin) or building
  the ultrawide layout itself — both bigger, separately-scoped work.

### 5. Desktop Jobs has no CV-management entry point

- **Where**: `client/src/pages/job-search/index.tsx`'s lg+ block.
- **Found**: the Nocturne desktop pass (2026-09-01), while rebuilding Jobs'
  lg+ layout — the pre-existing desktop kanban had a "+ New CV" button
  (`CvShelf.tsx`, deleted) that opened `AddCvModal`; the new dense-list
  layout (`BoardDesktop.tsx`), matching the literal handoff spec, has no
  CV shelf at all.
- **Cause**: `German Companion Desktop.dc.html` id="2e" doesn't show a CV
  panel on this screen — literal fidelity means not inventing one back in.
- **Why not fixed yet**: mobile (`CvShelfMobile.tsx`, in the `lg:hidden`
  block on the same page) still has full CV add/view — desktop users can
  drop to a narrower viewport to manage CVs in the meantime. Worth a real
  decision on whether desktop Jobs should get its own CV entry point, not
  a drive-by fix.

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
- **Phase 11 / stale by 2026-09-01** — the former open item "`/plan/self-tests`
  renders with a light card on the dark page" (`SelfTestsPage.tsx`) turned
  out to be resolved by the Phase 12-19 squash commit: that file no longer
  exists, replaced by `client/src/pages/plan/SelfTests.tsx`/
  `SelfTestRunner.tsx`/`SelfTestDone.tsx`, both fully Nocturne-styled.
  Confirmed by checking the file no longer exists before removing the entry,
  not just assuming it shipped alongside the rest.

- **2026-09-01, user's post-desktop-pass testing pass** — 6 items reported
  after driving the live app (not screenshots): (1) Dashboard's review dial
  showed the due-count number overlapping the ring — confirmed a real,
  breakpoint-independent bug: `ReviewDial.tsx`'s center number used a fixed
  56px font with no width accommodation, so any 2-3 digit due count
  overflowed the ring's ~103px usable diameter on mobile or desktop alike.
  Fixed with a digit-count-based font-size step-down using the existing
  `--text-display`/`--text-display-lg`/`--text-display-xl` tokens. (2)
  Dashboard's 3 columns got real content additions: a 7-day streak strip in
  column 1 (reuses `learningProgress(30d)`'s `streakGrid`, same query Stats
  already fetches), the "Next in your plan" card's description shown
  inline instead of requiring a click at `lg:`, a "+ Add task" control, a
  "keep going" pull-forward flow once today's plan is done, a
  "Chapter progress" tile in column 3 (reuses `Plan.tsx`'s
  `ChapterProgressCard`, now hoisted to `planShared.tsx`), and `Applications`
  pinned to the literal column bottom; the redundant "Capture note" button
  in Dashboard's desktop header (duplicating the global `CaptureFab`) was
  removed. (3) The "keep studying past today" ask turned out to need far
  less new backend than it sounded — the full 182-day plan is already
  materialized at activation (`roadmap-generator.ts`), so "out of tasks"
  only meant today's *view* was empty; added one new route,
  `POST /roadmap/pull-forward`, mirroring the existing backlog
  pull-into-today/spread routes' transaction shape (just reaching into
  future days instead of the backlog) — completing a pulled-forward task
  logs real time exactly like any other task, no new time-tracking model.
  (4) Words' desktop layout gained the 3rd "Notes" column from the original
  handoff (confirmed via the literal handoff screenshot the user attached)
  that a prior phase had deliberately deferred — `NotesDock.tsx`, using the
  already-real `Note.wordId` relation and `updateNote({wordId})`; word rows
  are now draggable and dropped directly onto a note card to link them (one
  adaptation from the literal "drop onto the actively-typed note" — no
  reusable embedded composer existed to put there, so each note card in the
  list is its own drop target instead, same real capability). Added a real
  `Word.starred` column + migration (distinct from the existing `leech`
  "problem word" flag) and promoted Star/Family/Drill to a header row on
  desktop, kept as footer+overflow-sheet on mobile. (5) Plan's "switch to
  any date" turned out to need no backend work at all —
  `GET /roadmap/day/:date` and `GET /roadmap/calendar` already existed;
  added a date-input control to `PlanHeader` for Day view, normalizing
  `roadmapToday`/`roadmapDay(date)`'s two different response shapes to one
  `{date, tasks}` shape so the rest of the page doesn't care which it's
  looking at; today-only actions (add task, keep-going, tomorrow preview)
  hide themselves when viewing another date. (6) Syllabus's station-detail
  panel was confirmed rendering as a sibling *after* the whole station list
  instead of inline at the clicked station — `StationDetailModal` was never
  a positioned overlay, just a plain div wherever its call site placed it;
  fixed by interleaving it into the `stations.map()` loop right after the
  clicked node. The desktop pane was rebuilt into a real 3rd
  roadmap/detail/sources layout (`SyllabusSourcesDesktop.tsx`), level
  switching unlocked for read-only preview of locked levels, and Sources
  ranked by a new `rankSourcesForStation()` word-overlap heuristic
  (`StudySource` has no theme field to match exactly, confirmed against
  schema.prisma — same honest-best-effort approach `bestMatchingStation()`
  already uses elsewhere). All 6 verified working end-to-end in a real
  browser (Playwright against the demo account), not just typechecked.



