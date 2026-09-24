import type { RoadmapSkill } from "../api/types";

// Bento semantic map (handoff README §1.2 "Skill / task kind"): Vocab tomato · Grammar lilac · Listening sky ·
// Speaking pink · Writing mint · Reading orange · Self-test lemon · Jobs lemon. The three non-skill roadmap tags map
// onto the nearest kind: milestone tests are self-tests, bureaucracy ("Deutschland context") sits with Jobs, and
// reflection is neutral. Keep identical across pages.
export const SKILL_COLORS: Record<RoadmapSkill, string> = {
  vocab: "var(--tomato)",
  grammar: "var(--lilac)",
  listening: "var(--sky)",
  speaking: "var(--pink)",
  writing: "var(--mint)",
  reading: "var(--orange)",
  milestone: "var(--lemon)",
  bureaucracy: "var(--lemon)",
  reflection: "var(--plain2)",
};

export const SKILL_LABELS: Record<RoadmapSkill, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  grammar: "Grammar",
  vocab: "Vocab",
  bureaucracy: "Bureaucracy",
  milestone: "Milestone",
  reflection: "Reflection",
};

/** The 6 skills syllabus/quiz content is tagged with — excludes the 3
 * non-skill roadmap tags (bureaucracy/milestone/reflection). Shared order
 * for the segmented bar, activity rings, and radar chart. */
export const CORE_SKILLS: RoadmapSkill[] = ["grammar", "vocab", "listening", "speaking", "reading", "writing"];
