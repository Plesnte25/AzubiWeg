import type {
  ActivityFeedResponse,
  ActivitySummary,
  Application,
  ApplicationDetail,
  ApplicationStats,
  ApplicationStatus,
  Cv,
  CvCategory,
  DashboardData,
  ExamAttempt,
  ExamQuestionPublic,
  ExamStatus,
  Grade,
  GradePreview,
  CefrLevel,
  MovedTask,
  Note,
  NotebookLinkResult,
  NotesFeedResponse,
  PlaylistFetchOutcome,
  Portal,
  ProgressPeriod,
  ProgressResponse,
  QuizResultsResponse,
  GoetheReadiness,
  JobPreview,
  ReviewHistoryEntry,
  ReviewStats,
  RoadmapBacklogResponse,
  RoadmapCalendarDay,
  RoadmapDayDetail,
  RoadmapJournalTask,
  RoadmapMonthlyReview,
  RoadmapSkill,
  RoadmapStatus,
  DailyJournal,
  RoadmapTask,
  RoadmapTodayResponse,
  RoadmapWeeklyReview,
  RoadmapWeekResponse,
  RoutePace,
  SelfTestResult,
  SessionQuestion,
  StudySource,
  StudySourceType,
  StudySourceUnitLabel,
  SyllabusCategory,
  SyllabusItem,
  SyllabusResponse,
  SyllabusWorkspace,
  SyllabusMistakeCategory,
  SyllabusMistakeSummary,
  TopicBreakdown,
  UploadedFileMeta,
  User,
  VaultStatus,
  WeakWord,
  Themenfeld,
  Word,
  WordFamilyMember, NoteCategory } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401 && getToken()) {
    clearSession();
    window.location.href = "/login";
  }
}

async function throwApiError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setSession(token: string, user: User, isDemo = false) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  if (isDemo) localStorage.setItem("isDemo", "1");
  else localStorage.removeItem("isDemo");
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("isDemo");
}

