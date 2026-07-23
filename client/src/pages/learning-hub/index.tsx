import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Skeleton } from "../../components/ui/Skeleton";
import { ResourcesSection, SourcesSection, SyllabusSection } from "./contentSections";
import { ActivationCard, BacklogSection, CalendarSection, JournalSection, TodaySection } from "./progressSections";
import { GoetheReadinessSection, MonthlyReviewSection, TestsSection, WeeklyReviewSection } from "./reviewSections";

type Group = "content" | "progress" | "review";

const GROUPS: { key: Group; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "progress", label: "Progress" },
  { key: "review", label: "Review" },
];

const CONTENT_TABS = [
  { key: "syllabus", label: "Syllabus" },
  { key: "sources", label: "Study sources" },
  { key: "resources", label: "Resources" },
] as const;

const PROGRESS_TABS = [
  { key: "today", label: "Today" },
  { key: "calendar", label: "Calendar" },
  { key: "backlog", label: "Backlog" },
  { key: "journal", label: "Journal" },
] as const;

const REVIEW_TABS = [
  { key: "tests", label: "Self-tests" },
  { key: "weekly", label: "Weekly Review" },
  { key: "monthly", label: "Monthly Review" },
  { key: "readiness", label: "Goethe Readiness" },
] as const;

const TABS_BY_GROUP: Record<Group, readonly { key: string; label: string }[]> = {
  content: CONTENT_TABS,
  progress: PROGRESS_TABS,
  review: REVIEW_TABS,
};

// roadmap-data-backed review tabs need an activated roadmap; self-tests don't
const REVIEW_NEEDS_ROADMAP = new Set(["weekly", "monthly", "readiness"]);

export default function LearningHub() {
  const [params, setParams] = useSearchParams();
  const groupParam = params.get("group");
  const group: Group = GROUPS.some((g) => g.key === groupParam) ? (groupParam as Group) : "content";
  const tabParam = params.get("tab");
  const tabs = TABS_BY_GROUP[group];
  const tab = tabs.some((t) => t.key === tabParam) ? (tabParam as string) : tabs[0].key;

  const { data: status, isLoading: statusLoading } = useQuery({ queryKey: ["roadmap", "status"], queryFn: api.roadmapStatus });

  const setGroup = (g: Group) => setParams({ group: g, tab: TABS_BY_GROUP[g][0].key });
  const setTab = (t: string) => setParams({ group, tab: t });

  const needsActivation =
    !statusLoading &&
    !status?.activated &&
    (group === "progress" || (group === "review" && REVIEW_NEEDS_ROADMAP.has(tab)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Learning Hub</h1>
          <p className="text-sm text-ink-600">
            Your German syllabus, day-by-day roadmap, and reviews — all in one place.
          </p>
        </div>
        <SegmentedControl options={GROUPS} value={group} onChange={setGroup} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              tab === t.key
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-hairline text-ink-600 hover:bg-paper hover:text-ink-900"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {statusLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : needsActivation ? (
        <ActivationCard />
      ) : (
        <>
          {group === "content" && tab === "syllabus" && <SyllabusSection />}
          {group === "content" && tab === "sources" && <SourcesSection />}
          {group === "content" && tab === "resources" && <ResourcesSection />}

          {group === "progress" && tab === "today" && <TodaySection />}
          {group === "progress" && tab === "calendar" && <CalendarSection />}
          {group === "progress" && tab === "backlog" && <BacklogSection />}
          {group === "progress" && tab === "journal" && <JournalSection />}

          {group === "review" && tab === "tests" && <TestsSection />}
          {group === "review" && tab === "weekly" && <WeeklyReviewSection />}
          {group === "review" && tab === "monthly" && <MonthlyReviewSection />}
          {group === "review" && tab === "readiness" && <GoetheReadinessSection />}
        </>
      )}
    </div>
  );
}
