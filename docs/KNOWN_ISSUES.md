# Known issues — Nocturne redesign

Bugs and rough edges found while building the Nocturne redesign
(`~/.claude/plans/so-we-are-going-wondrous-axolotl.md`), tracked here instead
of fixed inline so the redesign itself doesn't stall — the plan is to clear
this list in one pass once all 20 phases have landed. Each entry says which
phase surfaced it, whether it's fixed, and enough detail to act on it without
re-deriving the investigation.

## Open — needs a fix

Nothing open right now — see the 2026-09-05 follow-up pass below for this
batch (Words polish, Syllabus md tab, two reports that turned out to
already be fixed) and the 2026-09-04 pass above it for the full backlog.

## Resolved during the redesign (for reference — no action needed)

Kept here as an audit trail so nothing on this list gets "rediscovered" as
new. All of these were found by actually driving the app in a browser
(Playwright + a real seeded account), not by reading code or trusting
`tsc`/`npm test` alone.

- **2026-09-05, fifth bug-fixing pass** — a smaller follow-up batch (Words
  polish, one real Syllabus gap, two reports that turned out to already be
  fixed), verified live against a fresh demo account plus a targeted check
  against a seeded word with full enrichment data (grammar/example/
  translation), not just typechecked.
  1. **Words desktop layout sat in a centered, padded box instead of
     edge-to-edge** — `Layout.tsx`'s `<main>` only gave the Dashboard route
     the edge-to-edge `lg:pr-4 lg:py-3` treatment; every other route
     (including `/words`) got a centered `mx-auto max-w-6xl px-4 py-6` box
     layered on top of the 3-column grid inside it. Extended the
     edge-to-edge branch to `/words` too (not `/plan/notes` — not reported,
     and its 2-column layout has less need for it). Verified live: the
     grid's left edge now sits at exactly 84px (the Rail's own width) —
     the list column and its active-row highlight are genuinely flush
     against the sidebar.
  2. **Visible scrollbar on the word list** — added the
     `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` pattern to
     `Vocabulary.tsx`'s list scroll container (scoped to the word list
     only). Verified live: `scrollbar-width` computes to `none` on that
     element, still scrolls via `scrollTop`.
  3. **Word class shown three times for the same word** — confirmed three
     real, overlapping renders: the header chip (`fullArtLabel`), a raw
     `word.wortart` repeat on the meta line, and a leading `(Noun)`/`(Verb)`
     tag baked into `word.meaning` itself (e.g. "Apfel" was literally
     `"(Noun) apple"`). Dropped the meta-line repeat entirely (level/lesson
     only now); added a display-only `stripLeadingPosTag()` helper
     (`wordDisplay.ts`) that strips just the *leading* tag from meaning
     wherever it's shown (`WordDetailContent.tsx`, `Vocabulary.tsx`'s list
     rows) — a later, genuinely distinguishing tag on a multi-sense word
     (e.g. "auch": `"(Adverb) also...; (Interjection) in answering..."`)
     is left alone, since that's real information, not redundant. Doesn't
     touch the stored data or the vault round-trip.
  4. **Word-detail middle column was missing a grammar-rule callout and
     bilingual examples** — `DeclensionCard`/`ConjugationCard` are
     genuinely data-driven and mutually exclusive by design (a word is
     either a noun or a verb, never both), not a bug; `ConjugationCard`
     already *is* the present-tense grid the design spec asked for. Added
     the one real missing piece: a `GrammarCallout` card driven by the
     real (if modest) `Word.grammar` field, which existed in the schema
     but was never rendered anywhere — paired beside `DeclensionCard` in a
     two-up row, with `ReviewHistoryCard` similarly paired beside
     `ConjugationCard`. **Bilingual examples were real missing data, not
     fabricated**: the global `KaikkiEntry` enrichment table already had
     `exampleTranslation` with real English translations, but `Word` only
     ever copied across the German `example` — added `exampleTranslation`
     as a proper app-only column (schema migration
     `20260905035606_add_word_example_translation`, following the exact
     `declension`/`conjugation` precedent — never part of `CardFields`/the
     vault markdown format, threaded through `enrichResolved()`,
     `vaultSync.enrichIntoVault()`, and `routes/words.ts`'s write path),
     rendered under the German example in `WordDetailContent.tsx`, and
     backfilled onto 63 existing words via a new
     `npm run backfill:example-translation` script. Found and filtered a
     real data-quality artifact along the way: 178 `KaikkiEntry` rows had
     Wiktionary's own unfilled-template placeholder
     ("(please add an English translation of this quotation)") as their
     `exampleTranslation` — added `cleanExampleTranslation()`
     (`kaikki.ts`) so that placeholder is treated as no-translation
     everywhere it's read, not displayed as if it were real content.
     Verified live against a seeded word ("Haus") with full data: header
     shows a single "das" tag, DECLENSION and GRAMMAR cards render side by
     side, IN A SENTENCE shows both the German example and its English
     translation beneath it, REVIEW HISTORY still renders on its own.
  5. **Filter chips had no per-chip count** — `Vocabulary.tsx`'s
     all/der/die/das/verbs chips now show a live count computed from the
     already-loaded word list (e.g. "der (1)"), no new query. Verified
     live.
  6. **Notes column had no way to create a new note** — drag-and-drop
     (word → existing note) was already fully working; added a "+" button
     to `NotesDock.tsx`'s header that opens the same embedded
     `NoteEditorContent({id: "new", embedded: true})` flow the rest of the
     app already uses, in place of the note list. Verified live.
  7. **Syllabus had no way to reach Sources at `md` width** — real,
     confirmed gap (the page only ever had an `lg:hidden` mobile/md block
     and a separate `lg:`-only desktop block, no md-specific affordance).
     Added a small "syllabus"/"sources" segmented toggle, visible only at
     md (`hidden md:flex lg:hidden`), that swaps the content column to a
     Sources list reusing `SourceRow` from `Sources.tsx` — the same
     component lg's own 3rd column already renders. Verified live at
     768px.
  8. **Two reports investigated and found already correct — no code
     change made:**
     - *Plan/Roadmap "Week" tab "still shows the old flat pattern"*: the
       accordion rebuild from the 2026-09-04 pass is genuinely live —
       confirmed both in source (`git diff` against that commit was empty)
       and by actually toggling to Week view live, which showed the
       "kept"/"planned" collapsed-row wording, the "Today" tag, and the
       "Open in syllabus →" link exactly as designed. The reported
       behavior (a horizontal day-strip of pills, clicking a day swaps a
       flat single-column checklist below) maps exactly onto **Day
       view's** own `WeekStrip` component instead — most likely the two
       views got crossed while testing, or a stale cache/tab predated the
       09-04 fix.
     - *Sidebar "Sources" link shows Syllabus instead*: `Rail.tsx`'s
       Sources nav item correctly points to `/plan/sources`, which
       correctly routes to the real `Sources` component (confirmed
       already fixed in the 09-04 pass, zero remaining references to
       `SyllabusSourcesDesktop` in `Sources.tsx`). Live click-through
       confirmed the sidebar's Sources icon navigates to `/plan/sources`
       and renders the real Saved Links section. (The icon-only rail
       button has no visible text — only a `title` tooltip — which is
       likely why a first glance made it hard to tell apart from
       Syllabus's own icon before actually clicking it.)
- **2026-09-04, fourth bug-fixing pass** — the full backlog logged this
  session (Dashboard, Words, Plan, Syllabus, Notes, plus a full sm/md/lg
  breakpoint audit), cleared in one sitting. Verified live against a fresh
  demo account (Playwright + `/api/auth/demo-login`), not just typechecked —
  see specific verification notes per item below.
  1. **Shared root cause behind two "whole page scrolls instead of one
     column" reports (Words, Notes)** — `Layout.tsx`'s `<main>` only gave
     the Dashboard route a bounded `lg:h-dvh lg:min-h-[760px]` height; every
     other route got `mx-auto max-w-6xl px-4 py-6` with no height cap, so
     Words'/Notes' own correctly-written `overflow-y-auto` list columns had
     no bounded ancestor to actually overflow against. Extended the height
     bound to also cover `/words` and `/plan/notes`. Verified live: the
     Words list column's `scrollHeight` (1464px) genuinely exceeds its
     `clientHeight` (724px) and accepts `scrollTop` while `window.scrollY`
     stays 0.
  2. **Words desktop columns** — `Vocabulary.tsx`'s fixed
     `grid-cols-[300px_1fr_300px]` became
     `grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]` — verified live
     as exactly 253px/506px/253px (a true 1:2:1). Gender badges gained a
     per-article tinted background (`chipBg()` in `wordDisplay.ts`, reusing
     the already-defined-but-unused `--color-genus-*-bg` tokens) — verified
     live: der badge `rgba(145,132,217,.2)`, die badge `rgba(199,150,180,.19)`,
     non-genus words keep the neutral `rgba(233,233,237,.08)`.
  2. **Dashboard**: wired the decorative task checkbox to the real
     `api.toggleRoadmapTask` mutation (same one `Plan.tsx`/`TaskDetailDrawer`
     already use); made "Sources in play" rows navigate to `/plan/sources`;
     added the desktop header's missing streak badge; added a clock icon
     next to every "estimated time" display; replaced the bespoke
     boilerplate task-detail `BottomSheet` (hardcoded "if you skip → rolls
     into your backlog" for every task) with real syllabus context
     (`liveNextTask.syllabusItem`) looked up from the already-fetched full
     task list — no new import needed (an earlier attempt to reuse
     `TaskDetailDrawer` directly regressed the eagerly-bundled Dashboard
     chunk by ~30KB gzip regardless of `React.lazy`/manual dynamic import;
     reverted in favor of this lighter fix, verified back to baseline).
     Consolidated the **3-way streak mismatch** (`dashboard.ts`'s header
     badge secretly used a second, review-only hand-rolled streak algorithm
     while `learning.streak`/`progress.kpis.streak` used a different
     activity set entirely, excluding reviews) onto one
     `computeDayStreak(learningTimestamps)` call that now includes review
     activity everywhere it's used — verified live the header reads the
     same number after completing a task. Relabeled the 7-day widget
     "7-day activity" (it's a plain per-day minutes heatmap with no
     streak/gap logic, not a real streak). Fixed the real
     over-counting bug behind "465 minutes logged in a day": a demo
     account was found with **1439 minutes in a single day** (near 24h) —
     `useActivityHeartbeat.ts` pinged purely on tab visibility with zero
     idle detection, so a visible-but-abandoned tab clustered into one
     giant session. Added real input-activity tracking (mousemove/keydown/
     scroll/touchstart) with a 5-minute idle threshold, comfortably under
     `session.ts`'s 10-minute session-gap so an idle tab now reliably
     breaks the session. Historical `DailyActiveMinutes` rows are not
     retroactively corrected (real user data, left as-is). Verified "Writing
     52% vs 4%" was **not** a display/taxonomy bug as first suspected — the
     two screens were computing genuinely different metrics
     (`dashboard.ts`'s self-test *accuracy* vs. `roadmap.ts`'s roadmap-task
     *completion rate*, both mislabeled as the same "skill %"). Added the
     same accuracy-based `skillPerformance` (scoped to Stats' selected
     period) to the `learningProgress` endpoint and switched Stats'
     `SkillProgressGauges` to read it, so "weakest skill" now means the same
     thing on both screens. Confirmed the garbled "plesnte" display name is
     real, intentionally-entered account data (`User.name`, no seed script
     produces it) — not a rendering bug, no fix applied.
  3. **Plan page** — Day view's task-detail modal
     (`TaskDetailDrawer.tsx`) was two bespoke hand-rolled shells (a
     right-anchored slide-over at lg, a colored-blur centered card below
     lg), predating the `BottomSheet` primitive; rebuilt on `BottomSheet`
     (plain dark scrim, no blur, no duplicated focus-trap code). The
     duration dial (`DurationPicker`, already a real custom dial) is now
     shown directly instead of hidden behind a toggle-to-reveal step, with
     its save debounced (drag fires `onChange` continuously) instead of
     only committing on toggle-close. Week view: the "Week X of Y" and
     "late across the plan" tiles now sit side by side (`flex gap-3`,
     falling back to full-width when the late tile is absent); the
     planned/actual/days-left row became 3 separate icon-labeled,
     center-aligned tiles instead of one bare `grid-cols-3` of stacked
     text. Rebuilt `WeekOverview` into the literal handoff's vertical
     agenda calendar: today auto-expands (gradient card, gradient date
     chip, "Today" tag) with its full task list; every other day collapses
     to a one-line date-chip + summary row, tap-to-expand (accordion — only
     one day open at a time) — verified live by expanding a collapsed day
     with no console errors.
  4. **Syllabus** — `StationNode`'s "current" node now uses the spec's
     `linear-gradient(150deg,#a99dfa,#9184d9)` fill instead of flat
     `#9184d9`; node size adjusted from a uniform 28px to 26px (the spec's
     sm size; a literal sm/lg split wasn't attempted — a 2px cosmetic
     delta, and the connecting-line's `left:13` position actually centers
     more precisely under a 26px node than the old 28px one). The
     duplicate "In progress"/"you are here" tag was judged not worth adding
     since the existing "you are here" caption already conveys it.
  5. **Notes page** — the always-0 count badge read `data.notes.length`
     (real `Note` rows only); changed to `rows.length` (everything actually
     rendered, including Grammar Notebook/source-unit entries) — verified
     live showing "4 notes · 2 linked to words" on a seeded account. Bucket
     labels clarified ("my notes only" / "from syllabus & sources") — the
     underlying filter logic was already correct; the "nothing renders"
     report was a UX-labeling gap (being on the "mine" bucket, which by
     design excludes non-`Note` sources), not a data bug. Per-source badge
     colors (`SOURCE_BADGE`) added so a `Note` and a `Grammar Notebook`
     entry with similar content don't read as an accidental duplicate at a
     glance — confirmed the reported duplicate "wäre, hätte, würde,
     könnte" entry is two genuinely separate DB rows (one freeform `Note`,
     one `SyllabusItem`-scoped notebook entry) from two independent
     note-taking features, not a query/render bug to de-dup. Added a
     Read/Edit view-mode toggle (`MinimalTiptap`'s `editable` prop, wired
     through `editor.setEditable()` since Tiptap's option isn't reactive) —
     existing notes open in a calm read-only view by default, a new note
     opens straight into edit mode; not a full Obsidian clone, a scoped
     reading/editing split plus the toolbar hidden in read mode. The
     master-detail layout report ("editor not opening on the right") turned
     out to already be correct in code — item 1's height fix was the actual
     gap (the list's own scroll never engaged for the same reason as
     Words').
  6. **Breakpoint audit** — confirmed the app is genuinely a 2-layout
     system (`lg:` sidebar shell vs. an identical md/sm bottom-tab shell,
     no intermediate md-specific nav). Two real bugs fixed:
     **`/plan/sources` was functionally broken at `lg`** — it delegated to
     the same shared `SyllabusSourcesDesktop` component `/plan/syllabus`
     uses, whose 3rd column only ever reused `SourceRow`, never the
     `ActivityFeed`/`SavedLinksSection` that make Sources a real page — so
     both routes rendered pixel-identical screens and the Activity log +
     Saved Links were unreachable at desktop width. Gave `Sources.tsx` its
     own real 2-column `lg:` layout (list+filters+progress on the left,
     Activity + Saved Links on the right) instead of delegating — verified
     live both sections now render at 1440px. **`/plan/notes` had no
     reachable entry point at md/sm** — the only nav path was the
     `lg:`-gated sidebar, and the sm-only capture FAB only opens a blank
     new note, never the list. Added a "Notes" entry to `Plan.tsx`'s
     existing Syllabus/Tests CTA row, gated `lg:hidden` (revisiting a prior
     "redundant with its own rail tab" decision, since that reasoning only
     held at `lg`) — verified live at 768px, clicking it navigates to
     `/plan/notes`. Everything else the audit flagged (Today's
     desktop-only Chapter Progress/Sources-in-Play/Applications
     tile/7-day-streak widget, Words' inline 3-column split vs. md/sm's
     full-page detail) was confirmed intentional per the original Nocturne
     handoff's own mobile/desktop density difference — not bugs, no fix
     applied. The 3-way streak mismatch this audit re-surfaced is the same
     one fixed under Dashboard above.
- **2026-09-03, third bug-fixing pass** — 5 items, cleared in one sitting:
  1. **Dashboard desktop left column flush against the rail** —
     `Layout.tsx`'s `<main>` gives the dashboard route exactly
     `lg:pl-[84px]`, the rail's bare width with zero added breathing room
     (every other route gets extra clearance from its own
     `mx-auto max-w-6xl px-4`). Fixed by adding `lg:pl-4` to
     `Dashboard.tsx`'s own desktop wrapper, matching the `lg:pr-4` it
     already gets on the right — targeted to the dashboard route only,
     `Layout.tsx`'s shared rail clearance untouched for every other page.
  2. **Notes FAB (`CaptureFab.tsx`) now sm-only** — it had zero
     breakpoint-based visibility (only a `lg:bottom-[18px]` repositioning,
     not a hide), rendering at every width. Added `md:hidden`; verified
     live it's gone at 768px+ and still present/working at 375px.
  3. **Words page desktop columns — Dashboard-style grid, no dividers** —
     `Vocabulary.tsx`'s 3-column desktop layout was `flex` with zero gap,
     separated only by two hairline `border-r` dividers, unlike
     `Dashboard.tsx`'s own `grid-cols-[…]` + `gap-5` desktop layout with no
     borders at all. Converted to the same grid+gap pattern, removed both
     dividers. (The "remove the three dots" part of this ask was already
     done in the prior pass — confirmed live that `WordDetailContent.tsx`'s
     `DotsThree` button only ever renders in the mobile, non-embedded
     branch.)
  4. **Syllabus desktop — same grid/divider fix** —
     `SyllabusSourcesDesktop.tsx` had the exact same shape of gap as the
     Words page (`flex gap-0` + `border-r` hairlines instead of fixed
     column widths + spacing), flagged again via a fresh Claude Design
     comparison screenshot annotated "cramped and flat." Same fix: explicit
     `grid-cols-[340px_1fr_300px] gap-5`, dividers removed.
  5. **Notes — real `lg:` desktop list, master-detail instead of a modal**
     — the biggest item. The original ask wanted the note editor to open
     as a centered modal at md/lg (instead of its current full-page route)
     plus a new desktop Notes list (today `Notes.tsx`'s `lg:` block is just
     the mobile column re-centered in a bordered card, not a real desktop
     layout). Mid-planning, the user simplified this: at `lg`, open the
     editor *next to* the list instead of in a modal — avoids needing
     anything like React Router's background-location pattern (which would
     have touched every global call site that pushes to
     `/plan/notes/edit/*` — `CaptureFab.tsx`, `CommandPalette.tsx`,
     `SelfTestDone.tsx`). Built as master-detail instead, the same proven
     pattern `Vocabulary.tsx`/`WordDetailContent`'s `embedded` mode and
     `SyllabusSourcesDesktop.tsx` already use: `NoteEditor.tsx` split into
     an exported `NoteEditorContent({ id, embedded, onClose, onCreated })`
     (mirroring `WordDetailContent`'s shape, self-contained data fetching)
     plus a thin routed wrapper for sm/md, completely unchanged there; a
     new shared `NoteRow` component (avoids duplicating a fairly complex
     row template between the mobile and new desktop lists); `Notes.tsx`
     gained a real `hidden lg:flex` desktop block (list + detail column,
     `selectedNoteId` local state instead of navigation, following
     `Plan.tsx`'s two-separate-blocks convention) with the real existing
     filters (bucket + the real 9-skill chip row — the reference's literal
     "Grammar/Mistakes/Everyday" categories don't exist in the data model,
     so per an explicit user decision this reuses what's real instead of
     fabricating a category) and the accent-tinted card treatment for
     linked-to-word notes (real `note.wordId`, not new data). None of the
     4 global call sites needed to change — they still `push()` to the
     route, correct when the user isn't already on the Notes page.
     A real, order-of-operations bug was caught live and fixed: creating a
     note inline called `onCreated(id)` to move selection onto the new
     note immediately, but `invalidateQueries` doesn't resolve
     synchronously — the freshly-remounted detail pane's very first render
     found the new note not yet in the refetched list, and its
     `title`/`body` `useState` locked in `""` from that transient render
     (a lazy initializer only runs once per mount, so it never caught up
     once the list *did* refetch a moment later) — reproduced via a debug
     script that queried the API directly and confirmed the save itself
     was correct (title stored fine server-side) while the open editor
     showed it empty. Fixed by `await`-ing the invalidation before firing
     `onCreated`, so the remount's first render already has real data.
     Verified end-to-end live: select/switch/create/delete a note inline
     with no URL change at `lg`, sm/md's routed editor and all 4 global
     call sites unchanged, no console errors at 375/1440px.
- **2026-09-02, second bug-fixing pass** — the 4 items open after the first
  pass, cleared in one sitting:
  1. **Words page desktop 3-dot actions modal removed** —
     `client/src/pages/words/WordDetailContent.tsx`'s `embedded` header
     unconditionally rendered a `DotsThree` button opening a `BottomSheet`
     with flag/delete rows. Per an explicit user decision, flag-as-problem-
     word is dropped from desktop entirely (still on mobile's full action
     sheet, untouched); the dots button is replaced with a single icon-only
     delete button using a native `confirm()`, matching the established
     icon-only pattern already used in `NoteEditor.tsx`'s own delete button
     and `Sources.tsx`'s bare-icon remove row — no custom modal on desktop
     at all now.
  2. **Plan page rebuilt to match the reference layout** —
     `client/src/pages/plan/Plan.tsx`: merged the Day/Week toggle and the
     CTA row into one header row; per an explicit user decision, kept
     Syllabus + Tests (dropped Sources — redundant with Syllabus, same
     page — and Notes — redundant with its own rail tab; dropping Tests
     would have reintroduced a discoverability gap a prior fix deliberately
     closed); removed the standalone date-jump input (day-selection moved
     onto the strip itself instead); made `WeekStrip`'s cells real buttons
     wired to the already-fetched `roadmapDay(date)`/`selectedDate` state
     (previously only reachable via the removed date-input); added an
     overdue-day visual using the `status` field the strip already received
     but never rendered; moved the day-strip out of the 2-column desktop
     grid into its own full-width row above a new tasks/chapter-progress
     grid below it. Two real bugs surfaced by actually clicking through
     this live: `WeekStrip`'s `d.date` is a full UTC-midnight ISO string
     (not the plain `YYYY-MM-DD` `selectedDate`/`roadmapDay()` expect),
     which silently broke both the picked-day title and the day fetch until
     sliced; and "today" must be read from the server's own
     `status === "today"`, not a client-computed date-string match — the
     roadmap's notion of "today" (a seeded/demo account especially) doesn't
     necessarily track the browser's wall-clock date, and comparing against
     it originally mis-highlighted the wrong cell.
  3. **Command palette regrouped into Words / Jump to / Actions / Notes** —
     `client/src/components/CommandPalette.tsx`'s existing word/note search
     and quick-links were flattened into one undifferentiated list; now
     grouped under labeled sections, word rows got a genus/wortart chip
     (`chipLabel`/`chipColor`, reused from `Vocabulary.tsx`), and two new
     Actions rows ("Add as a new word" opens `AddWordsDialog` prefilled;
     "New note tagged ..." reuses `Note.contextTag`, the same mechanism
     `CaptureFab.tsx` already uses) were added. Per an explicit user
     decision, also built the fuller reference: a contextual "Syllabus —
     Chapter N" jump target (the top word match's themenfeld fuzzy-matched
     against the active level's stations via `bestMatchingStation`, reused
     from `Dashboard.tsx`'s identical week-theme pairing) wired into both
     `Syllabus.tsx` and the actual `lg:` rendering path,
     `SyllabusSourcesDesktop.tsx` (a separate component with its own
     station-selection state — missing this one initially meant the deep
     link silently landed on the wrong station at desktop widths); and a
     global "G then a letter" chord nav (`Layout.tsx`, new `QUICK_LINKS`
     registry in `lib/navDestinations.ts` shared by both the palette's
     legend and the listener), guarded to no-op while typing in any
     input/textarea/contenteditable so it can't hijack normal typing
     anywhere in the app. Two real bugs surfaced building this: the
     `hasResults` check didn't account for the Actions section (which
     always has content once there's a query), so an unmatched query
     showed "No matches" and silently hid the very actions meant to handle
     that case; and `AddWordsDialog`'s textarea used a static `autoFocus`
     prop, which fires at real DOM mount regardless of its `open` prop —
     harmless while it only backed the Words page's own always-mounted
     instance, but the palette now mounts it app-wide via `Layout.tsx`,
     which would have silently stolen page focus on every single page
     load; fixed by focusing via a ref inside the existing reset-on-open
     effect instead.
  4. **BottomSheet is a centered dialog at md/lg, slide-up sheet stays
     mobile-only** — `components/ui/BottomSheet.tsx` had no responsive
     branching at all. Rather than the rest of the app's usual "two
     separate `lg:hidden`/`hidden lg:flex` blocks" pattern for breakpoint
     differences, this needed one shared wrapper (a `useIsDesktop()`
     matchMedia hook) instead — BottomSheet's `children` often carry real
     caller state/refs (e.g. `AddWordsDialog`'s focus-on-open textarea),
     and rendering `children` twice would mount two independent copies
     fighting over the same ref. Centered variant: scale/fade instead of
     slide-up, full corner radius instead of top-only, a real `md:max-h-
     [85vh]` scroll boundary, and an explicit close `X` (the drag handle
     doesn't make sense centered, and several consumers like
     `WordFamilySheet` had no close control of their own besides the
     scrim). One real bug caught live: the closed-but-still-centered sheet
     needed an explicit `pointerEvents: "none"` — unlike mobile's off-
     screen slide (which naturally can't overlap anything while closed),
     the desktop variant stays in its centered position at `opacity: 0`,
     which would otherwise sit there invisible but still clickable-through,
     right on top of whatever's underneath. Verified against a short
     actions-style sheet (`ProfileSheet`), the form-heavy `AddWordsDialog`,
     and the list-content `WordFamilySheet`, at 375/820/1440px. Also fixed
     a real, unrelated bug surfaced by finally exercising `WordFamilySheet`
     live for the first time this session: its family-member rows keyed on
     `m.headword` alone, which isn't guaranteed unique — the DErivBase
     lookup can return the same headword twice within one tier — now keyed
     on `` `${m.headword}-${i}` ``.
- **2026-09-02, bug-fixing pass** — the full open backlog from this pass (7
  items) cleared in one sitting, now that all 20 Nocturne phases are shipped:
  1. **Dashboard congestion/clipping/uneven spacing** (reported with
     screenshots — positioning "congested and getting snipped from left
     side," inconsistent spacing between blocks) —
     `client/src/components/Layout.tsx`'s `<main>` and `Dashboard.tsx`'s
     mobile block both applied padding to the same edge (`main`'s
     `px-4 py-4` cancelled via `-mx-4 -my-4`, a fragile assumption baked
     into two files at once) — real risk of drift/clipping if either
     side's padding ever changed independently. Fixed by having
     `Dashboard` own 100% of its own edge padding at both breakpoints and
     giving it zero padding from `main` instead of fighting over the same
     box. Verified with live 375px/1440px screenshots — no clipping, no
     inconsistent gaps introduced.
  2. **Dashboard "Mastery ›" unclickable** (tab-bar occlusion) — same
     `Layout.tsx`/`Dashboard.tsx` pair. Root cause confirmed: the mobile
     block's `min-h-[calc(100dvh-40px)]` never subtracted the fixed tab
     bar's own `~88px + safe-area` reservation, so the `mt-auto`-pinned
     footer could land behind it. Fixed by extending the `min-h` calc to
     also subtract that reservation (Dashboard's "must not scroll" design
     requirement is preserved — no scrolling added, just corrected height
     math). Verified with a real Playwright click: 47px clearance from the
     tab bar, click succeeds and navigates to `/stats`.
  3. **Vocabulary/review dial number-label overlap**
     (`client/src/components/ReviewDial.tsx`) — reported as "still not
     perfect and getting overlapped with number & subtitle." The
     digit-count → font-size tier map was non-monotonic (3-digit counts
     rendered *larger* than 2-digit ones: 48px vs 40px), reproducing the
     overflow a prior fix targeted. Fixed with a correctly monotonic
     4-tier map (1/2/3/4+ digits) and tightened label-line margins for
     safety margin at every tier.
  4. **Note Editor mismatch vs. the Claude Design handoff**
     (`client/src/pages/plan/NoteEditor.tsx`,
     `client/src/components/notes/MinimalTiptap.tsx`) — diagnosed against
     `German Companion App.dc.html`'s `sNoteEdit` block: (a)
     `MinimalTiptap.tsx` still imported `lucide-react` icons, never
     reskinned — swapped to Phosphor; (b) the toolbar was split into two
     rows (MinimalTiptap's own row directly under the body, word count
     separately pinned at the bottom) instead of the handoff's single
     bottom row — split `MinimalTiptap` into a flush, toolbar-less editor
     plus a shared `MinimalTiptapToolbar` (icons + word count together),
     now rendered at the real bottom position below the tag row; the same
     toolbar change was threaded through `NoteComposer.tsx` and the older
     `components/notes/NoteEditor.tsx` (both also use `MinimalTiptap`) to
     avoid silently dropping bold/italic/list there; (c) the body's padded
     `bg-paper` card wrapper was stripped for the handoff's fully flush
     textarea; (d) the handoff's generic "+ Tag" chip is deliberately
     *not* built — `Note` has no freeform-tags field, only
     `skill`/`wordId`/`contextTag` — now documented in the file's own
     comment instead of silently missing.
  5. **Jobs' click-through detail view still pre-Nocturne** —
     `ApplicationDetailContent.tsx`/`ApplicationDetailSheet.tsx` still
     imported `lucide-react` icons (`Check`, `Trash2`, `ChevronLeft`,
     `MoreHorizontal`) and used a "📄" emoji in place of an icon; swapped to
     Phosphor (`Check`, `Trash`, `FileText`, `CaretLeft`, `DotsThree`).
     Turned out the *structural* gap was smaller than first scoped: these
     files already share `shared.tsx`'s `Field`/`inputCls`/`DebouncedInput`
     and the `Button` component with `NewApplicationModal.tsx` (the user's
     named design reference), and the app's semantic `bg-brand-*`/`ink-*`
     tokens already resolve to real Nocturne dark values app-wide since the
     token swap — so no new UI needed inventing, just the icon-library
     cleanup. Kept the centered `Modal` shell (matching the reference),
     not `BottomSheet`.
  6. **Desktop Jobs had no CV-management entry point** —
     `client/src/pages/job-search/CvShelfMobile.tsx` (already real,
     already Nocturne-styled, only rendered in the `lg:hidden` block) was
     not viewport-conditioned itself; renamed to `CvShelf.tsx` and
     rendered in both the mobile and desktop blocks of
     `job-search/index.tsx`. No new logic — straight reuse of the existing
     `AddCvModal` flow.
  7. **Review session had no desktop (`lg:`) layout** — the largest item.
     Per an explicit user decision, scaled the ultrawide 5-pane concept
     from `German Companion Desktop.dc.html` id="1c" down to a real 1440px
     `lg:` layout in `client/src/pages/review/ReviewSession.tsx`: a queue
     pane (`ReviewQueuePane.tsx`, real remaining-queue order + graded-so-far
     breakdown), the existing flip-card/grade-row logic reused as-is at a
     larger size, a dictionary-entry pane that's a straight reuse of
     `WordDetailContent`'s existing `embedded` mode (declension, review
     history, word family — zero new dictionary UI needed), and a notes
     pane (`ReviewNotesPane.tsx`, a `NoteComposer` pre-linked to the current
     word via a new `wordId` prop, plus that word's earlier notes). Also
     fixed a `Layout.tsx` bug surfaced while building this: transient
     routes (`/review`, `/exam-take`, `/plan/notes/edit/*`,
     `/plan/self-tests/run`) were still being capped at `<main>`'s
     `max-w-6xl`, contradicting the documented "transient screens own the
     full viewport" intent and blocking a true full-width desktop layout —
     fixed, which also required removing the now-stale `-mx-4 -my-4`
     escape hatch from `ExamRunner.tsx`, `SelfTestRunner.tsx`, `MCQ.tsx`,
     and `FillInBlank.tsx` (main now gives transient routes zero padding
     instead of `px-4 py-6`, so the old cancellation was over-subtracting).
     A `Layout.tsx` `lg:px-4`/`lg:pl-[84px]` tailwind-merge conflict (same
     class group, later one silently wins) was also caught and fixed during
     this pass — it briefly broke the Dashboard desktop layout's rail
     clearance. All of the above verified end-to-end with real Playwright
     runs: flip → grade → queue advances → dictionary pane updates → note
     created and linked → session-done screen, at both 375px and 1440px,
     no console errors.
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
