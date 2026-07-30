export interface User {
  id: string;
  email: string;
  name: string;
  vaultPath: string | null;
}

export type Wortart = "Nomen" | "Verb" | "Adjektiv" | "Adverb" | "Funktionswort" | "Wendung";
export type Genus = "der" | "die" | "das" | null;
export type SrsState = "new" | "due" | "learning" | "mastered";

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
  // computed at read time, never persisted (server/src/services/vocab/classify.ts)
  wortart: Wortart;
  genus: Genus;
  state: SrsState;
}

export type RoadmapDayStripStatus = "done" | "overdue" | "today" | "upcoming";

export interface DashboardData {
  totalWords: number;
  dueToday: number;
  newWords: number;
  reviewsToday: number;
  streak: number;
  quizzesCompleted: number;
  totalLearningMinutes: number;
  lessons: { lesson: string | null; count: number }[];
  activity: { date: string; count: number }[];
  expiringDocuments: { id: string; title: string; expiresAt: string; expiry: ExpiryStatus }[];
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
    nextIncompleteTitle: string | null;
  } | null;
  roadmapWeekStrip: { date: string; dayOffset: number; status: RoadmapDayStripStatus }[];
  gamification: {
    points: number;
    badgeCount: number;
    recentBadges: { key: string; label: string; unlockedAt: string }[];
  };
}

export interface VaultStatus {
  vaultPath: string | null;
  wordCount: number;
  watching: boolean;
  lastSyncAt: string | null;
}

export type Grade = "hard" | "good" | "easy";

export interface ReviewHistoryEntry {
  id: string;
  wordId: string;
  headword: string;
  grade: Grade;
  reviewedAt: string;
  intervalAfter: number;
}

export interface WeakWord {
  wordId: string;
  headword: string;
  lastGrade: Grade;
  lastReviewedAt: string;
}

export interface ReviewStats {
  totalReviews: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  gradeBreakdown: Record<Grade, number>;
  avgIntervalAfter: number | null;
}

