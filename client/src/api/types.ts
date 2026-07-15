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
