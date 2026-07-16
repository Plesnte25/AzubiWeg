import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistStatus,
  DashboardData,
  Grade,
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
};

/**
 * Uploads a file as multipart form data. Separate from request() because the
 * shared wrapper hardcodes a JSON content type — here the browser must set
 * the multipart boundary itself.
 */
export async function uploadFile(
  file: File,
  opts: { kind: "document" | "cv_photo"; checklistItemId?: string },
): Promise<UploadedFileMeta> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  form.append("kind", opts.kind);
  if (opts.checklistItemId) form.append("checklistItemId", opts.checklistItemId);
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
