# Session report — Mastery Syllabus build (2026-09-19)

This document summarizes everything planned and executed in this session,
from initial diagnosis through the mastery-based learning workflow build to
the final regression fix and deployment pass. It exists as a durable record
alongside the code changes themselves.

## 1. Starting point and goal

The session began with a request to review a shared plan
(`https://github.com/copilot/share/0819512e-42c4-8cd1-a012-f24440c52175`) and
decide whether it needed changes before implementation. The user's overall
goal: turn AzubiWeg's existing CEFR syllabus/roadmap from a basic checklist
into a **mastery-based, evidence-driven learning workflow** — one where
students study, practice, and prove understanding *inside the app*, without
hopping to external sites, and where later topics can't be scheduled before
earlier prerequisites are genuinely passed.

Non-negotiable constraints carried through every phase:
- Never lose existing learner progress, notes, or files during reseeding.
- Flexible study windows (5/20/45/90/180/330 min), not rigid timers.
- Completion driven by evidence and understanding, not just checking a box.
- Morning revision + daily journaling as first-class flow, not afterthoughts.
- No claiming capabilities the app doesn't actually have (e.g. pronunciation
  scoring) — feedback must be honest about what is and isn't verified.

## 2. Vocabulary vault tightening (pre-syllabus work)

Before the syllabus rebuild, the German vocabulary vault was audited and
hardened:
- Removed stale/low-quality metadata and invalid example content.
- Added parser/writer sanitization so stale metadata can't re-enter the vault.
- Added safe example repair logic and a backfill mechanism.
- Fixed six enrichment-pipeline bugs surfaced by a re-enrichment incident
  (inflected-form divergence, TOCTOU race in no-vault protection, stale
  dashboard/weak-word counts, curator-only annotation leakage, and related
  fixes) — see the `git log` history for the individual fix commits.

## 3. Mastery syllabus workflow — phase-by-phase build

Eighteen implementation phases were planned and executed as tracked todos
(see `todos` table in the session database). In order:

1. **Adaptive daily planner** — persisted study-capacity minutes, a morning
   revision queue, a core queue, and an optional acceleration queue, layered
   onto the existing roadmap without breaking it.
2. **Daily journal and reflection** — one journal entry per learner per study
   date (`learned` / `difficult` / `nextStep`), with read/write roadmap
   endpoints and a Plan UI card.
3. **Syllabus mastery and review scheduling** — persisted mastery state
   (`not_started` → `learning` → `passed` → `mastered`) and review-due dates,
   with review intervals of 1/3/7/14/30 days on successful attempts.
4. **Mistake taxonomy and remediation** — categorized exercise mistakes
   (gender/article, case, word order, conjugation, vocabulary, spelling,
   pronunciation, listening detail, collocation, other), surfaced as a weak-
   areas summary and a learner-facing category picker in the workspace.
5. **Prerequisite-safe adaptive planning** — later topics in the same CEFR
   level can no longer be scheduled ahead of earlier, unpassed prerequisites;
   blocked-task messaging added to the UI.
6. **Structured exercise types** — multiple-choice and correction exercises
   with server-side validation, alongside the existing free-text exercise.
7. **Listening/speaking audio evidence** — `listening_audio` and
   `speaking_audio` exercise types with evidence metadata, without disturbing
   existing text/multiple-choice flows.
8. **Writing rubric evidence** — writing exercises now require a written
   submission plus a three-part learner self-assessment (task fulfilled,
   grammar checked, understandable).
9. **Authored curriculum content** — representative, pedagogically real A1
   topics (e.g. "sein & haben," accusative articles, short messages and
   postcards) with matching exercise metadata, safe defaults elsewhere.
10. **Performance-aware review scheduling** — review intervals now adapt to
    recent pass/fail performance instead of a fixed schedule alone.
11. **Guided listening playback** — first-party listening source metadata
    plus an in-app audio player, so listening tasks stay inside the app.
12. **Curated listening content** — transcript and comprehension-prompt
    metadata for authored listening topics, exposed in the workspace.
13. **In-app spoken listening fallback** — browser speech synthesis as an
    explicit fallback when no curated/generated audio file exists yet.
