// Legacy destination keys, still used by TaskDetailDrawer's onNavigate
// prop — Plan.tsx and plan/Notes.tsx translate the "sources"/"test" (and,
// for generic syllabus-linked tasks, "syllabus") cases their own
// TaskDetailDrawer instances can emit into a real route push. "today"/
// "roadmap"/"notes"/"progress" are unused leftovers from screens that have
// since moved to real routes with their own navigation.
export type Destination = "today" | "roadmap" | "syllabus" | "sources" | "notes" | "test" | "progress";
