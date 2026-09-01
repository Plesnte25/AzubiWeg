// Legacy destination keys, still used by NotesPage/SelfTestsPage/
// ProgressPage/TaskDetailDrawer's onNavigate prop (Phase 13/14/16 of the
// Nocturne redesign move/reskin these; until then their bridge wrappers in
// pages/plan/ and Stats.tsx translate a Destination into a real route push).
export type Destination = "today" | "roadmap" | "syllabus" | "sources" | "notes" | "test" | "progress";
