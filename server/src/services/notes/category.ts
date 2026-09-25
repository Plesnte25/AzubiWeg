import type { NoteCategory, RoadmapSkill } from "@prisma/client";

/** Context tags (navStack.tsx CONTEXT_TAGS) whose notes map to a category. */
const MISTAKE_CONTEXTS = new Set(["/Self-tests"]);
const JOB_CONTEXTS = new Set(["/Jobs"]);

/**
 * The Bento sticky-wall category a note starts in, derived from what's already known about it. Used for new notes
 * that don't pick one, and by the one-off migration for existing notes. Most specific signal first:
 *
 * 1. Mistakes: captured from the Self-test Done screen (the app's only mistake-context capture point).
 * 2. Jobs: captured on the Jobs page, or linked to an application.
 * 3. Grammar / Listening: from the note's skill.
 * 4. Everyday: everything else.
 *
 * `skill` stays on the note internally; the category is what the wall filters and colours by.
 */
export function initialNoteCategory(note: {
  skill: RoadmapSkill | null;
  contextTag: string | null;
  applicationId: string | null;
}): NoteCategory {
  if (note.contextTag && MISTAKE_CONTEXTS.has(note.contextTag)) return "mistakes";
  if (note.applicationId || (note.contextTag && JOB_CONTEXTS.has(note.contextTag))) return "jobs";
  if (note.skill === "grammar") return "grammar";
  if (note.skill === "listening") return "listening";
  return "everyday";
}
