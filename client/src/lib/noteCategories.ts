import type { NoteCategory } from "../api/types";

/** README §1.2 note-category map (Grammar lilac · Mistakes tomato · Everyday lemon · Jobs mint · Listening sky). */
export const NOTE_CATEGORIES: NoteCategory[] = ["grammar", "mistakes", "everyday", "jobs", "listening"];

export const NOTE_COLORS: Record<NoteCategory, string> = {
  grammar: "var(--lilac)",
  mistakes: "var(--tomato)",
  everyday: "var(--lemon)",
  jobs: "var(--mint)",
  listening: "var(--sky)",
};

export const NOTE_LABELS: Record<NoteCategory, string> = {
  grammar: "Grammar",
  mistakes: "Mistakes",
  everyday: "Everyday",
  jobs: "Jobs",
  listening: "Listening",
};
