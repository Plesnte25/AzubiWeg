/** Placeholder standing in for a grammar table (declension/conjugation)
 * kaikki.org has no coverage for, matching the visual shell every real
 * grammar card in this pane uses — so every word's detail pane keeps the
 * same fixed skeleton whether or not the data exists, per the user's
 * explicit request for this view (a deliberate, scoped exception to
 * CLAUDE.md's normal "hide missing data" convention). */
export function EmptyStateCard({ label, message }: { label: string; message: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "#1c1f2c", boxShadow: "0 0 0 1px rgba(233,233,237,.06)" }}>
      <div className="text-[10px] tracking-[.12em] uppercase" style={{ color: "#9184d9" }}>
        {label}
      </div>
      <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: "rgba(233,233,237,.4)" }}>
        {message}
      </div>
    </div>
  );
}
