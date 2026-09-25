export interface User {
  id: string;
  email: string;
  name: string;
  vaultPath: string | null;
}

export type Wortart = "Nomen" | "Verb" | "Adjektiv" | "Adverb" | "Funktionswort" | "Wendung";
export type Genus = "der" | "die" | "das" | null;
export type SrsState = "new" | "due" | "learning" | "mastered";

// Mirrors server/src/services/vault/format.ts's CardCuration and
// server/src/services/enrichment/index.ts's DerivedEnrichmentStatus.
export type CardCuration = "generated" | "review" | "manual" | "mt";
export type EnrichmentStatus = "published" | "published_review" | "unresolved" | "incomplete" | "protected";

export type Themenfeld =
  | "person_familie"
  | "alltag_zuhause"
  | "essen_einkaufen"
  | "arbeit_ausbildung"
  | "bildung"
  | "gesundheit"
  | "reise_verkehr"
  | "freizeit_kultur"
  | "medien_technik"
  | "geld"
  | "amt_buerokratie"
  | "gefuehle_meinung"
  | "natur_umwelt"
  | "gesellschaft";

// noun case x number table, from the kaikki.org enrichment pipeline —
// server/src/services/enrichment/kaikki.ts's extractDeclension()
export interface DeclensionTable {
  nom?: { sg?: string; pl?: string };
  akk?: { sg?: string; pl?: string };
  dat?: { sg?: string; pl?: string };
  gen?: { sg?: string; pl?: string };
}

// present-tense 6-person grid + best-effort past/perfect — extractConjugation()
export interface ConjugationTable {
  present?: { ich?: string; du?: string; er?: string; wir?: string; ihr?: string; sie?: string };
  past?: string;
  perfect?: string;
}

export interface WordFamilyMember {
  headword: string;
  pos: string;
  score: number;
  tier: "close" | "distant";
  // set when this family member is already one of the user's own tracked words
  ownedWordId: string | null;
}

export interface Word {
  id: string;
  headword: string;
  sortKey: string;
  meaning: string | null;
  ipa: string | null;
  grammar: string | null;
  form: string | null;
  example: string | null;
  audioPath: string | null;
  lesson: string | null;
  srDue: string | null;
  srInterval: number | null;
  srEase: number | null;
  createdAt: string;
  // app-only, persisted (server/src/prisma/schema.prisma's Word model)
  themenfeld: Themenfeld[];
  level: CefrLevel | null;
  leech: boolean;
  starred: boolean;
  declension: DeclensionTable | null;
  conjugation: ConjugationTable | null;
  exampleTranslation: string | null;
  // vault-format field, persisted (server/src/services/vault/format.ts's CardFields)
  curation: CardCuration;
  reviewNote: string | null;
  // computed at read time, never persisted (server/src/services/vocab/classify.ts)
  wortart: Wortart;
  genus: Genus;
  state: SrsState;
  enrichmentStatus: EnrichmentStatus;
  /** Present on GET /api/words and PATCH responses. */
  strength?: Strength;
}

export type RoadmapDayStripStatus = "done" | "overdue" | "today" | "upcoming";

export interface DashboardNextTask {
  id: string;
  type: RoadmapTaskType;
  skill: RoadmapSkill | null;
  title: string;
  description: string | null;
}

export interface BentoDashboard {
  level: {
    level: CefrLevel;
    percent: number;
    passedItems: number;
    countedItems: number;
    closedStations: number;
    totalStations: number;
    currentStation: { key: string; index: number; theme: string } | null;
    levels: { level: CefrLevel; percent: number; state: LevelState }[];
  };
  weeklyGoal: {
    goalMinutes: number;
    minutes: number;
    percent: number;
    days: { date: string; minutes: number; status: "past" | "today" | "future" }[];
  };
  /** Active level's Level % split by skill (null percent = no items for that skill). */
  skillMastery: { skill: "reading" | "listening" | "grammar" | "writing" | "speaking"; passed: number; counted: number; percent: number | null }[];
  lernzeitToday: number;
  words: { total: number; shaky: number; newThisWeek: number };
  weakSpot:
    | { source: "self_test"; label: string; topic: string; level: string | null; percent: number; answered: number }
    | { source: "mistakes"; label: string; category: string; count: number; topics: string[] }
    | null;
  nextInterview: { at: string; note: string | null; applicationId: string; company: string; role: string; location: string | null } | null;
  runningTask: { id: string; title: string; skill: RoadmapSkill | null; timerSeconds: number; timerRunningSince: string } | null;
  bestStreak: number;
  streakCalendar: { date: string; activity: number; lernzeit: number; future: boolean }[];
}

