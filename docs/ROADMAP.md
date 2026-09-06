# Roadmap — the "Project Deutschland 2027" ecosystem

This document maps the long-term ecosystem vision (seven modules serving aspiring
immigrants and Ausbildung applicants to Germany) onto the current app, records the
architecture decisions where we deliberately diverge from the original planner, and
sketches the next features in enough detail to start implementation from.

## Ecosystem modules vs. current app

| # | Planner module | Status | What exists / what's missing |
|---|---|---|---|
| 1 | Deutsch Vault | **Mostly built** (V1) | Vocab manager with enrichment, pronunciation audio, grammar data, SM-2 spaced revision, Obsidian two-way sync, search. Missing: vocab PDF export, CLI. |
| 2 | Ausbildung Opportunity Tracker | **Partially built** (V2) | We track applications *after* they're made (kanban + stats, merged into the Job Search page), plus portal quick-links with stale-check reminders and best-effort autofill from a pasted posting URL. Job *discovery* — listing search, filters by salary/German level, bookmarks — doesn't exist yet. Planned for V4. |
| 3 | Bureaucracy Companion | **Not yet built — long-run, deliberately deferred** | Guided explanatory content per topic for the Ausbildung visa/bureaucracy process. Needs a home in the current 5-tab nav before it can start. |
| 4 | European Resume Builder | **Built, simplified** (V2) | A CV is just a file you already have, uploaded and tagged, living on a shelf beside the application kanban — no in-app builder to keep in sync with a PDF export. Missing (if ever revisited): Europass template, cover letters, automated ATS checks (V4). |
| 5 | Salary & Cost Planner | **Missing — long-run, deliberately deferred** | City comparison, taxes, rent, budget, savings projections. Carried forward from V3, not yet started. |
| 6 | Deutschland Dashboard | **Built** (V2/V3), rebuilt again for Nocturne (Phase 7) | The Nocturne "Today" screen shows a review dial, day-strip stats (minutes/tasks/exam countdown), the next plan task, and a weakest-skill strip. Missing: certificates, GitHub activity (V4). |
| 7 | Germany Knowledge Base | **Missing — long-run, deliberately deferred** | Guides for visa, Anmeldung, blocked account, insurance, housing, FAQs. Carried forward from V3, not yet started; a community-wiki model with contributions is a possible later evolution. |

**V3 (Learning Progress Hub) shipped**: CEFR syllabus (174 items, A1→B1), a
generated day-by-day 182-day roadmap, study-source registry (YouTube/Nicos
Weg/Duolingo), self-test quizzes (163-question bank), weekly/monthly review
and Goethe-readiness rollups, and day-streaks with session-based activity
tracking. See the [README](../README.md#what-v3-adds)
for the user-facing feature list. What's left from the original V3 scope —
the salary & cost planner and the Germany knowledge base — carries forward
(see Phasing below).

## Architecture decisions (where we diverge from the planner)

The original planner proposed React + FastAPI + PostgreSQL/SQLite in a modular
monorepo. We keep the current architecture instead:

- **Express 5 + TypeScript + Prisma, not FastAPI** — the vault sync
  (byte-identical round-trip) and SRS parity logic are working, test-covered
  TypeScript; a Python rewrite discards that with no user-facing gain.
- **One integrated app, not a monorepo of separate apps** — one login, one
  dashboard, and shared data across features (the CV sent is linked to the
  application card; self-tests draw on the vocab table). Modules ship as tabs,
  not repos.
- **PostgreSQL only, no SQLite path** — the embedded-postgres dev option already
  covers the "run it without infrastructure" case SQLite would serve.
- **CI is a real gap** — GitHub Actions (server test suites + client
  typecheck/lint) is adopted from the planner, scheduled for V5 or earlier.

## V3 headline feature: Learning Progress Hub

A place to answer "how much of A1 have I actually finished, and what do I study
next?" across every source being used to learn German.

**Problem.** Learning happens across YouTube playlists, Nicos Weg, Duolingo, and
personal notes, but nothing aggregates progress per CEFR level or points at the
next thing to study.

**Concept.**

- **CEFR syllabus checklists** — a seeded syllabus of topics per level (A1 → B1:
  grammar points, vocab themes, skills). Checking items off drives a per-level
  "fill chart" (% complete, what's left, suggested next topic).
- **Study-source registry** — register the sources you learn from (YouTube
  playlist URL, Nicos Weg chapters, Duolingo units) and log progress against
  them. Progress is *self-logged*: Duolingo and DW have no official public APIs,
  so no scraping; YouTube playlist metadata (titles, item count) can be fetched
  to pre-populate a source's lesson list.
- **Notes upload** — attach study notes (PDF/images/markdown) to a source or a
  syllabus item, reusing the existing multer per-user upload storage and
  auth-checked streaming.
- **Self-tests** — quizzes generated from the existing vocab + SRS data (and
  later, syllabus-topic question banks) to verify a topic before marking it done.
- **Dashboard integration** — study-streak and level-progress tiles on the
  existing dashboard.

**Data model sketch.**

- `SyllabusItem` — level (A1…B1), topic, category (grammar/vocab/skill), order;
  per-user completion status + completion date.
- `StudySource` — type (youtube/nicos-weg/duolingo/other), title, URL, lesson
  count; per-lesson progress entries.
- `StudyNote` — file attachment (reuses upload storage), linked to a
  `StudySource` and/or `SyllabusItem`.
- `SelfTestResult` — syllabus item or level, score, timestamp (feeds streaks and
  "ready to mark complete" hints).

**UI.** A new "Learning" tab alongside Vocabulary/Review, plus dashboard widgets.

## Phasing

- **V3 — Learning Progress Hub** ✅ shipped.
- **The Nocturne redesign** ✅ shipped. A complete UI/UX rebuild against
  a Claude Design handoff: dark-only design system, new 5-tab + back-stack
  navigation, 3 new backend subsystems (kaikki.org/DErivBase enrichment
  pipeline, exam-gated CEFR progression, word-linked notes), and a real
  desktop (lg+) layout (sidebar + ⌘K palette shell, pixel-precise
  Dashboard/Words desktop layouts, every other screen centered in that
  shell). All 20 phases landed, including a full regression pass and
  dead-code cleanup. History at
  `~/.claude/plans/so-we-are-going-wondrous-axolotl.md` and
  [CLAUDE.md](../CLAUDE.md#the-nocturne-redesign-complete). A small bug
  backlog lives in `docs/KNOWN_ISSUES.md` and is being worked through.
- **Now** — cutting across strict version order to pull forward what
  matters most instead of shipping V4 then V5 in sequence:
  1. **App-wide bug-fixing pass** — top priority, ahead of any new feature
     work. Tracked in `docs/KNOWN_ISSUES.md`.
  2. Vocab PDF export + vocabulary CLI — the last piece of module 1 (Deutsch
     Vault)'s V1 scope.
  3. Dashboard upgrades — certificates, GitHub activity (pulled forward out of
     V4's scope below).
  4. The rest of V5 — GitHub Actions CI, calendar integration, grammar
     micro-lessons.

  No strict order between 1–4 — worked interleaved, not sequentially.
- **Long run, unscheduled** — deliberately deferred, not dropped:
  - The rest of V4: Ausbildung opportunity discovery (search/filters/bookmarks
    feeding the kanban), cover letter assistant, Europass CV template,
    automated ATS checks.
  - Salary & Cost Planner (module 5) — carried forward from V3.
  - Germany Knowledge Base (module 7) — carried forward from V3.
  - Bureaucracy Companion's guided explanatory content per topic (module 3) —
    needs a home in the current 5-tab nav before it can start.
