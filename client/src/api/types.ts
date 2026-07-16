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
