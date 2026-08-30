import { Navigate, useSearchParams } from "react-router-dom";
import LearningHub from "./learning-hub";

/**
 * Mounted at /plan. The existing Learning Hub shell defaults its internal
 * ?view= to "today" when none is given — fine for the old /learning route,
 * but confusing now that Today is its own separate top-level tab. Bare
 * /plan (no ?view=) redirects to the roadmap view instead, since that's
 * Plan's actual identity in the new nav; /plan?view=X for any other X still
 * deep-links exactly as before. Phase 11 replaces this whole shell with
 * real /plan, /plan/syllabus, /plan/sources, /plan/notes, /plan/self-tests
 * routes — this wrapper is scoped to Phase 6's nav-shell cutover only.
 */
export default function PlanEntry() {
  const [params] = useSearchParams();
  if (!params.get("view")) return <Navigate to="/plan?view=roadmap" replace />;
  return <LearningHub />;
}
