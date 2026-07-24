# Roadmap — the "Project Deutschland 2027" ecosystem

This document maps the long-term ecosystem vision (seven modules serving aspiring
immigrants and Ausbildung applicants to Germany) onto the current app, records the
architecture decisions where we deliberately diverge from the original planner, and
sketches the next features in enough detail to start implementation from.

## Ecosystem modules vs. current app

| # | Planner module | Status | What exists / what's missing |
|---|---|---|---|
| 1 | Deutsch Vault | **Mostly built** (V1) | Vocab manager with enrichment, pronunciation audio, grammar data, SM-2 spaced revision, Obsidian two-way sync, search. Missing: vocab PDF export, CLI. |
| 2 | Ausbildung Opportunity Tracker | **Missing** (discovery side) | We track applications *after* they're made (kanban + stats), plus on-demand notifications (stale applications, portal check reminders). Job *discovery* — listing search, filters by salary/German level, bookmarks — doesn't exist yet. Planned for V4. |
| 3 | Bureaucracy Companion | **Partially built** (V2) | Document checklist seeded with ~24 non-EU Ausbildung items, file attachments, expiry reminders. Missing: guided explanatory content per topic (moves into the knowledge base). |
| 4 | European Resume Builder | **Mostly built** (V2) | CV builder with live PDF preview, German Lebenslauf + ATS-friendly English templates, multiple CVs per account. Missing: Europass template, cover letters, automated ATS checks (V4). |
| 5 | Salary & Cost Planner | **Missing** | City comparison, taxes, rent, budget, savings projections. Carried forward from V3, not yet started. |
| 6 | Deutschland Dashboard | **Built** (V2/V3) | Dashboard shows documents needing attention, application stats, syllabus/roadmap progress, study streaks, badges, and activity history. Missing: certificates, GitHub activity (V4). |
| 7 | Germany Knowledge Base | **Missing** | Guides for visa, Anmeldung, blocked account, insurance, housing, FAQs. Carried forward from V3, not yet started; a community-wiki model with contributions is a possible later evolution. |

**V3 (Learning Progress Hub) shipped**: CEFR syllabus (174 items, A1→B1), a
generated day-by-day 182-day roadmap, study-source registry (YouTube/Nicos
Weg/Duolingo), self-test quizzes (163-question bank), weekly/monthly review
and Goethe-readiness rollups, gamification (points, 15 badges, streaks), and
session-based activity tracking. See the [README](../README.md#what-v3-adds)
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
  auth-checked streaming from the document checklist.
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

- ~~**V3** — Learning Progress Hub~~ ✅ shipped. Salary & cost planner and
  Germany knowledge base were originally scoped here too but didn't ship yet —
  carried forward, unscheduled.
- **V4** — Ausbildung opportunity discovery (search/filters/bookmarks feeding the
  kanban); cover letter assistant; Europass template; ATS checks;
  dashboard upgrades (certificates, GitHub activity).
- **V5** — vocab PDF export; vocabulary CLI; GitHub Actions CI; calendar
  integration; grammar micro-lessons.
