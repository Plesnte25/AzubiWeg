export interface User {
  id: string;
  email: string;
  name: string;
  vaultPath: string | null;
}

export interface Word {
  id: string;
  headword: string;
  sortKey: string;
  meaning: string | null;
  ipa: string | null;
  grammar: string | null;
  example: string | null;
  audioPath: string | null;
  lesson: string | null;
  srDue: string | null;
  srInterval: number | null;
  srEase: number | null;
  createdAt: string;
}

export interface DashboardData {
  totalWords: number;
  dueToday: number;
  newWords: number;
  reviewsToday: number;
  streak: number;
  lessons: { lesson: string | null; count: number }[];
  activity: { date: string; count: number }[];
  expiringDocuments: { id: string; title: string; expiresAt: string; expiry: ExpiryStatus }[];
  applications: Record<ApplicationStatus, number>;
  heatmap: { date: string; reviews: number; learning: number }[];
  learning: {
    levels: { level: CefrLevel; total: number; done: number; percent: number }[];
    streak: number;
    lastSelfTest: { score: number; total: number; takenAt: string } | null;
  };
}

export interface VaultStatus {
  vaultPath: string | null;
  wordCount: number;
  watching: boolean;
  lastSyncAt: string | null;
}

export type Grade = "hard" | "good" | "easy";

export type ExtractionStatus = "pending" | "done" | "failed" | "skipped";

export interface UploadedFileMeta {
  id: string;
  checklistItemId: string | null;
  syllabusItemId: string | null;
  studySourceId: string | null;
  kind: "document" | "cv_photo";
  originalName: string;
  mimeType: string;
  size: number;
  extractedText: string | null;
  extractionStatus: ExtractionStatus;
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
  theme: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  completedAt: string | null;
  files: UploadedFileMeta[];
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
  | { qid: string; type: "mcq"; level: CefrLevel; topic: string; prompt: string; choices: string[]; answerIndex: number }
  | { qid: string; type: "fill_blank"; level: CefrLevel; topic: string; prompt: string; accepted: string[] }
  | { qid: string; type: "true_false"; level: CefrLevel; topic: string; prompt: string; answer: boolean };

export interface TopicBreakdown {
  topic: string;
  level: CefrLevel;
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
  best: number | null;
  avg: number | null;
}

export interface Portal {
  id: string;
  label: string;
  url: string;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: "portal" | "application" | "document";
  title: string;
  detail: string;
  href: string;
}
