import type { RoadmapSkill, RoadmapTaskType } from "@prisma/client";

export interface DefaultRoadmapTask {
  type: RoadmapTaskType;
  skill?: RoadmapSkill;
  title: string;
  description?: string;
  // set only for grammar/vocab tasks generated from a live SyllabusItem (see
  // roadmap-generator.ts) — undefined for every hand-authored task below
  syllabusItemId?: string;
  completedAt?: Date | null;
}

export interface DefaultRoadmapDay {
  dayOffset: number;
  theme: string;
  tasks: DefaultRoadmapTask[];
}

/**
 * Bump when DEFAULT_ROADMAP_DAYS changes shape or content. Users on an older
 * version get reseeded on their next roadmap load; completions are preserved
 * by (dayOffset, normalized title) match for hand-authored tasks — dates are
 * never re-derived from anything but the user's own roadmapStartedAt, so a
 * reseed can't shift them.
 *
 * dayOffset is the stable identity. Only append/edit in place — reordering
 * weeks would detach completion history from dates for affected days, the
 * same risk SYLLABUS_VERSION documents for (level, title) matching.
 *
 * v2: tagged every task with `skill` (powers the journal views), relabeled
 * "Ausbildung prep" tasks to "Deutschland Context" and added two more
 * (weeks 2 and 5).
 *
 * v3: Monday/Tuesday (grammar) and Wednesday (vocab) of every regular week
 * are no longer hand-authored here — their content is generated at read time
 * from the user's live syllabus (see roadmap-generator.ts's
 * buildUserRoadmapPlan, which merges DEFAULT_ROADMAP_DAYS's Thu-Sun content
 * with generated Mon/Tue/Wed tasks). Any SYLLABUS_VERSION bump must ship
 * with a paired bump here, since that generated content depends on it.
 */
export const ROADMAP_VERSION = 3;

interface RegularWeek {
  theme: string;
  listening: { title: string; description?: string; studySource?: boolean; reading?: boolean };
  speaking: string;
  writing: string;
  bureaucracy?: { title: string; description: string };
}

interface MilestoneWeek {
  theme: string;
  reviewTopics: string[];
  milestone: { title: string; description: string };
}

/** Mon/Tue grammar + Wed vocab are placeholders here — generated at read
 * time from the live syllabus (see roadmap-generator.ts). Thu listening/
 * reading, Fri speaking (+ optional Deutschland-Context task), Sat writing +
 * vocab review, Sun rest stay hand-authored. */
function buildRegularWeek(weekNumber: number, w: RegularWeek): DefaultRoadmapDay[] {
  const base = (weekNumber - 1) * 7;
  const fri: DefaultRoadmapTask[] = [{ type: "generic", skill: "speaking", title: `Speaking: ${w.speaking}` }];
  if (w.bureaucracy) {
    fri.push({
      type: "generic",
      skill: "bureaucracy",
      title: `Deutschland Context: ${w.bureaucracy.title}`,
      description: w.bureaucracy.description,
    });
  }
  return [
    { dayOffset: base + 0, theme: w.theme, tasks: [] }, // Monday: grammar (generated)
    { dayOffset: base + 1, theme: w.theme, tasks: [] }, // Tuesday: grammar (generated)
    { dayOffset: base + 2, theme: w.theme, tasks: [] }, // Wednesday: vocab (generated)
    {
      dayOffset: base + 3,
      theme: w.theme,
      tasks: [
        {
          type: w.listening.studySource ? "study_source" : "generic",
          skill: w.listening.reading ? "reading" : "listening",
          title: w.listening.title,
          description: w.listening.description,
        },
      ],
    },
    { dayOffset: base + 4, theme: w.theme, tasks: fri },
    {
      dayOffset: base + 5,
      theme: w.theme,
      tasks: [
        { type: "generic", skill: "writing", title: `Writing: ${w.writing}` },
        { type: "vocab", skill: "vocab", title: "Weekly vocab review", description: "Clear your SRS queue and review everything new this week." },
      ],
    },
    {
      dayOffset: base + 6,
      theme: w.theme,
      tasks: [{ type: "generic", skill: "reflection", title: "Rest or light immersion", description: "Optional: a German film, podcast, or recipe — no new material today." }],
    },
  ];
}

/** Mon-Fri = review of the phase's trouble spots, Sat = the milestone test, Sun = reflect. */
function buildMilestoneWeek(weekNumber: number, w: MilestoneWeek): DefaultRoadmapDay[] {
  const base = (weekNumber - 1) * 7;
  const days: DefaultRoadmapDay[] = [];
  for (let i = 0; i < 5; i++) {
    days.push({
      dayOffset: base + i,
      theme: w.theme,
      tasks: [{ type: "generic", skill: "grammar", title: `Review: ${w.reviewTopics[i % w.reviewTopics.length]}` }],
    });
  }
  days.push({
    dayOffset: base + 5,
    theme: w.theme,
    tasks: [{ type: "milestone_test", skill: "milestone", title: w.milestone.title, description: w.milestone.description }],
  });
  days.push({
    dayOffset: base + 6,
    theme: w.theme,
    tasks: [{ type: "generic", skill: "reflection", title: "Reflect & plan ahead", description: "Note what felt hard this phase and what to focus on next." }],
  });
  return days;
}

