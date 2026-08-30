import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Skeleton } from "../components/ui/Skeleton";
import { ActivationGate } from "./learning-hub/ActivationGate";
import { ProgressPage } from "./learning-hub/ProgressPage";

/**
 * Thin wrapper mounting the existing ProgressPage as its own top-level tab
 * (previously only reachable as Learning Hub's "progress" ?view=) —
 * Phase 16 does the real Stats rebuild against the handoff's design; this
 * just gets Stats a real, working /stats URL now that it's a first-class
 * nav destination. Replicates the same roadmap-activation gate the Learning
 * Hub shell applies to this same content, since ProgressPage's own data
 * assumes an activated roadmap.
 */
export default function Stats() {
  const navigate = useNavigate();
  const { data: status, isLoading } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!status?.activated) return <ActivationGate />;
  // Syllabus isn't a separate top-level route yet (Phase 11) — Plan is the
  // closest correct current destination for ProgressPage's one internal
  // cross-link ("Syllabus" link on a weak-skill row).
  return <ProgressPage onNavigate={() => navigate("/plan")} />;
}
