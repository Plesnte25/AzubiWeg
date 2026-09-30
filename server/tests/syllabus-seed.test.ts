import { describe, expect, it } from "vitest";
import { DEFAULT_SYLLABUS_ITEMS, syllabusItemSeed } from "../src/services/learning/syllabus-defaults.js";

describe("syllabusItemSeed", () => {
  it("gives every authored topic a learn-practice-exercise workflow", () => {
    for (const item of DEFAULT_SYLLABUS_ITEMS) {
      const seeded = syllabusItemSeed(item);
      expect(seeded.learningOutcome).toBeTruthy();
      expect(seeded.resourceBody).toBeTruthy();
      expect(seeded.guidedPractice).toBeTruthy();
      expect(["free_text", "self_check", "multiple_choice", "correction", "listening_audio", "speaking_audio", "check_set"]).toContain(seeded.exerciseType);
      expect(seeded.exercisePrompt).toBeTruthy();
    }
  });

  it("provides structured metadata for authored representative topics", () => {
    // A1 topics are check sets now (#38); the single multiple-choice question this used to be is gone
    const checked = syllabusItemSeed(DEFAULT_SYLLABUS_ITEMS.find((item) => item.title === "sein & haben")!);
    expect(checked.exerciseType).toBe("check_set");
    expect((checked.exerciseOptions as { items: { accepted?: string[] }[] }).items[0]).toMatchObject({ kind: "cloze", accepted: ["bin"] });
    const multipleChoice = syllabusItemSeed(DEFAULT_SYLLABUS_ITEMS.find((item) => item.title === "Announcements & signs")!);
    expect(multipleChoice.exerciseType).toBe("multiple_choice");
    expect(syllabusItemSeed(DEFAULT_SYLLABUS_ITEMS.find((item) => item.title === "Introduce yourself fluently")!).exerciseType).toBe("speaking_audio");
    const listening = syllabusItemSeed(DEFAULT_SYLLABUS_ITEMS.find((item) => item.title === "Short everyday dialogues")!);
    expect(listening.exerciseType).toBe("listening_audio");
    expect(listening.listeningPrompt).toBe("Wer trifft wen, wo und wann?");
    expect(listening.resourceTranscript).toContain("Treffen wir uns um halb fünf");
  });
});
