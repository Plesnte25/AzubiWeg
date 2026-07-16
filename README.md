# Deutschland Companion 🇩🇪

A platform for people preparing to move to Germany — built by someone doing exactly that.

I'm preparing for an Ausbildung in Germany: learning German, collecting documents,
tracking applications. This app solves the problems I hit along the way, starting
with the biggest one — vocabulary. **Version 1** is a German vocabulary manager with
spaced-repetition review that stays in **two-way sync with my existing Obsidian
vault**, so my phone capture workflow and Obsidian reviews keep working while the
web app adds search, statistics, and a proper review UI on top. **Version 2** adds
the application side of the journey: a German CV builder with live PDF preview, a
kanban application tracker, and a document checklist preloaded with everything the
Ausbildung visa process demands.

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

The vault's `Vocab/master.md` is the **source of truth**; the database is a
queryable mirror. The server:

- parses the flashcard format (`- **word** :: back` + `<!--SR:…-->` schedule
  comments) and **round-trips it byte-identically** (enforced by tests against a
  real vault snapshot);
- watches `master.md` with chokidar — edits made in Obsidian, by sync from the
  phone, or by the original `add_word.py` script appear in the app within seconds;
- watches `inbox.md` — words captured on iOS get enriched into full flashcards
  automatically, replicating the Python workflow;
- writes app-side changes (added words, edits, review grades) back into the same
  format, atomically, with hash-based echo suppression so its own writes don't
  trigger re-syncs;
- backs up `master.md` into `server/data/` the first time it links a vault.

Reviews done in the app and reviews done in Obsidian update the same
`<!--SR:!date,interval,ease-->` comments, so both schedulers stay in step.

## What V2 adds

- **CV builder** — a form with a **live PDF preview** beside it; the preview and
  the exported file come from the same `@react-pdf/renderer` components, so what
  you see is exactly what you download. Two templates: a classic tabular German
  **Lebenslauf** (photo, Persönliche Daten, Ort/Datum signature line) and an
  **ATS-friendly** single-column English CV that deliberately omits photo, birth
  data, and nationality. Multiple CVs per account for tailoring per Betrieb;
  debounced autosave; German-proof PDF rendering (embedded Inter, hyphenation
  disabled so compounds like „Krankenversicherung" don't get mangled).
  ![CV builder](docs/screenshots/11-cv-editor.png)
- **Application tracker** — drag-and-drop kanban (Wishlist → Applied → Interview →
  Offer / Rejected) with an auto-logged timeline per application (status changes,
  notes, interviews), the CV that was sent, and stats: response rate, interview
  rate, average days to response, applications per week.
  ![Applications](docs/screenshots/9-applications.png)
- **Document checklist** — seeded with ~24 items a non-EU Ausbildung applicant
  actually needs (Zeugnisse + apostille + certified translations, B1/B2
  certificate, §16a visa paperwork, VIDEX, Sperrkonto *or* salary proof,
  Anmeldung, Aufenthaltstitel, …), each with status, **file attachments** (PDF
  scans live with the item), and an expiry date that drives warning badges and a
  "documents needing attention" section on the dashboard.
  ![Checklist](docs/screenshots/8-checklist.png)

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Router, Vite |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma 7 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Vault sync | chokidar file watcher, custom markdown parser/writer |
| Enrichment | Wiktionary REST + MediaWiki APIs, ffmpeg, msedge-tts |
| PDF export | @react-pdf/renderer (client-side, lazy-loaded) |
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

The critical suites: byte-identical round-trip of a real `master.md` snapshot
(`tests/vault-roundtrip.test.ts`), SRS parity with real plugin output
(`tests/srs.test.ts`), and the V2 pure-logic suites — UTC-safe expiry math
(`reminders`), kanban move planning (`application-order`), tracker stats
(`application-stats`), CV content validation (`cv-schema`), and upload-name /
download-header safety (`file-storage`).

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full ecosystem plan and feature specs.

- ~~**V2** — CV builder (live preview, German/ATS templates, PDF export),
  application tracker (kanban + stats), document checklist with expiry reminders.~~ ✅
- **V3 — Learning Progress Hub + planning tools**
  - **Learning Progress Hub** — CEFR syllabus checklists (A1 → B1) showing per-level
    completion, what's left, and what to study next; a study-source registry
    (YouTube playlists, Nicos Weg chapters, Duolingo units); notes upload attached
    to sources/lessons; self-test quizzes built on the existing vocab + SRS data;
    study streak and level-progress tiles on the dashboard.
  - **Salary & cost planner** — city comparison, taxes, rent, monthly budget,
    savings projections.
  - **Germany knowledge base** — visa, Anmeldung, blocked account, insurance guides.
- **V4 — Applications, deeper**
  - **Ausbildung opportunity discovery** — job listing search and filters (salary,
    required German level), bookmarks that feed the existing kanban, notifications.
  - Cover letter assistant, Europass CV template, automated ATS checks.
  - Dashboard upgrades: certificates, milestones, GitHub activity.
- **V5 — Infrastructure & polish**
  - Vocab PDF export and a CLI for the vocabulary manager.
  - GitHub Actions CI (server test suites + client typecheck/lint on push).
  - Calendar integration, grammar micro-lessons.
