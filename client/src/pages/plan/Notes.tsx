import { useNavStack } from "../../lib/navStack";
import type { Destination } from "../learning-hub/destinations";
import { NotesPage } from "../learning-hub/NotesPage";

/**
 * Real route (/plan/notes) wrapping the still-pre-Nocturne NotesPage as-is —
 * Phase 11 (Nocturne redesign) only retires the old ?view= shell in favor of
 * real routes; Phase 13 is where Notes itself gets reskinned + the FAB/
 * word-link wiring lands. onNavigate here only ever needs to reach Plan or
 * Sources (NotesPage's own cross-links), so a two-way path map is enough —
 * no destination it might send here (today/roadmap/syllabus/test/progress)
 * actually originates from this page.
 */
export default function Notes() {
  const { push } = useNavStack();
  const onNavigate = (d: Destination) => push(d === "sources" ? "/plan/sources" : "/plan");
  return <NotesPage onNavigate={onNavigate} />;
}
