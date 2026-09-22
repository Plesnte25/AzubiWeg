/** Placeholder standing in for a grammar table (declension/conjugation)
 * kaikki.org has no coverage for, matching the visual shell every real
 * grammar card in this pane uses — so every word's detail pane keeps the
 * same fixed skeleton whether or not the data exists, per the user's
 * explicit request for this view (a deliberate, scoped exception to
 * CLAUDE.md's normal "hide missing data" convention). */
export function EmptyStateCard({ label, message }: { label: string; message: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--color-card)", boxShadow: "0 0 0 1px var(--color-hairline-soft)" }}>
      <div className="text-micro tracking-[.12em] uppercase" style={{ color: "var(--color-brand-500)" }}>
        {label}
      </div>
      <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: "var(--color-ink-600)" }}>
        {message}
      </div>
    </div>
  );
}