// Set only via the demo-login fallback in RequireAuth (main.tsx) — drives
// DemoBanner so a visitor who lands on the public demo mid-window isn't
// confused into thinking they're in a private, logged-in account.
export function isDemoSession(): boolean {
  return localStorage.getItem("isDemo") === "1";
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
  handleUnauthorized(res);
  if (!res.ok) {
    await throwApiError(res);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  handleUnauthorized(res);
  if (!res.ok) {
    await throwApiError(res);
  }
  return res.blob();
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
  // 404s when the server isn't running in temporary public demo mode — see
  // RequireAuth in main.tsx, which is the only caller.
  demoLogin: () =>
    request<{ token: string; user: User; isDemo: true }>("/api/auth/demo-login", { method: "POST" }),
  syllabusAudio: (id: string) => requestBlob(`/api/learning/syllabus/${id}/audio`),

  // Faceting/search/grouping all happen client-side now (the shelves UI
  // needs the whole set in memory for cross-filtered facet counts anyway)
  // — this always fetches the full vault, no query params.
  words: () => request<{ words: Word[] }>("/api/words"),
  wordsMeta: () => request<{ lessons: { lesson: string; count: number }[] }>("/api/words/meta"),
  addWords: (words: string[], lesson?: string, classification?: { themenfeld?: Themenfeld[]; level?: CefrLevel }) =>
    request<{ words: Word[]; rejected: { word: string; reason: "loanword" | "not-german" }[] }>("/api/words", {
      method: "POST",
      body: JSON.stringify({ words, ...(lesson ? { lesson } : {}), ...classification }),
    }),
  updateWord: (
    id: string,
    data: Partial<
      Pick<Word, "meaning" | "ipa" | "grammar" | "example" | "lesson" | "themenfeld" | "level" | "leech" | "starred">
    >,
  ) => request<{ word: Word }>(`/api/words/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteWord: (id: string) => request<void>(`/api/words/${id}`, { method: "DELETE" }),
  reclassifyWords: () =>
    request<{ total: number; updated: number }>("/api/words/reclassify", { method: "POST" }),
  wordFamily: (id: string) => request<{ members: WordFamilyMember[] }>(`/api/words/${id}/family`),

  reviewQueue: () => request<{ due: Word[]; fresh: Word[] }>("/api/reviews/queue"),
  gradeWord: (wordId: string, grade: Grade) =>
    request<{ next: { due: string; interval: number; ease: number }; word: Word }>(`/api/reviews/${wordId}`, {
      method: "POST",
      body: JSON.stringify({ grade }),
    }),
  reviewPreview: (wordId: string) => request<GradePreview>(`/api/reviews/${wordId}/preview`),
  reviewHistory: (limit?: number) =>
    request<{ entries: ReviewHistoryEntry[] }>(`/api/reviews/history${limit ? `?limit=${limit}` : ""}`),
  reviewWeakWords: (limit?: number) =>
    request<{ words: WeakWord[] }>(`/api/reviews/weak-words${limit ? `?limit=${limit}` : ""}`),
  reviewStats: () => request<ReviewStats>("/api/reviews/stats"),

  dashboard: () => request<DashboardData>("/api/dashboard"),

  vaultStatus: () => request<VaultStatus>("/api/vault/status"),
  vaultLink: (path: string) =>
    request<{ vaultPath: string; wordCount: number }>("/api/vault/link", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  vaultUnlink: () => request<{ ok: boolean }>("/api/vault/unlink", { method: "POST" }),
  vaultSyncNow: () => request<{ wordCount: number }>("/api/vault/sync", { method: "POST" }),

  deleteFile: (id: string) => request<void>(`/api/files/${id}`, { method: "DELETE" }),

  cvs: () => request<{ cvs: Cv[] }>("/api/cvs"),
  cv: (id: string) => request<{ cv: Cv }>(`/api/cvs/${id}`),
  addCv: (data: { title: string; category: CvCategory; fileId: string }) =>
    request<{ cv: Cv }>("/api/cvs", { method: "POST", body: JSON.stringify(data) }),
  updateCv: (id: string, data: Partial<{ title: string; category: CvCategory }>) =>
    request<{ cv: Cv }>(`/api/cvs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCv: (id: string) => request<void>(`/api/cvs/${id}`, { method: "DELETE" }),

  applications: () => request<{ applications: Application[] }>("/api/applications"),
  applicationStats: () => request<{ stats: ApplicationStats }>("/api/applications/stats"),
  application: (id: string) => request<{ application: ApplicationDetail }>(`/api/applications/${id}`),
  fetchJobPreview: (url: string) =>
    request<{ fetched: boolean; data: JobPreview | null }>("/api/applications/fetch-preview", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  addApplication: (data: Partial<Application> & { company: string; role: string }) =>
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

  learningSyllabus: () => request<SyllabusResponse>("/api/learning/syllabus"),
  syllabusWorkspace: (id: string) => request<SyllabusWorkspace>(`/api/learning/syllabus/${id}/workspace`),
  submitSyllabusExercise: (
    id: string,
    answer: string,
    mistakeCategory?: SyllabusMistakeCategory | null,
    rubricAssessment?: { taskFulfilled: boolean; grammarChecked: boolean; understandable: boolean } | null,
  ) =>
    request<{ passed: boolean; feedback: string; attempt: import("./types").ExerciseAttempt }>(`/api/learning/syllabus/${id}/exercise`, {
      method: "POST",
      body: JSON.stringify({ answer, mistakeCategory, rubricAssessment }),
    }),
  syllabusMistakes: () => request<{ mistakes: SyllabusMistakeSummary[] }>("/api/learning/syllabus/mistakes"),
  learningPace: () => request<RoutePace>("/api/learning/pace"),
  toggleSyllabusItem: (id: string, completed: boolean) =>
    request<{ item: SyllabusItem }>(`/api/learning/syllabus/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
  updateSyllabusNotebook: (
    id: string,
    data: Partial<{ examples: string | null; exceptions: string | null; commonMistakes: string | null }>,
  ) =>
    request<{ item: SyllabusItem }>(`/api/learning/syllabus/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  setStationSkipped: (level: CefrLevel, theme: string, skipped: boolean) =>
    request<{ updated: number }>("/api/learning/syllabus/station", {
      method: "PATCH",
      body: JSON.stringify({ level, theme, skipped }),
    }),
  addSyllabusItem: (data: {
    level: CefrLevel;
    category: SyllabusCategory;
    theme: string;
    title: string;
    description?: string | null;
    afterTheme?: string | null;
  }) => request<{ item: SyllabusItem }>("/api/learning/syllabus/item", { method: "POST", body: JSON.stringify(data) }),
  deleteSyllabusItem: (id: string) => request<void>(`/api/learning/syllabus/${id}`, { method: "DELETE" }),
  replanRoute: (level: CefrLevel) =>
    request<{ moved: number; studyDays: number }>("/api/learning/syllabus/replan", { method: "POST", body: JSON.stringify({ level }) }),

  learningSources: () => request<{ sources: StudySource[] }>("/api/learning/sources"),
  addStudySource: (data: {
    type: StudySourceType;
    title: string;
    url?: string | null;
    provider?: string | null;
    level?: CefrLevel | null;
    totalUnits?: number | null;
    completedUnits?: number;
    unitLabel?: StudySourceUnitLabel;
    notes?: string | null;
    autoFetch?: boolean;
    stationKey?: string | null;
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
      provider: string | null;
      level: CefrLevel | null;
      totalUnits: number | null;
      completedUnits: number;
      unitLabel: StudySourceUnitLabel;
      notes: string | null;
      // set via the two-step flow: upload (kind: "source_cover") then PATCH
      // with the new file's id; null clears the cover
      coverFileId: string | null;
      stationKey: string | null;
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
  sourcesActivity: (opts: { cursor?: string } = {}) =>
    request<ActivityFeedResponse>(
      `/api/learning/sources/activity${opts.cursor ? `?${new URLSearchParams({ cursor: opts.cursor })}` : ""}`,
    ),

  /** checkpointIndex (1–3): a mixed test scoped to that checkpoint's stations at `level`. */
  startSelfTest: (opts: { size?: number; checkpointIndex?: number; level?: CefrLevel } = {}) =>
    request<{ questions: SessionQuestion[]; level: CefrLevel; checkpoint?: { index: number; stations: string[]; scopedQuestions: number } }>("/api/learning/quiz", {
      method: "POST",
      body: JSON.stringify(opts),
    }),
  quizResults: () => request<QuizResultsResponse>("/api/learning/quiz/results"),
  genderDrill: (opts: { size?: number; wordId?: string; shakyOnly?: boolean } = {}) =>
    request<{ words: { wordId: string; headword: string; meaning: string | null; article: "der" | "die" | "das" }[] }>("/api/learning/quiz/gender-drill", {
      method: "POST",
      body: JSON.stringify(opts),
    }),
  listenType: (size = 8) =>
    request<{ words: { wordId: string; headword: string; meaning: string | null; audioUrl: string }[] }>("/api/learning/quiz/listen-type", {
      method: "POST",
      body: JSON.stringify({ size }),
    }),

  examStatus: () => request<ExamStatus>("/api/learning/exam/status"),
  /** mode "mock": practice run with no 7-day lock that never counts as a pass. */
  startExam: (mode: "real" | "mock" = "real") =>
    request<{ attemptId: string; level: CefrLevel; mode: "real" | "mock"; questions: ExamQuestionPublic[]; timeLimitMinutes: number }>(
      "/api/learning/exam/start",
      { method: "POST", body: JSON.stringify({ mode }) },
    ),
  submitExam: (attemptId: string, answers: { qid: string; answer: string | number | boolean }[]) =>
    request<{ attempt: ExamAttempt; wouldHavePassed: boolean }>(`/api/learning/exam/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  submitQuizResult: (data: {
    score: number;
    total: number;
    kind: "mixed" | "checkpoint" | "gender_drill" | "listen_type";
    level?: CefrLevel | null;
    checkpointIndex?: number | null;
    questionIds?: string[];
    breakdown?: TopicBreakdown[];
    typeBreakdown?: { type: "mcq" | "fill_blank" | "true_false"; correct: number; total: number }[];
    answers?: { wordId: string; article: "der" | "die" | "das"; picked: "der" | "die" | "das" }[];
  }) =>
    request<{ result: SelfTestResult; flaggedShaky?: number }>("/api/learning/quiz/results", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addToNotebook: (data: {
    level: CefrLevel;
    topic: string;
    questionPrompt: string;
    explanation?: string | null;
    theme?: string | null;
  }) => request<NotebookLinkResult>("/api/learning/quiz/notebook", { method: "POST", body: JSON.stringify(data) }),

  roadmapStatus: () => request<RoadmapStatus>("/api/learning/roadmap/status"),
  updateStudyCapacity: (minutes: 5 | 20 | 45 | 90 | 180 | 330) =>
    request<{ studyCapacityMinutes: number }>("/api/learning/roadmap/capacity", {
      method: "PATCH",
      body: JSON.stringify({ minutes }),
    }),
  dailyJournal: (date: string) => request<{ journal: DailyJournal | null }>(`/api/learning/roadmap/journal/day/${date}`),
  saveDailyJournal: (date: string, data: Pick<DailyJournal, "learned" | "difficult" | "nextStep">) =>
    request<{ journal: DailyJournal }>(`/api/learning/roadmap/journal/day/${date}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  activateRoadmap: (startDate?: string) =>
    request<{ startedAt: string }>("/api/learning/roadmap/activate", {
      method: "POST",
      body: JSON.stringify(startDate ? { startDate } : {}),
    }),
  resetRoadmap: () => request<{ reset: boolean }>("/api/learning/roadmap/reset", { method: "POST" }),
  roadmapToday: () => request<RoadmapTodayResponse>("/api/learning/roadmap/today"),
  roadmapBacklog: () => request<RoadmapBacklogResponse>("/api/learning/roadmap/backlog"),
  roadmapDay: (date: string) => request<{ day: RoadmapDayDetail }>(`/api/learning/roadmap/day/${date}`),
  roadmapTask: (id: string) => request<{ task: RoadmapTask }>(`/api/learning/roadmap/tasks/${id}`),
  roadmapCalendar: (month: string) =>
    request<{ days: RoadmapCalendarDay[] }>(`/api/learning/roadmap/calendar?month=${month}`),
  roadmapWeek: (week?: number) =>
    request<RoadmapWeekResponse>(`/api/learning/roadmap/week${week ? `?week=${week}` : ""}`),
  updateRoadmapTask: (
    id: string,
    data: Partial<{
      completed: boolean;
      dropped: boolean;
      journalEntry: string | null;
      minutesSpent: number | null;
      dayOffset: number;
      timerAction: "start" | "pause" | "reset";
      setSeconds: number;
    }>,
  ) =>
    request<{ task: RoadmapTask }>(`/api/learning/roadmap/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  toggleRoadmapTask: (id: string, completed: boolean) =>
    request<{ task: RoadmapTask }>(`/api/learning/roadmap/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
  rescheduleRoadmapTask: (id: string, dayOffset: number) =>
    request<{ task: RoadmapTask }>(`/api/learning/roadmap/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ dayOffset }),
    }),
  addRoadmapTask: (data: { date: string; title: string; description?: string | null; skill?: RoadmapSkill | null }) =>
    request<{ task: RoadmapTask }>("/api/learning/roadmap/tasks", { method: "POST", body: JSON.stringify(data) }),
  pullBacklogIntoToday: () =>
    request<{ moved: MovedTask[] }>("/api/learning/roadmap/backlog/pull-into-today", { method: "POST" }),
  spreadBacklog: () =>
    request<{ moved: MovedTask[]; overDays: number }>("/api/learning/roadmap/backlog/spread", { method: "POST" }),
  pullTasksForward: (count = 3) =>
    request<{ moved: MovedTask[] }>("/api/learning/roadmap/pull-forward", { method: "POST", body: JSON.stringify({ count }) }),
  roadmapJournal: (skill: RoadmapSkill) =>
    request<{ tasks: RoadmapJournalTask[] }>(`/api/learning/roadmap/journal/${skill}`),

  notesFeed: (q?: string) => request<NotesFeedResponse>(`/api/notes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  taskNotes: (roadmapTaskId: string) => request<{ notes: Note[] }>(`/api/notes?roadmapTaskId=${roadmapTaskId}`),
  wordNotes: (wordId: string) => request<{ notes: Note[] }>(`/api/notes?wordId=${wordId}`),
  syllabusItemNotes: (syllabusItemId: string) => request<{ notes: Note[] }>(`/api/notes?syllabusItemId=${syllabusItemId}`),
  syllabusStationNotes: (level: CefrLevel, theme: string) =>
    request<{ notes: Note[] }>(`/api/learning/syllabus/stations/${level}/${encodeURIComponent(theme)}/notes`),
  createNote: (data: {
    title?: string | null;
    body?: string | null;
    skill?: RoadmapSkill | null;
    syllabusItemId?: string | null;
    roadmapTaskId?: string | null;
    wordId?: string | null;
    contextTag?: string | null;
    category?: NoteCategory;
    pinned?: boolean;
    applicationId?: string | null;
    stationKey?: string | null;
  }) => request<{ note: Note }>("/api/notes", { method: "POST", body: JSON.stringify(data) }),
  stationNotes: (stationKey: string) =>
    request<{ notes: Note[] }>(`/api/notes?stationKey=${encodeURIComponent(stationKey)}`),
  updateNote: (
    id: string,
    data: Partial<{
      title: string | null;
      body: string | null;
      skill: RoadmapSkill | null;
      syllabusItemId: string | null;
      roadmapTaskId: string | null;
      wordId: string | null;
      contextTag: string | null;
    }>,
  ) => request<{ note: Note }>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteNote: (id: string) => request<void>(`/api/notes/${id}`, { method: "DELETE" }),
  roadmapWeeklyReview: (date?: string) =>
    request<RoadmapWeeklyReview>(`/api/learning/roadmap/review/week${date ? `?date=${date}` : ""}`),
  roadmapMonthlyReview: (month: string) =>
    request<RoadmapMonthlyReview>(`/api/learning/roadmap/review/month?month=${month}`),
  goetheReadiness: () => request<GoetheReadiness>("/api/learning/roadmap/readiness"),
  setExamTarget: (examTargetDate: string | null) =>
    request<{ examTargetDate: string | null }>("/api/learning/roadmap/exam-target", {
      method: "PATCH",
      body: JSON.stringify({ examTargetDate }),
    }),
  learningProgress: (period: ProgressPeriod = "30d") =>
    request<ProgressResponse>(`/api/learning/roadmap/progress?period=${period}`),

  portals: () => request<{ portals: Portal[] }>("/api/portals"),
  addPortal: (data: { label: string; url: string }) =>
    request<{ portal: Portal }>("/api/portals", { method: "POST", body: JSON.stringify(data) }),
  markPortalChecked: (id: string) =>
    request<{ portal: Portal }>(`/api/portals/${id}/checked`, { method: "POST" }),
  deletePortal: (id: string) => request<void>(`/api/portals/${id}`, { method: "DELETE" }),

  activityPing: (learning: boolean) =>
    request<void>("/api/activity/ping", { method: "POST", body: JSON.stringify({ learning }) }),
  activitySummary: (days?: number) =>
    request<ActivitySummary>(`/api/activity/summary${days ? `?days=${days}` : ""}`),
};

/**
 * Uploads a file as multipart form data. Separate from request() because the
 * shared wrapper hardcodes a JSON content type — here the browser must set
 * the multipart boundary itself.
 */
export async function uploadFile(
  file: File,
  opts: {
    kind: "document" | "cv_photo" | "audio_recording" | "source_cover";
    syllabusItemId?: string;
    studySourceId?: string;
    roadmapTaskId?: string;
    noteId?: string;
  },
): Promise<UploadedFileMeta> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  form.append("kind", opts.kind);
  if (opts.syllabusItemId) form.append("syllabusItemId", opts.syllabusItemId);
  if (opts.studySourceId) form.append("studySourceId", opts.studySourceId);
  if (opts.roadmapTaskId) form.append("roadmapTaskId", opts.roadmapTaskId);
  if (opts.noteId) form.append("noteId", opts.noteId);
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
/** Plays a word's recording; words without one fall back to the server's cached Edge TTS of the headword. */
export async function playWordAudio(wordId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`/api/words/${wordId}/audio?fallback=tts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Audio not available");
  const url = URL.createObjectURL(await res.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  await audio.play();
}