export interface DashboardData {
  /** Bento Today/Stats blocks (server routes/dashboard.ts `bento`). */
  bento: BentoDashboard;
  totalWords: number;
  dueToday: number;
  newWords: number;
  reviewsToday: number;
  streak: number;
  quizzesCompleted: number;
  totalLearningMinutes: number;
  examTargetDate: string | null;
  lessons: { lesson: string | null; count: number }[];
  activity: { date: string; count: number }[];
  applications: Record<ApplicationStatus, number>;
  heatmap: { date: string; reviews: number; learning: number }[];
  learning: {
    levels: { level: CefrLevel; total: number; done: number; percent: number }[];
    skillProgress: { skill: RoadmapSkill; total: number; done: number; percent: number }[];
    skillPerformance: { skill: RoadmapSkill; correct: number; total: number; percent: number }[];
    streak: number;
    lastSelfTest: { score: number; total: number; takenAt: string } | null;
  };
  roadmapToday: {
    theme: string | null;
    tasksDone: number;
    tasksTotal: number;
    nextTask: DashboardNextTask | null;
  } | null;
  roadmapWeekStrip: { date: string; dayOffset: number; status: RoadmapDayStripStatus }[];
}

export interface VaultStatus {
  vaultPath: string | null;
  /** Kept after unlinking, so sync can be switched back on. */
  lastVaultPath: string | null;
  /** Notes are written to <vault>/Notizen as markdown. */
  writeNotes: boolean;
  wordCount: number;
  watching: boolean;
  lastSyncAt: string | null;
}

export type Grade = "again" | "hard" | "good" | "easy";

export interface ScheduleResult {
  due: string;
  interval: number;
  ease: number;
}

export type GradePreview = Record<Grade, ScheduleResult>;

export interface ReviewHistoryEntry {
  id: string;
  wordId: string;
  headword: string;
  grade: Grade;
  reviewedAt: string;
  intervalAfter: number;
}

/** Word strength (server services/vocab/classify.ts strength()): 0 = never reviewed, 1–5 pips; shaky = 1–2. */
export type Strength = 0 | 1 | 2 | 3 | 4 | 5;

export interface WeakWord {
  wordId: string;
  headword: string;
  strength: Strength;
  /** Times graded hard, all-time. */
  hardCount: number;
  lastGrade: Grade | null;
  lastReviewedAt: string | null;
}

export interface ReviewStats {
  totalReviews: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  gradeBreakdown: Record<Grade, number>;
  avgIntervalAfter: number | null;
  /** Share graded good/easy per trailing window. */
  accuracy: Record<"7d" | "30d" | "1y", number | null>;
  /** Recalled % by gap since the previous review (buckets without samples omitted). */
  retention: { day: number; percent: number; samples: number }[];
}

