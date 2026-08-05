export type Destination = "today" | "roadmap" | "syllabus" | "sources" | "test" | "progress";

export interface DestinationRow {
  key: Destination;
  label: string;
}

export const GROUPS: { label: string; rows: DestinationRow[] }[] = [
  {
    label: "Plan",
    rows: [
      { key: "today", label: "Today" },
      { key: "roadmap", label: "Roadmap" },
    ],
  },
  {
    label: "Learn",
    rows: [
      { key: "syllabus", label: "Syllabus" },
      { key: "sources", label: "Sources" },
    ],
  },
  {
    label: "Check",
    rows: [
      { key: "test", label: "Self-tests" },
      { key: "progress", label: "Progress" },
    ],
  },
];

/** Flat destination list — the sm/md pill-tab sub-nav's data source
 * (LearningRail itself is lg-only). */
export const DESTINATION_ROWS: DestinationRow[] = GROUPS.flatMap((g) => g.rows);
