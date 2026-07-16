import type { ApplicationStatus } from "@prisma/client";

export type Columns = Partial<Record<ApplicationStatus, string[]>>;

export interface ColumnOrder {
  status: ApplicationStatus;
  ids: string[];
}

/**
 * Plans a kanban move: returns the new id order for every affected column
 * after moving `id` from `fromStatus` to position `toIndex` in `toStatus`.
 * Orders are plain contiguous indices (sortOrder = array index) — with tens
 * of applications there's no need for fractional ranks.
 */
export function planMove(
  columns: Columns,
  id: string,
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus,
  toIndex: number,
): ColumnOrder[] {
  const from = (columns[fromStatus] ?? []).filter((x) => x !== id);
  const to = fromStatus === toStatus ? from : [...(columns[toStatus] ?? [])].filter((x) => x !== id);
  const index = Math.max(0, Math.min(toIndex, to.length));
  to.splice(index, 0, id);

  if (fromStatus === toStatus) return [{ status: toStatus, ids: to }];
  return [
    { status: fromStatus, ids: from },
    { status: toStatus, ids: to },
  ];
}
