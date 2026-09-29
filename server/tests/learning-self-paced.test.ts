import { describe, expect, it } from "vitest";
import { planSelfPacedCleanup, type CleanupTask } from "../src/services/learning/self-paced.js";

const task = (id: string, over: Partial<CleanupTask> = {}): CleanupTask => ({
  id,
  title: "Reading: Hallo",
  syllabusItemId: null,
  completedAt: null,
  droppedAt: null,
  timerSeconds: 0,
  minutesSpent: null,
  journalEntry: null,
  fileCount: 0,
  noteCount: 0,
  ...over,
});
const skeleton = new Set(["Reading: Hallo", "Grammar consolidation"]);

describe("planSelfPacedCleanup", () => {
  it("keeps history and the user's own tasks, deletes untouched generated ones", () => {
    const plan = planSelfPacedCleanup(
      [
        task("done", { completedAt: new Date(), syllabusItemId: "s1" }),
        task("timed", { timerSeconds: 90 }),
        task("minutes", { minutesSpent: 5 }),
        task("journal", { journalEntry: "war gut" }),
        task("file", { fileCount: 1 }),
        task("note", { noteCount: 1 }),
        task("mine", { title: "Rehearse: Ich bin motiviert" }),
        task("generated"),
        task("filler", { title: "Grammar consolidation" }),
        task("topic", { title: "Grammar: Dativ", syllabusItemId: "s2" }),
        task("orphan", { title: "Listening: an old version's topic" }),
      ],
      skeleton,
    );
    expect(plan.keep).toEqual([
      { id: "done", reason: "completed" },
      { id: "timed", reason: "worked on" },
      { id: "minutes", reason: "worked on" },
      { id: "journal", reason: "worked on" },
      { id: "file", reason: "worked on" },
      { id: "note", reason: "worked on" },
      { id: "mine", reason: "manual" },
    ]);
    expect(plan.delete).toEqual(["generated", "filler", "topic", "orphan"]);
  });

  it("deletes a dropped manual task with no history, keeps a blank journal as nothing", () => {
    const plan = planSelfPacedCleanup([task("dropped", { title: "Mine", droppedAt: new Date() }), task("blank", { journalEntry: "  " })], skeleton);
    expect(plan.keep).toEqual([]);
    expect(plan.delete).toEqual(["dropped", "blank"]);
  });
});