// Adapted from the 26-week A0→B1 roadmap (germanonlinetests.com), personalized:
// tool mentions (Anki, italki, Tandem) swapped for this app's own vocab/SRS,
// Nicos Weg tracking, and self-test engine; "bureaucracy" weeks kept since
// they're directly relevant to preparing for an Ausbildung move.
export const DEFAULT_ROADMAP_DAYS: DefaultRoadmapDay[] = [
  // ════════════════════ Phase 1: A0 → A1 (Weeks 1-8) ════════════════════
  ...buildRegularWeek(1, {
    theme: "Alphabet & first words",
    listening: { title: "Listen: basic greeting dialogues", description: "Slow, beginner audio — focus on catching greetings and numbers." },
    speaking: "Introduce yourself (record yourself and listen back)",
    writing: "Write out the alphabet and 10 greeting phrases from memory",
  }),
  ...buildRegularWeek(2, {
    theme: "Everyday basics",
    listening: { title: "Nicos Weg A1 — Episodes 1-5", description: "Track these in your Learning Sources.", studySource: true },
    speaking: "Refine your self-introduction from last week",
    writing: "5-sentence description of your daily routine",
    bureaucracy: {
      title: "Germany's states & major cities",
      description: "Learn the 16 Bundesländer and their major cities — useful context for wherever your Ausbildung takes you.",
    },
  }),
  ...buildRegularWeek(3, {
    theme: "Questions & the supermarket",
    listening: { title: "Listen: supermarket dialogues", description: "Focus on catching question forms in context." },
    speaking: "Role-play: a supermarket conversation",
    writing: "Revise last week's daily-routine description with new grammar",
  }),
  ...buildRegularWeek(4, {
    theme: "Time & modal verbs",
    listening: { title: "DW Langsam Gesprochene Nachrichten", description: "Slow-spoken news, twice this week." },
    speaking: "Practice scheduling an appointment",
    writing: "Plan your week out loud using time expressions",
  }),
  ...buildRegularWeek(5, {
    theme: "Getting around",
    listening: { title: "Read: dialogues about travel", description: "Reading comprehension focused on transport and travel.", reading: true },
    speaking: "Describe your daily commute",
    writing: "Describe your commute or favorite travel route",
    bureaucracy: {
      title: "Public transport & train tickets",
      description: "Learn public-transport vocabulary and how to read a Deutsche Bahn ticket/timetable.",
    },
  }),
  ...buildRegularWeek(6, {
    theme: "Family & small talk",
    listening: { title: "Listen: a conversation about family", description: "Everyday small-talk register." },
    speaking: "Small talk: describe your family",
    writing: "Short paragraph introducing your family",
  }),
  ...buildRegularWeek(7, {
    theme: "Talking about the past",
    listening: { title: "Story-based podcast episode", description: "A simple narrated story at a beginner pace." },
    speaking: "Tell a short story about a past experience",
    writing: "Weekend recap using Perfekt",
  }),
  ...buildMilestoneWeek(8, {
    theme: "Milestone 1: A1 review",
    reviewTopics: ["Verb conjugation & modal verbs", "Cases: nominative & accusative", "Sentence structure & question forms", "Core A1 vocabulary", "Perfekt tense"],
    milestone: {
      title: "A1 milestone: mock test + speaking recording",
      description: "Take an A1-level self-test, record a 5-minute self-introduction, and check you know roughly 500 words. Adjust next month's pace based on the results.",
    },
  }),

  // ════════════════════ Phase 2: A1 → A2 (Weeks 9-16) ════════════════════
  ...buildRegularWeek(9, {
    theme: "Weather & hobbies",
    listening: { title: "Nachrichtenleicht — simplified news articles", description: "Reading practice with simplified news.", reading: true },
    speaking: "Discuss your hobbies and preferences",
    writing: "Compare two hobbies you enjoy",
  }),
  ...buildRegularWeek(10, {
    theme: "Plans & prefixes",
    listening: { title: "Nicos Weg — continue your course", studySource: true },
    speaking: "Talk through your plans for next weekend",
    writing: "Plan next weekend's activities using werden",
    bureaucracy: {
      title: "Booking appointments",
      description: "Learn and practice phrases for booking a Bürgeramt or doctor's appointment, plus Anmeldung/bank-account vocabulary.",
    },
  }),
  ...buildRegularWeek(11, {
    theme: "Health",
    listening: { title: "Listen: a doctor's-visit dialogue" },
    speaking: "Role-play: a patient/doctor conversation",
    writing: "Describe a time you were sick (past-tense practice)",
  }),
  ...buildRegularWeek(12, {
    theme: "Formal vs. informal",
    listening: { title: "Listen: leaving a voicemail" },
    speaking: "Practice a phone call, leaving a voicemail",
    writing: "Short formal message using Sie-form",
  }),
  ...buildRegularWeek(13, {
    theme: "Describing space",
    listening: { title: "Listen: describing a home or workspace" },
    speaking: "Describe your home or workspace out loud",
    writing: "Describe your home or workspace in writing",
  }),
  ...buildRegularWeek(14, {
    theme: "Money & shopping",
    listening: { title: "Listen: negotiating a price / asking for a refund" },
    speaking: "Practice negotiating a price or refund",
    writing: "Short dialogue about a shopping trip",
    bureaucracy: {
      title: "Public-office phone calls",
      description: "Simulate phone calls with Krankenkasse (health insurance) and a Wohnungsgesellschaft (housing office).",
    },
  }),
  ...buildRegularWeek(15, {
    theme: "Narrating the past",
    listening: { title: "Short graded-reader story (e.g. \"Café in Berlin\")", description: "A short A2-level graded reader.", reading: true },
    speaking: "Narrate a past experience or story aloud",
    writing: "Short past-tense story",
  }),
  ...buildMilestoneWeek(16, {
    theme: "Milestone 2: A2 review",
    reviewTopics: ["Dative & two-way prepositions", "All six modal verbs", "Perfekt, regular & irregular", "A2 core vocabulary", "Subordinate-clause word order"],
    milestone: {
      title: "A2 milestone: full mock exam",
      description: "Take an A2-level self-test; aim for 70%+ on listening comprehension and write a 150-word sample. Note weak areas for the next phase.",
    },
  }),

  // ════════════════════ Phase 3: A2 → B1 (Weeks 17-26) ════════════════════
  ...buildRegularWeek(17, {
    theme: "Travel stories",
    listening: { title: "Listen: a travel story" },
    speaking: "Tell a travel story using Präteritum",
    writing: "Travel diary entry",
  }),
  ...buildRegularWeek(18, {
    theme: "Complex sentences",
    listening: { title: "Easy German Podcast (with transcript)", description: "Normal-speed podcast episode, transcript as backup." },
    speaking: "Explain something using obwohl/trotzdem/dadurch",
    writing: "Short paragraph using at least 3 connectors",
    bureaucracy: {
      title: "Relocation paperwork",
      description: "Read a sample Anmeldeformular or Mietvertrag and learn residence-permit vocabulary.",
    },
  }),
  ...buildRegularWeek(19, {
    theme: "Opinions & debate",
    listening: { title: "Listen: a debate or discussion" },
    speaking: "Role-play: debate city vs. village life",
    writing: "Short opinion paragraph on a topic of your choice",
  }),
  ...buildRegularWeek(20, {
    theme: "Work & interviews",
    listening: { title: "Listen: a mock job interview" },
    speaking: "Simulate a job interview out loud",
    writing: "Answers to 3 common interview questions",
    bureaucracy: {
      title: "University/parents'-evening scenarios",
      description: "Practice vocabulary for attending a university orientation or parents' evening in German.",
    },
  }),
  ...buildRegularWeek(21, {
    theme: "Academic German",
    listening: { title: "Read: a short academic-style news article", reading: true },
    speaking: "Summarize an article out loud in your own words",
    writing: "200-word summary of an article you read",
  }),
  ...buildRegularWeek(22, {
    theme: "Media & culture",
    listening: { title: "Watch/listen: a German film or show clip" },
    speaking: "Discuss a film or book you like",
    writing: "Short review of your favorite film or book",
  }),
  ...buildRegularWeek(23, {
    theme: "Formal writing",
    listening: { title: "Listen: a formal complaint phone call" },
    speaking: "Role-play: handle a complaint scenario out loud",
    writing: "Formal email or letter (Sehr geehrte/r… / Mit freundlichen Grüßen)",
  }),
  ...buildRegularWeek(24, {
    theme: "Life goals",
    listening: { title: "Listen: a radio interview" },
    speaking: "Speak for a few minutes about your life goals",
    writing: "Write about your life goals and plans",
    bureaucracy: {
      title: "Job interview & CV vocabulary",
      description: "Review workplace-etiquette and CV-discussion vocabulary — pairs well with the CV builder in this app.",
    },
  }),
  ...buildMilestoneWeek(25, {
    theme: "Milestone 3: B1 mock exam",
    reviewTopics: ["Pronunciation weak points", "Grammar weak points from past self-tests", "Listening comprehension", "Vocabulary gaps", "Writing practice (150-180 words)"],
    milestone: {
      title: "B1 milestone: full mock exam",
      description: "Take a full B1-level self-test covering all areas. Identify your weakest skill (pronunciation, grammar, or listening) for this final review week.",
    },
  }),
  ...buildMilestoneWeek(26, {
    theme: "Final consolidation",
    reviewTopics: ["Cumulative grammar review", "Cumulative vocabulary review", "Listening practice", "Speaking practice"],
    milestone: {
      title: "B1 readiness test + final recording",
      description: "Take your final self-test, then record a 5-minute speech in German. Plan how you'll keep practicing after this roadmap ends.",
    },
  }),
];
