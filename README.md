# AzubiWeg 🇩🇪

A platform for people preparing to move to Germany — built by someone doing exactly that.

I'm preparing for an Ausbildung in Germany: learning German, collecting documents,
tracking applications. This app solves the problems I hit along the way. **V1** is
a German vocabulary manager with spaced-repetition review, kept in **two-way sync
with my Obsidian vault**. **V2** adds the application side: a Job Search page
(kanban application tracker + a CV shelf, with best-effort autofill from a pasted
posting URL) and a document checklist for the Ausbildung visa process. **V3** adds
a Learning Progress Hub — a CEFR syllabus, a day-by-day study roadmap, self-tests,
and gamification — feeding a richer dashboard.

![Dashboard](docs/screenshots/10-dashboard-v2.png)

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
  ![Review](docs/screenshots/6-review-revealed.png)
- **Obsidian vault sync** — the killer feature:
  ![Settings](docs/screenshots/7-settings.png)

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
  interviews), portal quick-links with stale-check reminders, and stats: response
  rate, interview rate, average days to response, applications per week.
  ![Job Search](docs/screenshots/9-job-search.png)
- **Document checklist** — seeded with ~24 items a non-EU Ausbildung applicant
  actually needs (Zeugnisse + apostille + certified translations, B1/B2
  certificate, §16a visa paperwork, VIDEX, Sperrkonto *or* salary proof,
  Anmeldung, Aufenthaltstitel, …). Search, an "Up Next" panel surfacing the
  nearest deadlines across every category, and category filter tiles with live
  completion rings — urgency leads, categories filter the list rather than
  containing it. Each item carries status, **file attachments**, and a deadline
  badge that drives a "documents needing attention" section on the dashboard.
  ![Checklist](docs/screenshots/8-checklist.png)

## What V3 adds

- **CEFR syllabus** — 174 seeded topics (grammar/vocab/skill) across A1, A2, and
  B1. Checking items off drives per-level completion percentage and "what's
  next" suggestions.
- **Day-by-day roadmap** — a 182-day (26-week) study plan to Goethe-exam
  readiness, generated live from syllabus progress, with a calendar view and
  overdue backlog.
- **Study-source registry** — register YouTube playlists, Nicos Weg chapters,
  or Duolingo units and self-log progress, since none of these platforms
  expose a progress API.
- **Self-tests & Goethe readiness** — a 163-question bank built from syllabus
  topics and vocab/SRS data, with weekly/monthly readiness rollups.
- **Gamification & activity tracking** — points, 15 badges, and day-streaks
  computed from real activity, feeding the dashboard's activity history.
- **Notifications & portals** — on-demand reminders (stale applications,
  expiring documents) and quick-link bookmarks to platforms like GoAusbildung,
  since none of them offer account sync or public APIs.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Router, Vite |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma 7 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Vault sync | chokidar file watcher, custom markdown parser/writer |
| Enrichment | Wiktionary REST + MediaWiki APIs, ffmpeg, msedge-tts |
| Kanban | @dnd-kit |
| Uploads | multer → per-user disk storage, auth-checked streaming |

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
the Obsidian plugin, and pure-logic suites for applications, checklist
reminders, and the Learning Hub (roadmap generation, quizzes, gamification,
activity tracking).

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
  self-tests, gamification, activity tracking.
- **Now** (reprioritized 2026-08-05, cutting across strict version order —
  see [docs/ROADMAP.md](docs/ROADMAP.md#phasing) for the full breakdown):
  app-wide bug-fixing pass (**top priority**), vocab PDF export + CLI (the
  last of V1's scope), dashboard upgrades (certificates, GitHub activity,
  pulled forward from V4), and the rest of V5 (GitHub Actions CI, calendar
  integration, grammar micro-lessons). Worked interleaved, no strict order.
- **Long run, unscheduled** — deliberately deferred, not dropped: the rest of
  V4 (Ausbildung opportunity discovery, cover letter assistant, Europass CV
  template, ATS checks), the **salary & cost planner**, the **Germany
  knowledge base**, and the bureaucracy checklist's guided explanatory
  content.
