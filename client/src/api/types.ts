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
}

export interface VaultStatus {
  vaultPath: string | null;
  wordCount: number;
  watching: boolean;
  lastSyncAt: string | null;
}

export type Grade = "hard" | "good" | "easy";

export interface UploadedFileMeta {
  id: string;
  checklistItemId: string | null;
  kind: "document" | "cv_photo";
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
