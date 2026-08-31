# AzubiWeg 🇩🇪

A platform for people preparing to move to Germany — built by someone doing exactly that.

I'm preparing for an Ausbildung in Germany: learning German, collecting documents,
tracking applications. This app solves the problems I hit along the way. **V1** is
a German vocabulary manager with spaced-repetition review, kept in **two-way sync
with my Obsidian vault**. **V2** adds the application side: a Job Search page
(kanban application tracker + a CV shelf, with best-effort autofill from a pasted
posting URL). **V3** adds a Learning Progress Hub — a CEFR syllabus, a day-by-day
study roadmap, exam-gated level progression, and self-tests — feeding a richer
dashboard.

> **Mid-rebuild**: the whole UI is being reworked against a dark-only design
> system ("Nocturne") with a new 5-tab navigation model — see
> [CLAUDE.md](CLAUDE.md#the-nocturne-redesign-in-progress) for status. The
> screenshots below are from the previous design and are queued for a refresh;
> the feature descriptions in this README stay current either way.

## What V1 does

- **Accounts** — email + password, JWT sessions.
- **Vocabulary manager** — search, filter by lesson, expand for full detail
  (meaning, IPA, grammar, example, pronunciation audio).
  ![Vocabulary](docs/screenshots/3-vocabulary.png)
- **Automatic enrichment** — type `Zug, Bahnhof, fahren` and the backend fetches
  meaning (en.wiktionary), IPA + gender/plural/verb forms + an example sentence
  (de.wiktionary wikitext), and pronunciation audio (Wikimedia Commons recording,
  converted to MP3 with ffmpeg; free Microsoft Edge neural TTS as fallback).
- **Daily revision** — SM-2 spaced repetition, byte-compatible with the
  [Obsidian Spaced Repetition plugin](https://github.com/st3v3nmw/obsidian-spaced-repetition)'s
  scheduling (verified against real plugin output).
- **Obsidian vault sync** — the killer feature.

### How the vault sync works

The vault's `Vocab/master.md` is the **source of truth**. The app watches it (and
`inbox.md`, for words captured on iOS) and mirrors changes into Postgres within
seconds, then writes its own edits — added words, reviews, grades — back into the
exact same flashcard format, **byte-identical** (verified against a real vault
snapshot). Reviews done in the app and in Obsidian update the same
`<!--SR:!date,interval,ease-->` comments, so both schedulers stay in step.

## What V2 adds

- **Job Search** — a kanban application tracker (Wishlist → Applied → Interview →
  Offer / Rejected) with a permanent CV shelf beside it, so "which CV did I send
  where" never needs a second page. A CV here is just a file you already have
  (PDF/Word, tagged Lebenslauf or ATS) — no in-app builder to keep in sync with a
  PDF export; there used to be one (a form + live `@react-pdf/renderer` preview),
  retired in favor of this simpler, less-brittle model. New applications can be
  created from a pasted job-posting URL: a server-side fetch reads the page's
  `JobPosting` structured data (or falls back to its title/meta tags) to
  best-effort prefill company/role/location/portal — always editable, never
  required. Auto-logged timeline per application (status changes, notes,
  interviews), portal quick-links to platforms like GoAusbildung with
  stale-check reminders (since none of them offer account sync or public
  APIs), and stats: response rate, interview rate, average days to response,
  applications per week.

(A document checklist for the Ausbildung visa process shipped in V2 and was
later removed in favor of the Learning Hub's roadmap absorbing that content;
an in-app notifications engine was also removed — see
[docs/ROADMAP.md](docs/ROADMAP.md) for what replaced them, if anything has.)

## What V3 adds

- **CEFR syllabus** — 174 seeded topics (grammar/vocab/skill) across A1, A2, and
  B1. Checking items off drives per-level completion percentage and "what's
  next" suggestions.
  ![Syllabus](docs/screenshots/13-syllabus.png)
- **Exam-gated level progression** — sequential CEFR unlocking: a dedicated,
  separately-authored exam question bank (distinct from the practice-quiz
  bank below) gates each level, with a real pass-threshold/time-limit/
  attempt-rate-limit engine (`server/src/services/learning/exam.ts`) rather
  than letting levels unlock freely.
- **Day-by-day roadmap** — a 182-day (26-week) study plan to Goethe-exam
  readiness, generated live from syllabus progress, with a calendar view and
  overdue backlog.
- **Study-source registry** — register YouTube playlists, Nicos Weg chapters,
  or Duolingo units and self-log progress, since none of these platforms
  expose a progress API.
- **Self-tests & Goethe readiness** — a 163-question practice bank built from
  syllabus topics and vocab/SRS data, with weekly/monthly readiness rollups.
- **Word family** — related-word lookups from
  [DErivBase](https://www.ims.uni-stuttgart.de/forschung/ressourcen/lexika/derivbase/),
  tiered by relatedness score (closely related vs. same family but a
  stretch) and cross-referenced against your own tracked vocab.
- **Word-linked notes** — freeform notes can attach to a specific vocab word
  (surfaced on that word's detail view) in addition to a syllabus topic or
  roadmap task.
- **Activity tracking** — day-streaks and study-time history computed from
  real activity, feeding the dashboard's activity chart.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Router, Vite |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma 7 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Vault sync | chokidar file watcher, custom markdown parser/writer |
| Enrichment | kaikki.org (German Wiktionary dump) + DErivBase, ffmpeg, msedge-tts |
| Kanban | @dnd-kit |
| Uploads | multer → per-user disk storage, auth-checked streaming |

## Data sources

Vocabulary enrichment (meanings, examples, IPA, declension/conjugation
tables, audio) is imported once from
[kaikki.org](https://kaikki.org/dictionary/German/)'s German Wiktionary
dump (`server/scripts/import-kaikki.ts`) rather than scraped live per word —
see Tatu Ylonen, "Wiktextract: Wiktionary as Machine-Readable Structured
Data," *Proceedings of the 13th Conference on Language Resources and
Evaluation (LREC)*, pp. 1317–1325, Marseille, 2022.

Word-family relations come from
[DErivBase](https://www.ims.uni-stuttgart.de/forschung/ressourcen/lexika/derivbase/)
v2.0 (Institute for Natural Language Processing, University of Stuttgart),
licensed CC BY-SA 3.0 (`server/scripts/import-derivbase.ts`).

## Running it

```bash
# 1. Database — either:
docker compose up -d               # standard Postgres in Docker, or
cd server && npm run db:start      # no Docker/root needed (embedded-postgres)

# 2. Server
cd server
npm install
cp .env.example .env               # set JWT_SECRET
npx prisma migrate dev
npm run dev                        # http://localhost:3000

# 3. Client
cd client
npm install
npm run dev                        # http://localhost:5173 (proxies /api)
```

Then register, and (optionally) link your Obsidian vault under **Settings** —
point it at the vault root, the folder containing `Vocab/master.md`.

## Tests

```bash
cd server && npm test
```

Covers the vault sync's byte-identical round-trip, SRS scheduling parity with
the Obsidian plugin, the kaikki.org enrichment pipeline's word resolution,
and pure-logic suites for applications and the Learning Hub (roadmap
generation, exam gating, quizzes, activity tracking). Server-side only — no
dedicated client test runner; UI changes are verified by driving the app in
a real browser (see [CLAUDE.md](CLAUDE.md#testing-conventions)).

## Deployment

Self-hostable on a free-tier VPS — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
for the full runbook (GCP e2-micro, Caddy + auto-TLS, DuckDNS DNS with an
`eu.org` application pending, and bridging the Obsidian vault sync over
OneDrive/rclone when the app isn't on the same machine as the vault).

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full ecosystem plan and feature specs.

- ~~**V2** — CV builder (live preview, German/ATS templates, PDF export),
  application tracker (kanban + stats), document checklist with expiry
  reminders.~~ ✅ (2026-07-31: CV builder retired in favor of plain file
  uploads; CV + application tracking merged into one **Job Search** page with
  best-effort autofill from a pasted posting URL; checklist redesigned around
  search, an urgency-first "Up Next" panel, and category filters.)
- ~~**V3 — Learning Progress Hub**~~ ✅ CEFR syllabus, day-by-day roadmap,
  self-tests, activity tracking. (2026-08-08: gamification — points, badges —
  removed in favor of the plain activity/streak tracking above; the document
  checklist and an in-app notifications engine were also removed around the
  same time.)
- **Now — the Nocturne redesign**: a complete UI/UX rebuild against a
  dark-only design system and a new 5-tab navigation model, superseding the
  app-wide-bug-fixing-pass priority below (reprioritized once the redesign
  was scoped). Full 20-phase plan and current status in
  [CLAUDE.md](CLAUDE.md#the-nocturne-redesign-in-progress). Landed so far:
  the checklist/notifications removal, the kaikki.org/DErivBase enrichment
  pipeline swap, exam-gating, the new nav shell, and the Today/Words/Word
  Detail/Review-session screens; Plan, Jobs, Stats, Notes, Self-tests,
  Settings, and desktop layouts are still on the pre-Nocturne design.
- **After that** — the pre-redesign priority list, picked back up once
  Nocturne ships: an app-wide bug-fixing pass (first tranche already landed
  2026-08-27: a unified type/elevation/motion design system, kanban keyboard
  accessibility, ARIA/chart accessibility fixes, consistent "Show more"
  pagination), vocab PDF export + CLI (the last of V1's scope), dashboard
  upgrades (certificates, GitHub activity, pulled forward from V4), and the
  rest of V5 (GitHub Actions CI, calendar integration, grammar
  micro-lessons).
- **Long run, unscheduled** — deliberately deferred, not dropped: the rest of
  V4 (Ausbildung opportunity discovery, cover letter assistant, Europass CV
  template, ATS checks), the **salary & cost planner**, the **Germany
  knowledge base**, and guided explanatory content for the bureaucracy
  process (the checklist that would have hosted it is gone; this would need
  a new home).