export interface UploadedFileMeta {
  id: string;
  syllabusItemId: string | null;
  studySourceId: string | null;
  roadmapTaskId: string | null;
  noteId: string | null;
  kind: "document" | "cv_photo" | "audio_recording";
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export type CvKind = "cv" | "letter" | "certificates";

// Settings → CV shelf: a document is its uploaded files, one per version — no in-app builder, nothing rendered;
// server/src/routes/cvs.ts
export interface Cv {
  id: string;
  title: string;
  kind: CvKind;
  /** The current version; `file` is its file. */
  version: number;
  /** The CV Jobs preselects (one per user, CVs only). */
  isDefault: boolean;
  file: { id: string; originalName: string; mimeType: string; size: number } | null;
  // count of applications currently pointing at this CV; 0 = unused
  usedIn: number;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = "wishlist" | "applied" | "interview" | "offer" | "rejected";

export type ApplicationEventType = "created" | "status_change" | "note" | "interview" | "follow_up";

export interface Application {
  id: string;
  company: string;
  role: string;
  jobProfile: string | null;
  description: string | null;
  location: string | null;
  url: string | null;
  portal: string | null;
  status: ApplicationStatus;
  sortOrder: number;
  appliedAt: string | null;
  cvId: string | null;
  /** `file` is the version the application used (`cvVersion`); `version` is the shelf's current one. */
  cv: { id: string; title: string; version: number; file: { id: string; originalName: string } | null } | null;
  cvVersion: number | null;
  /** Asked-for German level: detected on fetch, overridable; null = not stated. */
  germanLevel: GermanLevel | null;
  createdAt: string;
  _count?: { events: number };
  /** Next upcoming interview event (list responses only). */
  nextInterviewAt?: string | null;
}

export type GermanLevel = "a1" | "a2" | "b1" | "b2" | "c1" | "c2";

export interface ApplicationPhrase {
  id: string;
  text: string;
  createdAt: string;
}

/** Curated interview/Probetag phrase (server services/applications/phrases.ts). */
export interface CuratedPhrase {
  id: string;
  de: string;
  en: string;
  context: string;
  stages: ApplicationStatus[];
}

/** Best-effort result of scraping a pasted job-posting URL; server/src/services/applications/fetchPreview.ts */
export interface JobPreview {
  company: string | null;
  role: string | null;
  location: string | null;
  portal: string | null;
  germanLevel: GermanLevel | null;
}

export interface ApplicationEvent {
  id: string;
  type: ApplicationEventType;
  note: string | null;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  occurredAt: string;
}

export interface ApplicationDetail extends Application {
  events: ApplicationEvent[];
  phrases: ApplicationPhrase[];
}

export interface ApplicationStats {
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
  funnel: { sent: number; replies: number; interviews: number };
  responseRate: number | null;
  interviewRate: number | null;
  offers: number;
  avgDaysToResponse: number | null;
  weeklyActivity: { weekStart: string; applied: number }[];
}

export type CefrLevel = "a1" | "a2" | "b1";

export type SyllabusCategory = "grammar" | "vocab_theme" | "skill";

export type StudySourceType = "youtube" | "audio" | "video" | "book" | "course" | "article" | "link";

export type StudySourceUnitLabel = "lessons" | "episodes" | "pages" | "chapters" | "modules";

export type QuizDirection = "de_to_meaning" | "meaning_to_de";

export interface SyllabusItem {
  id: string;
  level: CefrLevel;
  category: SyllabusCategory;
  skill: RoadmapSkill | null;
  theme: string | null;
  title: string;
  description: string | null;
  learningOutcome: string | null;
  resourceTitle: string | null;
  resourceBody: string | null;
  resourceUrl: string | null;
  resourceAudioUrl: string | null;
  resourceTranscript: string | null;
  listeningPrompt: string | null;
  guidedPractice: string | null;
  exerciseType: "free_text" | "self_check" | "multiple_choice" | "correction" | "listening_audio" | "speaking_audio" | null;
  exercisePrompt: string | null;
  exerciseAnswer: string | null;
  /** multiple_choice: options + correctIndex; self_check: the three confirmations (`checks`). */
  exerciseOptions: { options: string[]; correctIndex: number } | { checks: string[] } | null;
  masteryState: "not_started" | "learning" | "passed" | "mastered";
  reviewDueAt: string | null;
  successfulAttempts: number;
  lastAttemptAt: string | null;
  reviewDue: boolean;
  sortOrder: number;
  completedAt: string | null;
  // Grammar Notebook — user's own notes, grammar-category items only
  examples: string | null;
  exceptions: string | null;
  commonMistakes: string | null;
  // "station" = every item sharing (level, theme); skipping bulk-stamps this
  // across the whole group (see PATCH /syllabus/station)
  skippedAt: string | null;
  files: UploadedFileMeta[];
  // set when this topic is scheduled on the active roadmap (same fact,
  // synced via the roadmap/syllabus completion link)
  roadmapDayOffset: number | null;
  // the linked RoadmapTask's own id, when scheduled — lets the Syllabus
  // station accordion's "Practice" action jump straight to that task's
  // real Task Detail modal instead of just the day it's scheduled on
  roadmapTaskId: string | null;
}

export interface ExerciseAttempt {
  id: string;
  answer: string;
  passed: boolean;
  feedback: string | null;
  mistakeCategory: SyllabusMistakeCategory | null;
  rubricAssessment: { taskFulfilled: boolean; grammarChecked: boolean; understandable: boolean } | null;
  createdAt: string;
}

export type SyllabusMistakeCategory =
  | "gender_article"
  | "case"
  | "word_order"
  | "conjugation"
  | "vocabulary"
  | "spelling"
  | "pronunciation"
  | "listening_detail"
  | "collocation"
  | "other";

export interface SyllabusMistakeSummary {
  category: SyllabusMistakeCategory;
  count: number;
  topics: string[];
}

export interface SyllabusWorkspace {
  item: SyllabusItem & {
    exerciseAttempts: ExerciseAttempt[];
    notes: Note[];
  };
}

export interface GoalFeasibility {
  requiredItemsPerWeek: number | null;
  sustainableItemsPerWeek: number;
  requiredMinutesPerWeek: number | null;
  verdict: "on_track" | "tight" | "unrealistic" | null;
}

export interface RoutePace {
  itemsPerWeek: number;
  projectedFinishDate: string | null;
  examTargetDate: string | null;
  weeksBehindPace: number | null;
  goalFeasibility: GoalFeasibility;
  /** The level being worked on, and the study hours left in it (Settings' readiness box). */
  level: CefrLevel | null;
  hoursLeft: number;
}

export interface SyllabusResponse {
  levels: LevelProgress[];
  items: SyllabusItem[];
  routePace: RoutePace;
  // real exam-gate lock state, one entry per level in CEFR order — see
  // levelStatesWithExamGate() in server/src/services/learning/progress.ts
  lockStates: LevelState[];
  examGate: ({ hasContent: false } | { hasContent: true; passed: boolean })[];
}

export interface LevelProgress {
  level: CefrLevel;
  total: number;
  done: number;
  percent: number;
  nextUp: { id: string; title: string } | null;
}

export interface StudySourceUnit {
  id: string;
  position: number;
  title: string;
  videoId: string | null;
  url: string | null;
  notes: string | null;
  completedAt: string | null;
}

export interface StudySource {
  id: string;
  type: StudySourceType;
  provider: string | null;
  title: string;
  url: string | null;
  level: CefrLevel | null;
  totalUnits: number | null;
  completedUnits: number;
  unitLabel: StudySourceUnitLabel;
  notes: string | null;
  percent: number | null;
  units: StudySourceUnit[];
  files: UploadedFileMeta[];
  // a user-uploaded cover (via the file-upload route, kind: "source_cover")
  // always wins for display over coverImageUrl's auto-fetched thumbnail
  coverFileId: string | null;
  coverImageUrl: string | null;
  /** Plan journey station this source fuels ("level:theme"), or null. */
  stationKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PlaylistFetchOutcome = "playlist" | "course" | "book" | "podcast" | "preview" | "manual" | "failed";

export type LevelState = "done" | "active" | "locked";

// mirrors SessionQuestion in server/src/services/learning/engine.ts
export type SessionQuestion =
  | { qid: string; type: "mcq"; level: CefrLevel; topic: string; skill: RoadmapSkill; prompt: string; choices: string[]; answerIndex: number }
  | { qid: string; type: "fill_blank"; level: CefrLevel; topic: string; skill: RoadmapSkill; prompt: string; accepted: string[] }
  | { qid: string; type: "true_false"; level: CefrLevel; topic: string; skill: RoadmapSkill; prompt: string; answer: boolean };

// ── Exam gate — the real, gating final exam per level. Distinct from the
// practice self-test above: no answers are shipped to the client, and
// results are server-scored (see server/src/services/learning/exam.ts). ──

export type ExamSection = "vocabulary" | "grammar" | "gender_drill" | "listening";

export type ExamAnswerValue = string | number | boolean;

// mirrors server's ExamQuestionPublic — server/src/services/learning/exam.ts
export type ExamQuestionPublic =
  | { qid: string; section: ExamSection; type: "mcq"; prompt: string; choices: string[]; audio: boolean }
  | { qid: string; section: ExamSection; type: "fill_blank"; prompt: string; audio: boolean }
  | { qid: string; section: ExamSection; type: "true_false"; prompt: string; audio: boolean };

export interface ExamSectionBreakdown {
  section: ExamSection;
  correct: number;
  total: number;
}

export interface ExamAttempt {
  id: string;
  level: CefrLevel;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  total: number | null;
  passed: boolean | null;
  sectionBreakdown: ExamSectionBreakdown[] | null;
  /** mock = practice run: no 7-day lock, never passes. */
  mode: "real" | "mock";
}

export interface ExamStatus {
  level: CefrLevel;
  allowed: boolean;
  reason: "already_passed" | "cooldown" | null;
  nextAvailableAt: string | null;
  lastAttempt: ExamAttempt | null;
  attempts: ExamAttempt[];
  timeLimitMinutes: number;
  cooldownDays: number;
  passThreshold: number;
  sectionCounts: Record<ExamSection, number>;
  lastMockAttempt: ExamAttempt | null;
  examTargetDate: string | null;
  /** Exam date minus 14 days (YYYY-MM-DD), or null without an exam date. */
  suggestedMockDate: string | null;
}

export interface TopicBreakdown {
  topic: string;
  level: CefrLevel;
  skill?: RoadmapSkill;
  correct: number;
  total: number;
}

export interface SelfTestResult {
  id: string;
  kind: "vocab" | "mixed" | "gender_drill" | "listen_type" | "checkpoint";
  direction: QuizDirection;
  lesson: string | null;
  level: CefrLevel | null;
  breakdown: TopicBreakdown[] | null;
  score: number;
  total: number;
  takenAt: string;
}

export interface SelfTestScore {
  percent: number | null;
  count: number;
}

export type Article = "der" | "die" | "das";

export interface ArticleAccuracy {
  byArticle: Record<Article, { correct: number; total: number; percent: number | null }>;
  mostMissed: Article | null;
  recentWrong: { wrong: number; of: number } | null;
}

export interface QuizResultsResponse {
  results: SelfTestResult[];
  testsTaken: number;
  best: number | null;
  avg: number | null;
  weakestTopics: RoadmapTopicWeakness[];
  /** Checkpoint tiles, over the last 20 tests. */
  scores: { multipleChoice: SelfTestScore; fillIn: SelfTestScore; genderDrill: SelfTestScore; listenType: SelfTestScore };
  /** From every gender-drill answer. */
  articles: ArticleAccuracy;
  checkpoints: { level: CefrLevel | null; index: number; score: number; total: number; takenAt: string }[];
}

export type RoadmapTaskType = "generic" | "vocab" | "study_source" | "milestone_test";

export type RoadmapSkill =
  | "grammar"
  | "vocab"
  | "listening"
  | "speaking"
  | "writing"
  | "reading"
  | "bureaucracy"
  | "milestone"
  | "reflection";

export interface RoadmapTask {
  id: string;
  sortOrder: number;
  type: RoadmapTaskType;
  skill: RoadmapSkill | null;
  title: string;
  description: string | null;
  journalEntry: string | null;
  minutesSpent: number | null;
  timerSeconds: number;
  timerRunningSince: string | null;
  completedAt: string | null;
  droppedAt: string | null;
  files: UploadedFileMeta[];
  // set when this task's content is derived from a syllabus topic — the
  // same fact as that SyllabusItem's completion, kept in sync
  syllabusItemId: string | null;
  syllabusItem: { level: CefrLevel; theme: string | null; description: string | null } | null;
}

export interface RoadmapJournalTask extends RoadmapTask {
  day: { date: string; theme: string | null };
}

// ── Notes tab ──

export interface Note {
  id: string;
  title: string | null;
  body: string | null;
  skill: RoadmapSkill | null;
  syllabusItemId: string | null;
  roadmapTaskId: string | null;
  // soft link to a vocab word ("Your note" card on Word Detail); contextTag
  // is which screen/section was active when the FAB capture button was
  // tapped (e.g. "/Jobs"), shown as a removable chip
  wordId: string | null;
  contextTag: string | null;
  /** Bento sticky-wall category, pin, and the /job and /station links. */
  category: NoteCategory;
  pinned: boolean;
  applicationId: string | null;
  stationKey: string | null;
  /** /source link (sticky wall). */
  studySourceId: string | null;
  /** "Surfaced today" rotation (grammar/mistakes notes); null = not in rotation. */
  resurfaceDueAt: string | null;
  resurfaceStep: number;
  files: UploadedFileMeta[];
  createdAt: string;
  updatedAt: string;
}

export type NoteCategory = "grammar" | "mistakes" | "everyday" | "jobs" | "listening";

/** GET /api/notes/wall: a note plus the names its link chip shows. */
export interface WallNote extends Note {
  word: { id: string; headword: string } | null;
  application: { id: string; company: string } | null;
  studySource: { id: string; title: string } | null;
}

/** SyllabusItem's Grammar Notebook (examples/exceptions/commonMistakes),
 * merged into one `body` string server-side — see notes.ts's
 * mergedNotebookBody(). */
export interface SurfacedNotebookEntry {
  id: string;
  level: CefrLevel;
  theme: string | null;
  title: string;
  skill: RoadmapSkill | null;
  body: string;
  files: UploadedFileMeta[];
}

export interface SurfacedUnitNote extends StudySourceUnit {
  sourceId: string;
  sourceTitle: string;
}

export interface NotesFeedResponse {
  notes: Note[];
  taskJournals: RoadmapJournalTask[];
  grammarNotebook: SurfacedNotebookEntry[];
  sourceNotes: SurfacedUnitNote[];
}

export interface RoadmapStatus {
  activated: boolean;
  startedAt: string | null;
  /** Minutes a day, 10–180 in steps of 5. */
  studyCapacityMinutes: number;
  /** Monday → Sunday. */
  studyDays: boolean[];
  newWordsPerDay: NewWordsPerDay;
}

export type NewWordsPerDay = 5 | 10 | 15 | 20;
export type CapacityUpdate = Partial<{ minutes: number; studyDays: boolean[]; newWordsPerDay: NewWordsPerDay }>;

export interface DailyJournal {
  id: string;
  date: string;
  learned: string | null;
  difficult: string | null;
  nextStep: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapOverview {
  totalDays: number;
  currentDayOffset: number;
  tasksDone: number;
  tasksTotal: number;
  percent: number;
}

export interface RoadmapBacklogGroup {
  dayId: string;
  date: string;
  theme: string | null;
  daysOverdue: number;
  tasks: RoadmapTask[];
}

export interface RoadmapTodayResponse {
  date: string;
  theme: string | null;
  tasks: RoadmapTask[];
  backlog: RoadmapBacklogGroup[];
  overview: RoadmapOverview;
  /** Today is off in Settings → Study days: no ticket, its tasks carry over. */
  restDay: boolean;
  capacity: {
    minutes: number;
    revisionMinutes: number;
    coreMinutes: number;
    hasMore: boolean;
  };
  queues: {
    revision: { id: string; headword: string; meaning: string | null; example: string | null }[];
    topicReviews: { id: string; title: string; level: CefrLevel; theme: string | null; reviewDueAt: string | null }[];
    coreTaskIds: string[];
    accelerationTaskIds: string[];
    blockedTaskIds: string[];
  };
}

export interface RoadmapBacklogResponse {
  groups: RoadmapBacklogGroup[];
  totalOverdueTasks: number;
}

export interface RoadmapDayDetail {
  date: string;
  dayOffset: number;
  theme: string | null;
  tasks: RoadmapTask[];
}

export type RoadmapDayStatus = "done" | "overdue" | "today" | "upcoming";

export interface RoadmapCalendarDay {
  date: string;
  dayOffset: number;
  theme: string | null;
  totalTasks: number;
  completedTasks: number;
  status: RoadmapDayStatus;
}

export interface RoadmapSkillTally {
  skill: RoadmapSkill;
  done: number;
  total: number;
}

export interface RoadmapTopicWeakness {
  topic: string;
  correct: number;
  total: number;
  percent: number;
}

export interface RoadmapDailySkillMinutes {
  date: string;
  skill: RoadmapSkill;
  minutes: number;
}

export interface RoadmapReviewSummary {
  vocabAdded: number;
  vocabReviewed: number;
  grammarCompleted: { id: string; title: string }[];
  tasksCompleted: number;
  tasksTotal: number;
  bySkill: RoadmapSkillTally[];
  weakAreas: RoadmapTopicWeakness[];
  loggedMinutes: number;
  tasksWithLoggedTime: number;
  dailyMinutesBySkill: RoadmapDailySkillMinutes[];
}

export interface RoadmapWeeklyReview extends RoadmapReviewSummary {
  weekStart: string;
  weekEnd: string;
}

export interface RoadmapMonthlyReview extends RoadmapReviewSummary {
  monthStart: string;
  monthEnd: string;
}

export interface MovedTask {
  id: string;
  fromDayOffset: number;
}

export interface RoadmapPace {
  plannedTasksPerDay: number;
  actualTasksPerDay: number;
  daysLeft: number;
}

export interface RoadmapWeekDay {
  date: string;
  dayOffset: number;
  theme: string | null;
  tasks: RoadmapTask[];
  status: RoadmapDayStatus;
}

export interface RoadmapWeekOverviewEntry {
  week: number;
  taskCount: number;
  doneCount: number;
  isCurrentWeek: boolean;
  isExamWeek: boolean;
}

export interface RoadmapWeekResponse {
  week: number;
  totalWeeks: number;
  weekStart: string;
  weekEnd: string;
  theme: string | null;
  days: RoadmapWeekDay[];
  thisWeek: { done: number; total: number };
  lateAcrossPlan: number;
  pace: RoadmapPace;
  weeksOverview: RoadmapWeekOverviewEntry[];
}

export interface GoetheReadiness {
  level: CefrLevel;
  syllabusPercent: number;
  avgRecentTestScore: number | null;
  trend: "up" | "down" | "flat" | null;
  readinessLabel: "not started" | "building" | "ready soon" | "exam ready";
}

export interface Portal {
  id: string;
  label: string;
  url: string;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface ActivitySummary {
  minutesToday: number;
  minutesThisWeek: number;
  /** Bento Lernzeit: active minutes on learning routes only. */
  lernzeitToday: number;
  lernzeitThisWeek: number;
  history: { date: string; minutes: number; lernzeit: number }[];
}

export interface ActivityFeedEntry {
  id: string;
  at: string;
  kind: "lesson" | "manual" | "added" | "completed";
  sourceId: string | null;
  sourceTitle: string | null;
  title: string;
  notes: string | null;
}

export interface ActivityFeedResponse {
  entries: ActivityFeedEntry[];
  nextCursor: string | null;
}

export type ProgressPeriod = "7d" | "30d" | "90d" | "all";

export interface ProgressKpi {
  value: number | null;
  total?: number;
  delta?: number | null;
  deltaPercent?: number | null;
  deltaPoints?: number | null;
}

export interface MasteryTrendPoint {
  weekStart: string;
  attempts: number;
  passed: number;
  passRate: number;
}

export interface MasteryDistribution {
  not_started: number;
  learning: number;
  passed: number;
  mastered: number;
}

export interface ProgressResponse {
  period: ProgressPeriod;
  rangeStart: string;
  rangeEnd: string;
  kpis: {
    tasksKept: { value: number; total: number; delta: number | null };
    minutes: { value: number; deltaPercent: number | null };
    testAvg: { value: number | null; deltaPoints: number | null };
    syllabusPercent: { value: number; deltaPoints: number };
    streak: { current: number; best: number };
  };
  chart: { labels: string[]; current: number[]; previous: number[] };
  bySkill: { skill: RoadmapSkill; done: number; planned: number; dropped: number }[];
  /** Self-test accuracy by skill, scoped to `period` — the mastery/accuracy
   * metric ("how good are you at this"), distinct from bySkill's plan-
   * completion rate ("how much of your plan did you finish"). This is what
   * "weakest skill" should be computed from everywhere. */
  skillPerformance: { skill: RoadmapSkill; correct: number; total: number; percent: number }[];
  weakAreas: RoadmapTopicWeakness[];
  improvedMost: { topic: string; percent: number; deltaPoints: number }[];
  streakGrid: { date: string; minutes: number }[];
  readiness: GoetheReadiness;
  masteryDistribution: MasteryDistribution;
  masteryTrend: MasteryTrendPoint[];
  timeCoverage: { tasksCompleted: number; tasksWithLoggedTime: number };
}

export interface NotebookLinkResult {
  matched: boolean;
  candidates?: string[];
  item?: SyllabusItem;
}