14. **Syllabus workspace UX refinement** — reorganized the topic workspace
    into outcome → study → practice → exercise, with clearer badges and less
    clutter.
15. **Expanded listening curriculum** — additional authored A1–B1 listening
    anchors with transcripts and comprehension evidence.
16. **Cached syllabus audio delivery** — hash-cached, protected MP3 generation
    for transcript-backed lessons, replacing the speech-only fallback with
    real generated audio where available.
17. **Speaking evidence feedback** — honest, evidence-based post-recording
    feedback (presence/duration/self-check) instead of unsupported
    pronunciation scoring claims.

Each phase included server-side logic changes, Prisma schema/migration
updates where needed, and corresponding client UI work, and each was
validated against the existing server test suite before being marked done.

## 4. Regression fix pass

After the phased build, the app was re-audited end-to-end for issues
introduced along the way:

- **Duplicate React root creation** — `client/src/main.tsx` now guards
  against calling `createRoot()` twice on the same DOM container (was
  surfacing as a console error and unstable dev-reload behavior).
- **Speaking recording review gap** — `AudioRecorder.tsx` previously uploaded
  a recording with no way to hear it back before submitting. It now keeps a
  local object-URL preview of the just-recorded clip and renders an in-app
  `<audio>` player for review, with proper cleanup on unmount/error.
- **Health check hardening** — `server/src/index.ts`'s `/api/health` route
  now performs a real `SELECT 1` against the database and reports connection
  status/uptime, instead of an unconditional `{ ok: true }`, making it useful
  for real deployment monitoring.

Validation performed after every change:
- `cd server && npm test` → 391/391 tests passing across 30 test files.
- `cd client && npm run build` → TypeScript build + Vite production build
  succeeded.

## 5. Deployment pass

- Confirmed the app runs correctly end-to-end locally: client on
  `http://localhost:5173`, server on `http://localhost:3000`.
- Verified `/api/health` reports `{"ok":true,"database":"connected",...}`.
- Reviewed the existing production deployment runbook
  ([docs/DEPLOYMENT.md](./DEPLOYMENT.md)) and deploy tooling
  ([deploy/deploy.sh](../deploy/deploy.sh),
  [deploy/docker-compose.yml](../deploy/docker-compose.yml),
  [deploy/Caddyfile](../deploy/Caddyfile)) — no changes were needed there;
  the existing Oracle Cloud VPS + Caddy + systemd runbook still applies.
- Actual push to a live public host was **not** performed in this session —
  that requires host credentials/domain access this environment does not
  have. The app is fully prepared and tested for that manual redeploy step
  (`deploy/deploy.sh` against the target VPS).

## 6. What remains (tracked as follow-up, not blocking)

These are product-expansion items, not defects:
- Real curated (professionally recorded) listening audio beyond generated/
  cached TTS and browser fallback.
- Broader CEFR content depth beyond the current A1–B1 focus (toward A1–C2).
- Deeper speaking analytics/playback UX beyond current evidence-based
  self-review.
- Mastery-trend and level-readiness analytics beyond current progress views.
- Stronger deadline/feasibility planning tied to exam target dates.
- The actual production launch to a public host (runbook ready, not run).

## 7. Files touched this session

Representative list (see `git diff --stat` for the exact set at commit time):
- `server/src/prisma/schema.prisma` + 10 new migrations under
  `server/src/prisma/migrations/`
- `server/src/routes/learning.ts`, `server/src/routes/roadmap.ts`
- `server/src/services/learning/syllabus-defaults.ts`,
  `syllabus-seed.ts`, `mastery.ts`, `mistakes.ts`, `prerequisites.ts`,
  `daily-plan.ts`, `listening-audio.ts`
- `server/src/services/enrichment/audio.ts`
- `server/src/index.ts`
- `server/tests/learning-roadmap-generator.test.ts`,
  `server/tests/daily-plan.test.ts`
- `client/src/main.tsx`
- `client/src/api/client.ts`, `client/src/api/types.ts`
- `client/src/components/AudioRecorder.tsx`
- `client/src/pages/plan/Plan.tsx`, `Syllabus.tsx`,
  `StationDetailModal.tsx`
