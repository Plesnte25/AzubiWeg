import type {
  AppNotification,
  Application,
  ApplicationDetail,
  ApplicationStats,
  ApplicationStatus,
  ChecklistCategory,
  Cv,
  CvContent,
  CvSummary,
  CvTemplate,
  ChecklistItem,
  ChecklistStatus,
  DashboardData,
  Grade,
  CefrLevel,
  LevelProgress,
  PlaylistFetchOutcome,
  Portal,
  QuizResultsResponse,
  SelfTestResult,
  SessionQuestion,
  StudySource,
  StudySourceType,
  SyllabusItem,
  TopicBreakdown,
  UploadedFileMeta,
  User,
  VaultStatus,
  Word,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setSession(token: string, user: User) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser(): User | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401 && getToken()) {
    clearSession();
    window.location.href = "/login";
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  words: (params: { search?: string; lesson?: string; due?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.lesson) q.set("lesson", params.lesson);
    if (params.due) q.set("due", "true");
    return request<{ words: Word[] }>(`/api/words?${q}`);
  },
  wordsMeta: () => request<{ lessons: { lesson: string; count: number }[] }>("/api/words/meta"),
  addWords: (words: string[], lesson?: string) =>
    request<{ words: Word[] }>("/api/words", {
      method: "POST",
      body: JSON.stringify({ words, ...(lesson ? { lesson } : {}) }),
    }),
  updateWord: (id: string, data: Partial<Pick<Word, "meaning" | "ipa" | "grammar" | "example" | "lesson">>) =>
    request<{ word: Word }>(`/api/words/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWord: (id: string) => request<void>(`/api/words/${id}`, { method: "DELETE" }),

  reviewQueue: () => request<{ due: Word[]; fresh: Word[] }>("/api/reviews/queue"),
  gradeWord: (wordId: string, grade: Grade) =>
    request<{ next: { due: string; interval: number; ease: number }; word: Word }>(
      `/api/reviews/${wordId}`,
      { method: "POST", body: JSON.stringify({ grade }) },
    ),

  dashboard: () => request<DashboardData>("/api/dashboard"),

  vaultStatus: () => request<VaultStatus>("/api/vault/status"),
  vaultLink: (path: string) =>
    request<{ vaultPath: string; wordCount: number }>("/api/vault/link", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  vaultUnlink: () => request<{ ok: boolean }>("/api/vault/unlink", { method: "POST" }),
  vaultSyncNow: () => request<{ wordCount: number }>("/api/vault/sync", { method: "POST" }),

  checklist: () => request<{ items: ChecklistItem[] }>("/api/checklist"),
  addChecklistItem: (data: {
    title: string;
    description?: string;
    category: ChecklistCategory;
    expiresAt?: string | null;
  }) => request<{ item: ChecklistItem }>("/api/checklist", { method: "POST", body: JSON.stringify(data) }),
  updateChecklistItem: (
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      category: ChecklistCategory;
      status: ChecklistStatus;
      expiresAt: string | null;
    }>,
  ) => request<{ item: ChecklistItem }>(`/api/checklist/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChecklistItem: (id: string) => request<void>(`/api/checklist/${id}`, { method: "DELETE" }),
  deleteFile: (id: string) => request<void>(`/api/files/${id}`, { method: "DELETE" }),

  cvs: () => request<{ cvs: CvSummary[] }>("/api/cvs"),
  cv: (id: string) => request<{ cv: Cv }>(`/api/cvs/${id}`),
  addCv: (data: { title: string; template: CvTemplate }) =>
    request<{ cv: Cv }>("/api/cvs", { method: "POST", body: JSON.stringify(data) }),
  updateCv: (
    id: string,
    data: Partial<{ title: string; template: CvTemplate; content: CvContent; photoFileId: string | null }>,
  ) => request<{ cv: Cv }>(`/api/cvs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  duplicateCv: (id: string) => request<{ cv: Cv }>(`/api/cvs/${id}/duplicate`, { method: "POST" }),
  deleteCv: (id: string) => request<void>(`/api/cvs/${id}`, { method: "DELETE" }),

  applications: () => request<{ applications: Application[] }>("/api/applications"),
  applicationStats: () => request<{ stats: ApplicationStats }>("/api/applications/stats"),
  application: (id: string) => request<{ application: ApplicationDetail }>(`/api/applications/${id}`),
  addApplication: (data: Partial<Application> & { company: string; position: string }) =>
    request<{ application: Application }>("/api/applications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateApplication: (id: string, data: Partial<Omit<Application, "id" | "cv" | "_count">>) =>
    request<{ application: Application }>(`/api/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  moveApplication: (id: string, status: ApplicationStatus, index: number) =>
    request<{ applications: Application[] }>(`/api/applications/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify({ status, index }),
    }),
  deleteApplication: (id: string) => request<void>(`/api/applications/${id}`, { method: "DELETE" }),
  addApplicationEvent: (
    id: string,
    data: { type: "note" | "interview" | "follow_up"; note?: string },
  ) =>
    request<{ event: ApplicationDetail["events"][number] }>(`/api/applications/${id}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteApplicationEvent: (id: string, eventId: string) =>
    request<void>(`/api/applications/${id}/events/${eventId}`, { method: "DELETE" }),

  learningSyllabus: () =>
    request<{ levels: LevelProgress[]; items: SyllabusItem[] }>("/api/learning/syllabus"),
  toggleSyllabusItem: (id: string, completed: boolean) =>
    request<{ item: SyllabusItem }>(`/api/learning/syllabus/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
  learningSources: () => request<{ sources: StudySource[] }>("/api/learning/sources"),
  addStudySource: (data: {
    type: StudySourceType;
    title: string;
    url?: string | null;
    level?: CefrLevel | null;
    totalUnits?: number | null;
    completedUnits?: number;
    notes?: string | null;
    autoFetch?: boolean;
  }) =>
    request<{ source: StudySource; fetch: PlaylistFetchOutcome }>("/api/learning/sources", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  toggleSourceUnit: (sourceId: string, unitId: string, done: boolean) =>
    request<{ source: StudySource }>(`/api/learning/sources/${sourceId}/units/${unitId}`, {
      method: "PATCH",
      body: JSON.stringify({ done }),
    }),
  updateUnitNotes: (sourceId: string, unitId: string, notes: string | null) =>
    request<{ source: StudySource }>(`/api/learning/sources/${sourceId}/units/${unitId}`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    }),
  updateStudySource: (
    id: string,
    data: Partial<{
      type: StudySourceType;
      title: string;
      url: string | null;
      level: CefrLevel | null;
      totalUnits: number | null;
      completedUnits: number;
      notes: string | null;
    }>,
  ) =>
    request<{ source: StudySource }>(`/api/learning/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  logSourceProgress: (id: string, delta = 1) =>
    request<{ source: StudySource }>(`/api/learning/sources/${id}/progress`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    }),
  deleteStudySource: (id: string) =>
    request<void>(`/api/learning/sources/${id}`, { method: "DELETE" }),
  startSelfTest: (opts: { size?: number } = {}) =>
    request<{ questions: SessionQuestion[]; level: CefrLevel }>("/api/learning/quiz", {
      method: "POST",
      body: JSON.stringify(opts),
    }),
  quizResults: () => request<QuizResultsResponse>("/api/learning/quiz/results"),
  submitQuizResult: (data: {
    score: number;
    total: number;
    kind: "mixed";
    level?: CefrLevel | null;
    questionIds?: string[];
    breakdown?: TopicBreakdown[];
  }) =>
    request<{ result: SelfTestResult }>("/api/learning/quiz/results", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  portals: () => request<{ portals: Portal[] }>("/api/portals"),
  addPortal: (data: { label: string; url: string }) =>
    request<{ portal: Portal }>("/api/portals", { method: "POST", body: JSON.stringify(data) }),
  markPortalChecked: (id: string) =>
    request<{ portal: Portal }>(`/api/portals/${id}/checked`, { method: "POST" }),
  deletePortal: (id: string) => request<void>(`/api/portals/${id}`, { method: "DELETE" }),

  notifications: () => request<{ notifications: AppNotification[] }>("/api/notifications"),
};

/**
 * Uploads a file as multipart form data. Separate from request() because the
 * shared wrapper hardcodes a JSON content type — here the browser must set
 * the multipart boundary itself.
 */
export async function uploadFile(
  file: File,
  opts: {
    kind: "document" | "cv_photo";
    checklistItemId?: string;
    syllabusItemId?: string;
    studySourceId?: string;
  },
): Promise<UploadedFileMeta> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  form.append("kind", opts.kind);
  if (opts.checklistItemId) form.append("checklistItemId", opts.checklistItemId);
  if (opts.syllabusItemId) form.append("syllabusItemId", opts.syllabusItemId);
  if (opts.studySourceId) form.append("studySourceId", opts.studySourceId);
  const res = await fetch("/api/files", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (res.status === 401 && getToken()) {
    clearSession();
    window.location.href = "/login";
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `Upload failed (${res.status})`);
  }
  return ((await res.json()) as { file: UploadedFileMeta }).file;
}

/** Fetches a stored file with auth and returns an object URL (caller revokes). */
export async function fetchFileBlobUrl(fileId: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`/api/files/${fileId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "File not available");
  return URL.createObjectURL(await res.blob());
}

/** Downloads a stored file via a temporary anchor element. */
export async function downloadFile(fileId: string, name: string): Promise<void> {
  const url = await fetchFileBlobUrl(fileId);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Fetches word audio with auth and plays it (audio tags can't send headers). */
export async function playWordAudio(wordId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`/api/words/${wordId}/audio`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Audio not available");
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  await audio.play();
}