export interface UploadedFileMeta {
  id: string;
  checklistItemId: string | null;
  syllabusItemId: string | null;
  studySourceId: string | null;
  roadmapTaskId: string | null;
  kind: "document" | "cv_photo" | "audio_recording";
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export type ExpiryStatus = "ok" | "warn" | "urgent" | "expired";

export type ChecklistCategory =
  | "identity"
  | "education"
  | "visa"
  | "finances"
  | "insurance"
  | "application"
  | "after_arrival"
  | "other";

export type ChecklistStatus = "todo" | "in_progress" | "done" | "not_applicable";

export type CvTemplate = "lebenslauf" | "ats";

// Hand-maintained mirror of the zod source of truth in
// server/src/services/cv/schema.ts — keep the two in sync.
export interface CvContent {
  personal: {
    firstName: string;
    lastName: string;
    headline?: string;
    email: string;
    phone?: string;
    street?: string;
    postalCodeCity?: string;
    birthDate?: string;
    birthPlace?: string;
    nationality?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: {
    id: string;
    role: string;
    company: string;
    location?: string;
    from: string;
    to?: string;
    current: boolean;
    bullets: string[];
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    location?: string;
    from: string;
    to?: string;
    description?: string;
  }[];
  languages: { id: string; name: string; level: string }[];
  skills: { id: string; name: string }[];
  certifications: { id: string; name: string; issuer?: string; date?: string }[];
  interests?: string;
  signature: { city?: string; date?: string };
}

export interface Cv {
  id: string;
  title: string;
  template: CvTemplate;
  content: CvContent;
  photoFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CvSummary {
  id: string;
  title: string;
  template: CvTemplate;
  photoFileId: string | null;
  updatedAt: string;
}

export type ApplicationStatus = "wishlist" | "applied" | "interview" | "offer" | "rejected";

export type ApplicationEventType = "created" | "status_change" | "note" | "interview" | "follow_up";

export interface Application {
  id: string;
  company: string;
  position: string;
  location: string | null;
  url: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  platform: string | null;
  platformUrl: string | null;
  status: ApplicationStatus;
  sortOrder: number;
  appliedAt: string | null;
  cvId: string | null;
  cv: { id: string; title: string } | null;
  createdAt: string;
  _count?: { events: number };
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
}

export interface ApplicationStats {
  total: number;
  active: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number | null;
  interviewRate: number | null;
  offers: number;
  avgDaysToResponse: number | null;
  weeklyActivity: { weekStart: string; applied: number }[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  category: ChecklistCategory;
  status: ChecklistStatus;
  expiresAt: string | null;
  sortOrder: number;
  isDefault: boolean;
  files: UploadedFileMeta[];
  expiry: ExpiryStatus | null;
}

export type CefrLevel = "a1" | "a2" | "b1";

export type SyllabusCategory = "grammar" | "vocab_theme" | "skill";

export type StudySourceType = "youtube" | "nicos_weg" | "duolingo" | "other";

export type QuizDirection = "de_to_meaning" | "meaning_to_de";

export interface SyllabusItem {
  id: string;
  level: CefrLevel;
  category: SyllabusCategory;
  skill: RoadmapSkill | null;
  theme: string | null;
  title: string;
  description: string | null;
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
}

export interface RoutePace {
  itemsPerWeek: number;
  projectedFinishDate: string | null;
  examTargetDate: string | null;
  weeksBehindPace: number | null;
}

export interface SyllabusResponse {
  levels: LevelProgress[];
  items: SyllabusItem[];
  routePace: RoutePace;
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
  title: string;
  url: string | null;
  level: CefrLevel | null;
  totalUnits: number | null;
  completedUnits: number;
  notes: string | null;
  percent: number | null;
  units: StudySourceUnit[];
  files: UploadedFileMeta[];
  createdAt: string;
  updatedAt: string;
}

export type PlaylistFetchOutcome = "playlist" | "course" | "manual" | "failed";

export type LevelState = "done" | "active" | "locked";

// mirrors SessionQuestion in server/src/services/learning/engine.ts
export type SessionQuestion =
  | { qid: string; type: "mcq"; level: CefrLevel; topic: string; skill: RoadmapSkill; prompt: string; choices: string[]; answerIndex: number }
  | { qid: string; type: "fill_blank"; level: CefrLevel; topic: string; skill: RoadmapSkill; prompt: string; accepted: string[] }
  | { qid: string; type: "true_false"; level: CefrLevel; topic: string; skill: RoadmapSkill; prompt: string; answer: boolean };

export interface TopicBreakdown {
  topic: string;
  level: CefrLevel;
  skill?: RoadmapSkill;
  correct: number;
  total: number;
}

export interface SelfTestResult {
  id: string;
  kind: "vocab" | "mixed";
  direction: QuizDirection;
  lesson: string | null;
  level: CefrLevel | null;
  breakdown: TopicBreakdown[] | null;
  score: number;
  total: number;
  takenAt: string;
}

export interface QuizResultsResponse {
  results: SelfTestResult[];
  testsTaken: number;
  best: number | null;
  avg: number | null;
  weakestTopics: RoadmapTopicWeakness[];
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
  completedAt: string | null;
  droppedAt: string | null;
  files: UploadedFileMeta[];
  // set when this task's content is derived from a syllabus topic — the
  // same fact as that SyllabusItem's completion, kept in sync
  syllabusItem: { level: CefrLevel; theme: string | null } | null;
}

export interface RoadmapJournalTask extends RoadmapTask {
  day: { date: string; theme: string | null };
}

export interface RoadmapStatus {
  activated: boolean;
  startedAt: string | null;
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

export interface UnlockedBadge {
  key: string;
  label: string;
  description: string;
  points: number;
}

export interface ActivitySummary {
  minutesToday: number;
  minutesThisWeek: number;
  history: { date: string; minutes: number }[];
}

export interface SavedLink {
  id: string;
  title: string;
  url: string;
  skill: RoadmapSkill | null;
  note: string | null;
  createdAt: string;
}

export type ActivityFeedFilter = "all" | "lessons" | "links";

export interface ActivityFeedEntry {
  id: string;
  at: string;
  kind: "lesson" | "manual" | "link";
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
  weakAreas: RoadmapTopicWeakness[];
  improvedMost: { topic: string; percent: number; deltaPoints: number }[];
  streakGrid: { date: string; minutes: number }[];
  readiness: GoetheReadiness;
  timeCoverage: { tasksCompleted: number; tasksWithLoggedTime: number };
}

export interface NotebookLinkResult {
  matched: boolean;
  candidates?: string[];
  item?: SyllabusItem;
}

export interface AppNotification {
  id: string;
  type: "portal" | "application" | "document";
  title: string;
  detail: string;
  href: string;
}
